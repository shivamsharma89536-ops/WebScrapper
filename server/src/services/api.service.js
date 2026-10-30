const { getPathValue } = require('./jsonLd.service');

function extractApiItems(payload, collectionPath, fields) {
  const collection = getPathValue(payload, collectionPath);
  if (!Array.isArray(collection)) {
    throw new Error('API collection path does not contain an array');
  }

  return collection.map((entry) => fields.reduce((item, field) => {
    const value = getPathValue(entry, field.path);
    item[field.name.trim()] = value === undefined || value === null
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
    return item;
  }, {}));
}

module.exports = { extractApiItems };
