const ipaddr = require('ipaddr.js');
const cron = require('node-cron');

function isPrivateIp(address) {
  return ipaddr.isValid(address) && ipaddr.parse(address).range() !== 'unicast';
}

function validateSourceInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return 'Source data must be an object';
  }

  if (
    Object.keys(input)
      .some((key) => ![
        'name',
        'url',
        'category',
        'schedule',
        'enabled',
        'extractionRules',
      ].includes(key))
  ) {
    return 'Source data contains unsupported fields';
  }

  const {
    name,
    url,
    category = 'placement',
    schedule,
    enabled,
    extractionRules,
  } = input;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    return 'Name must be a non-empty string of at most 120 characters';
  }

  if (typeof url !== 'string' || url.length > 2048) {
    return 'URL must be a string of at most 2048 characters';
  }

  if (!['placement', 'government-job', 'news'].includes(category)) {
    return 'Category must be placement, government-job, or news';
  }

  if (schedule !== undefined && typeof schedule !== 'string') {
    return 'Schedule must be a cron expression string';
  }

  if (typeof schedule === 'string' && schedule && !cron.validate(schedule)) {
    return 'Schedule must be a valid cron expression';
  }

  if (enabled !== undefined && typeof enabled !== 'boolean') {
    return 'Enabled must be a boolean';
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return 'URL must be a valid absolute URL';
  }

  const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    !['http:', 'https:'].includes(parsedUrl.protocol)
    || parsedUrl.username
    || parsedUrl.password
    || hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
    || isPrivateIp(hostname)
  ) {
    return 'URL must use HTTP or HTTPS and point to a public host';
  }

  if (
    !extractionRules
    || typeof extractionRules !== 'object'
    || Array.isArray(extractionRules)
  ) {
    return 'Extraction rules must be an object';
  }

  if (
    Object.keys(extractionRules)
      .some((key) => ![
        'mode',
        'jsonLdType',
        'collectionPath',
        'itemSelector',
        'fields',
      ].includes(key))
  ) {
    return 'Extraction rules contain unsupported fields';
  }

  const {
    mode = 'css',
    jsonLdType = '',
    collectionPath = '',
    itemSelector,
    fields,
  } = extractionRules;
  if (!['css', 'jsonld', 'rss', 'api'].includes(mode)) {
    return 'Extraction mode must be css, jsonld, rss, or api';
  }

  if (typeof jsonLdType !== 'string' || jsonLdType.length > 100) {
    return 'JSON-LD type must be a short string';
  }

  if (
    typeof collectionPath !== 'string'
    || collectionPath.length > 200
    || (mode === 'api' && !/^[A-Za-z0-9_.-]+$/.test(collectionPath))
  ) {
    return 'API collection path must be a valid path';
  }

  if (
    mode === 'css'
    && (
    typeof itemSelector !== 'string'
    || !itemSelector.trim()
    || itemSelector.length > 500
    )
  ) {
    return 'Item selector must be a non-empty string of at most 500 characters';
  }

  if (!Array.isArray(fields) || fields.length > 30) {
    return 'Fields must contain at most 30 entries';
  }

  if (mode !== 'rss' && fields.length < 1) {
    return 'At least one extraction field is required';
  }

  if (mode === 'rss' && fields.length > 0) {
    return 'RSS sources do not use extraction fields';
  }

  const fieldNames = new Set();
  for (const field of fields) {
    if (!field || typeof field !== 'object' || Array.isArray(field)) {
      return 'Each extraction field must be an object';
    }

    if (
      Object.keys(field)
        .some((key) => !['name', 'selector', 'attribute', 'path'].includes(key))
    ) {
      return 'Extraction field contains unsupported fields';
    }

    if (
      typeof field.name !== 'string'
      || !field.name.trim()
      || field.name.trim().length > 80
      || (
        mode === 'css'
        && (
          typeof field.selector !== 'string'
          || !field.selector.trim()
          || field.selector.length > 500
        )
      )
      || (
        (mode === 'jsonld' || mode === 'api')
        && (
          typeof field.path !== 'string'
          || !/^[A-Za-z0-9_@.-]+(?:\.[A-Za-z0-9_@.-]+)*$/.test(field.path)
        )
      )
    ) {
      return 'Each field needs a name and selector of at most 500 characters';
    }

    const normalizedName = field.name.trim().toLowerCase();
    if (fieldNames.has(normalizedName)) {
      return 'Extraction field names must be unique';
    }
    fieldNames.add(normalizedName);

    if (
      field.attribute !== undefined
      && field.attribute !== 'text'
      && (
        typeof field.attribute !== 'string'
        || !/^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/.test(field.attribute)
      )
    ) {
      return 'Attribute must be text or a valid HTML attribute name';
    }
  }

  return null;
}

module.exports = { validateSourceInput };
