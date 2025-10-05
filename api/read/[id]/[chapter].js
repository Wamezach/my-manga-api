const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { id, chapter } = req.query;
    // UPDATED: New source website
    const siteUrl = `https://weebcentral.com/manga/${id}/${chapter}`;

    const { data } = await axios.get(siteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const imageUrls = [];

    // UPDATED: New selectors for weebcentral.com
    $('img[class*="w-full"][class*="h-auto"]').each((i, el) => {
      const imageUrl = $(el).attr('src');
      if (imageUrl) {
        imageUrls.push(imageUrl);
      }
    });

    const title = $('a[href*="/manga/"]').first().text().trim();

    if (imageUrls.length === 0) {
        return res.status(404).json({ message: 'Chapter not found or no images available.' });
    }

    res.status(200).json({
      title: title,
      chapter: chapter,
      imageUrls: imageUrls,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error scraping manga chapter.', error: error.message });
  }
};
