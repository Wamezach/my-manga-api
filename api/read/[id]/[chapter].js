const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  // Allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { id, chapter } = req.query; // e.g., /api/read/manga-id/chapter-1

    if (!id || !chapter) {
      return res.status(400).json({ message: 'Manga ID and Chapter ID are required.' });
    }

    // Note: The source site uses the full chapter ID, e.g., "chapter-1"
    const siteUrl = `https://ww8.mangakakalot.tv/chapter/${id}/${chapter}`;
const { data } = await axios.get(siteUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
  }
});
    const $ = cheerio.load(data);

    const imageUrls = [];
    $('.container-chapter-reader img').each((i, el) => {
      const imageUrl = $(el).attr('src');
      if (imageUrl) {
        imageUrls.push(imageUrl);
      }
    });

    const title = $('.panel-chapter-info-top h1').text().trim();
    const chapterNumberMatch = chapter.match(/(\d+(\.\d+)?)$/);
    const chapterNumber = chapterNumberMatch ? chapterNumberMatch[0] : chapter;


    if (imageUrls.length === 0) {
        return res.status(404).json({ message: 'Chapter not found or no images available.' });
    }

    res.status(200).json({
      title: title || `Chapter ${chapterNumber}`,
      chapter: chapterNumber,
      imageUrls: imageUrls,
    });

  } catch (error) {
    console.error(error);
     if (error.response && error.response.status === 404) {
        return res.status(404).json({ message: `Chapter '${req.query.chapter}' for manga '${req.query.id}' not found.` });
    }
    res.status(500).json({ message: 'Error scraping manga chapter.' });
  }
};
