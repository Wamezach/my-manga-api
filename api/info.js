const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  // Allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const mangaId = req.query.id;
    if (!mangaId) {
      return res.status(400).json({ message: 'Manga ID is required.' });
    }

    const siteUrl = `https://ww8.mangakakalot.tv/manga/${mangaId}`;
    const { data } = await axios.get(siteUrl);
    const $ = cheerio.load(data);

    const chapters = [];
    $('.row-content-chapter li').each((i, el) => {
      chapters.push({
        title: $(el).find('a').text(),
        id: $(el).find('a').attr('href').split('/').pop(),
      });
    });

    const mangaInfo = {
      title: $('.story-info-right h1').text(),
      image: $('.story-info-left .info-image img').attr('src'),
      description: $('#panel-story-info-description').text().trim(),
      chapters: chapters.reverse(), // Reverse to show oldest first
    };

    res.status(200).json(mangaInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error scraping manga info.' });
  }
};
