const axios = require('axios');

const API_BASE_URL = 'https://api.mangadex.org';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query is required.' });
    }

    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/manga`,
      params: {
        limit: 20,
        title: q,
        'includes[]': ['cover_art'],
        'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
        order: { relevance: 'desc' },
        // UPDATED: Only fetch manga that have chapters
        hasAvailableChapters: 'true',
      }
    });

    const mangaList = response.data.data.map(manga => {
      const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
      const coverFilename = coverArt ? coverArt.attributes.fileName : null;
      const imgUrl = coverFilename
        ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFilename}.256.jpg`
        : 'https://via.placeholder.com/256/1f2937/d1d5db.png?text=No+Cover';

      return {
        id: manga.id,
        title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
        imgUrl: imgUrl,
        latestChapter: `Chapter ${manga.attributes.lastChapter || 'N/A'}`,
      };
    });

    res.status(200).json({
      data: mangaList,
    });

  } catch (error) {
    console.error('MangaDex Search API Error:', error.response ? error.response.data.errors : error.message);
    res.status(500).json({ message: 'Failed to fetch search results from MangaDex API.' });
  }
};
