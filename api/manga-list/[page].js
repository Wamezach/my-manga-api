const axios = require('axios');

const API_BASE_URL = 'https://api.mangadex.org';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = 24;
    const offset = (page - 1) * limit;

    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/manga`,
      params: {
        limit: limit,
        offset: offset,
        // FIXED: Changed 'latestUploadedAt' to the correct 'updatedAt'
        order: { updatedAt: 'desc' },
        'includes[]': ['cover_art'],
        'contentRating[]': ['safe', 'suggestive'],
      },
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
        description: manga.attributes.description.en || '',
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
