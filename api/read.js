const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  // Allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const chapterId = req.query.chapterId;
    if (!chapterId) {
      return res.status(400).json({ message: 'Chapter ID is required.' });
    }

    const siteUrl = `https://ww8.mangakakalot.tv/chapter/${chapterId}`;
    const { data } = await axios.get(siteUrl);
    const $ = cheerio.load(data);

    const pages = [];
    $('.container-chapter-reader img').each((i, el) => {
      pages.push({
        page: i + 1,
        img: $(el).attr('src'),
      });
    });

    res.status(200).json(pages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error scraping chapter pages.' });
  }
};
