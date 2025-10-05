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

    // Making the API request using the standard Axios `params` object
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/manga`,
      params: {
        limit: 20,
        title: q,
        'includes[]': ['cover_art'],
        // As requested, include all content ratings in search results
        'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
        order: { relevance: 'desc' }
      }
    });

    // Transform the data into our simple format
    const mangaList = response.data.data.map(manga => {
      const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
      const coverFilename = coverArt ? coverArt.attributes.fileName : null;
      // Use smaller images for search grid
      const imgUrl = coverFilename
        ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFilename}.256.jpg`
        : 'https://via.placeholder.com/256/1f2937/d1d5db.png?text=No+Cover';

      return {
        id: manga.id,
        title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
        imgUrl: imgUrl,
        description: manga.attributes.description.en || '',
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
