const dns = require('node:dns').promises;
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const ipaddr = require('ipaddr.js');
const axios = require('axios');
const cheerio = require('cheerio');
const robotsParser = require('robots-parser');
const retryWithBackoff = require('./retryWithBackoff');
const { extractJsonLd } = require('./jsonLd.service');
const { extractRss } = require('./rss.service');
const { extractApiItems } = require('./api.service');

const USER_AGENT = 'ConfigurableWebDataCollector/1.0';
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const MAX_API_BYTES = 10 * 1024 * 1024;
const MIN_HOST_DELAY_MS = 2000;
const lastRequestAt = new Map();
const hostQueues = new Map();

function isPublicAddress(address) {
  try {
    return ipaddr.parse(address).range() === 'unicast';
  } catch {
    return false;
  }
}

function createPinnedAgents(hostname, addresses) {
  const lookup = (requestedHost, options, callback) => {
    if (requestedHost.toLowerCase() !== hostname.toLowerCase()) {
      callback(new Error('Unexpected destination host'));
      return;
    }

    const requestedFamily = options && options.family;
    const candidates = requestedFamily
      ? addresses.filter((address) => address.family === requestedFamily)
      : addresses;

    if (candidates.length === 0) {
      callback(new Error('No public address available for destination'));
      return;
    }

    if (options && options.all) {
      callback(null, candidates);
      return;
    }

    callback(null, candidates[0].address, candidates[0].family);
  };

  return {
    httpAgent: new http.Agent({ lookup, family: addresses[0].family }),
    httpsAgent: new https.Agent({ lookup, family: addresses[0].family }),
  };
}

function getStatusError(status, message) {
  const error = new Error(message);
  error.statusCode = status;
  return error;
}

async function requestWithHostDelay(
  url,
  agents,
  minimumDelayMs,
  maxContentLength = MAX_PAGE_BYTES,
) {
  const hostname = new URL(url).hostname.toLowerCase();
  const previous = hostQueues.get(hostname) || Promise.resolve();
  const request = previous.catch(() => {}).then(async () => {
    return retryWithBackoff(
      async () => {
        const elapsed = Date.now() - (lastRequestAt.get(hostname) || 0);
        const waitMs = Math.max(0, minimumDelayMs - elapsed);
        if (waitMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        try {
          return await axios.get(url, {
            ...agents,
            headers: { 'User-Agent': USER_AGENT },
            maxContentLength,
            maxRedirects: 0,
            proxy: false,
            responseType: 'text',
            timeout: 10000,
            transformResponse: [(body) => body],
            validateStatus: (status) => status === 200 || status === 404,
          });
        } finally {
          lastRequestAt.set(hostname, Date.now());
        }
      },
      {
        maxAttempts: 3,
        baseDelayMs: 500,
        shouldRetry: (error) => {
          if (error.response) {
            return [429, 500, 502, 503, 504].includes(error.response.status);
          }

          return [
            'ECONNABORTED',
            'ECONNRESET',
            'EAI_AGAIN',
            'ERR_NETWORK',
            'ETIMEDOUT',
          ].includes(error.code);
        },
      },
    );
  });

  hostQueues.set(hostname, request.then(() => undefined, () => undefined));
  return request;
}

async function getPublicAddresses(hostname) {
  const unwrappedHostname = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(unwrappedHostname)) {
    if (!isPublicAddress(unwrappedHostname)) {
      throw getStatusError(400, 'Source host must resolve to a public address');
    }
    return [{ address: unwrappedHostname, family: net.isIP(unwrappedHostname) }];
  }

  let addresses;
  try {
    addresses = await dns.lookup(unwrappedHostname, { all: true, verbatim: true });
  } catch {
    throw getStatusError(400, 'Source hostname could not be resolved');
  }

  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw getStatusError(400, 'Source host must resolve only to public addresses');
  }

  return addresses;
}

async function previewSelector(sourceInput, options = {}) {
  const resultLimit = options.limit === undefined ? 5 : options.limit;
  const pageUrl = new URL(sourceInput.url);
  const addresses = await getPublicAddresses(pageUrl.hostname);
  const agents = createPinnedAgents(
    pageUrl.hostname.replace(/^\[|\]$/g, ''),
    addresses,
  );
  try {
    const robotsUrl = new URL('/robots.txt', pageUrl).toString();
    let robotsResponse;
    try {
      robotsResponse = await requestWithHostDelay(
        robotsUrl,
        agents,
        MIN_HOST_DELAY_MS,
      );
    } catch (error) {
      const statusError = getStatusError(502, 'Could not safely retrieve robots.txt');
      statusError.cause = error;
      throw statusError;
    }

    if (robotsResponse.status !== 200 && robotsResponse.status !== 404) {
      throw getStatusError(502, 'Could not safely retrieve robots.txt');
    }

    const robots = robotsParser(
      robotsUrl,
      robotsResponse.status === 404 ? '' : robotsResponse.data,
    );
    if (robots.isAllowed(pageUrl.toString(), USER_AGENT) === false) {
      throw getStatusError(403, 'Robots policy does not allow this page to be fetched');
    }

    const crawlDelay = robots.getCrawlDelay(USER_AGENT) || 0;
    let pageResponse;
    try {
      pageResponse = await requestWithHostDelay(
        pageUrl.toString(),
        agents,
        Math.max(MIN_HOST_DELAY_MS, crawlDelay * 1000),
        sourceInput.extractionRules.mode === 'api'
          ? MAX_API_BYTES
          : MAX_PAGE_BYTES,
      );
    } catch (error) {
      const statusError = getStatusError(502, 'Could not retrieve the source page safely');
      statusError.cause = error;
      throw statusError;
    }

    if (pageResponse.status !== 200) {
      throw getStatusError(502, 'Source page returned an unavailable response');
    }

    let $;
    let results;
    try {
      $ = cheerio.load(
        pageResponse.data,
        sourceInput.extractionRules.mode === 'rss' ? { xmlMode: true } : undefined,
      );
      if (sourceInput.extractionRules.mode === 'api') {
        const payload = JSON.parse(pageResponse.data);
        results = extractApiItems(
          payload,
          sourceInput.extractionRules.collectionPath,
          sourceInput.extractionRules.fields,
        );
        if (resultLimit > 0) {
          results = results.slice(0, resultLimit);
        }
      } else if (sourceInput.extractionRules.mode === 'rss') {
        results = extractRss($);
        if (resultLimit > 0) {
          results = results.slice(0, resultLimit);
        }
      } else if (sourceInput.extractionRules.mode === 'jsonld') {
        results = extractJsonLd(
          $,
          sourceInput.extractionRules.fields,
          sourceInput.extractionRules.jsonLdType,
        );
        if (resultLimit > 0) {
          results = results.slice(0, resultLimit);
        }
      } else {
        $(sourceInput.extractionRules.itemSelector);
        sourceInput.extractionRules.fields.forEach((field) => $(field.selector));
        const selectedItems = resultLimit > 0
          ? $(sourceInput.extractionRules.itemSelector).slice(0, resultLimit)
          : $(sourceInput.extractionRules.itemSelector);
        results = selectedItems
          .map((_, item) => {
            const record = {};
            const itemElement = $(item);

            for (const field of sourceInput.extractionRules.fields) {
              const selected = itemElement.is(field.selector)
                ? itemElement
                : itemElement.find(field.selector).first();
              record[field.name.trim()] = field.attribute && field.attribute !== 'text'
                ? selected.attr(field.attribute) || ''
                : selected.text().trim();
            }

            return record;
          })
          .get();
      }
    } catch {
      throw getStatusError(400, 'One or more CSS selectors are invalid');
    }

    return { count: results.length, results };
  } finally {
    agents.httpAgent.destroy();
    agents.httpsAgent.destroy();
  }
}

module.exports = { previewSelector };
