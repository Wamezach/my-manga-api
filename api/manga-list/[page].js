const axios = require('axios');

const API_BASE_URL = 'https://api.mangadex.org';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = 24;
    const offset = (page - 1) * limit;

    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/manga`,
      params: {
        limit,
        offset,
        'includes[]': 'cover_art',
        'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
        hasAvailableChapters: true,
        order: { updatedAt: 'desc' },
      },
    });

    const mangaList = response.data.data.map(manga => {
      let imgUrl = 'https://via.placeholder.com/256/1f2937/d1d5db.png?text=No+Cover';
      if (Array.isArray(manga.relationships)) {
        const coverArt = manga.relationships.find(rel => rel.type === 'cover_art' && rel.attributes && rel.attributes.fileName);
        if (coverArt) {
          imgUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.256.jpg`;
        }
      }
      return {
        id: manga.id,
        title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
        imgUrl,
        latestChapter: `Chapter ${manga.attributes.lastChapter || 'N/A'}`,
      };
    });

    res.status(200).json({
      pagination: [page],
      data: mangaList,
    });

  } catch (error) {
    console.error('MangaDex API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Failed to fetch data from MangaDex API.' });
  }
};
