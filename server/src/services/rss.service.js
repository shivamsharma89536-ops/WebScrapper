function extractRss($) {
  const items = [];

  $('item, entry').each((_, element) => {
    const item = $(element);
    items.push({
      title: item.find('title').first().text().trim(),
      link: item.find('link').first().attr('href') || item.find('link').first().text().trim(),
      publishedAt: item.find('pubDate, published, updated').first().text().trim(),
      description: item.find('description, summary, content').first().text().trim(),
    });
  });

  return items.filter((item) => item.title || item.link);
}

module.exports = { extractRss };
