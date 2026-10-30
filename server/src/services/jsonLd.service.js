function getPathValue(object, path) {
  return path.split('.').reduce((value, key) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    return value[key];
  }, object);
}

function collectJsonLdObjects($) {
  const objects = [];

  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const parsed = JSON.parse($(script).contents().text());
      const values = Array.isArray(parsed) ? parsed : [parsed];
      values.forEach((value) => {
        if (value && typeof value === 'object') {
          if (Array.isArray(value['@graph'])) {
            objects.push(...value['@graph']);
          } else {
            objects.push(value);
          }
        }
      });
    } catch {
      // Ignore malformed JSON-LD blocks and inspect valid blocks.
    }
  });

  return objects;
}

function extractJsonLd($, fields, type) {
  const objects = collectJsonLdObjects($)
    .filter((object) => !type || object['@type'] === type);

  return objects.map((object) => fields.reduce((item, field) => {
    const value = getPathValue(object, field.path);
    item[field.name.trim()] = value === undefined || value === null
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
    return item;
  }, {}));
}

module.exports = { extractJsonLd };
module.exports.getPathValue = getPathValue;
