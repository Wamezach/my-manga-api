const axios = require('axios');

const API_BASE_URL = 'https://api.mangadex.org';

const processMangaList = (mangaData) => {
  if (!mangaData) return [];
  return mangaData.map(manga => {
    // Defensive extraction of cover art
    let imgUrl = 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';
    if (Array.isArray(manga.relationships)) {
      const coverArt = manga.relationships.find(rel => rel.type === 'cover_art' && rel.attributes && rel.attributes.fileName);
      if (coverArt) {
        imgUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.512.jpg`;
      } else {
        // Log missing covers for debugging
        console.log(`No cover art for manga: ${manga.id} (${(manga.attributes.title.en || Object.values(manga.attributes.title)[0])})`);
      }
    }
    return {
      id: manga.id,
      title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
      imgUrl,
    };
  });
};

const fetchList = (orderParams) => {
  return axios({
    method: 'GET',
    url: `${API_BASE_URL}/manga`,
    params: {
      limit: 15,
      'includes[]': 'cover_art', // Use string for compatibility
      'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
      hasAvailableChapters: true,
      order: orderParams,
    }
  });
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const [trendingRes, latestRes, newRes] = await Promise.all([
      fetchList({ followedCount: 'desc' }), // Trending
      fetchList({ updatedAt: 'desc' }),     // Latest
      fetchList({ createdAt: 'desc' })      // New
    ]);

    res.status(200).json({
      trending: processMangaList(trendingRes.data.data),
      latest: processMangaList(latestRes.data.data),
      newlyAdded: processMangaList(newRes.data.data),
    });

  } catch (error) {
    console.error('MangaDex Lists API Error:', error.response ? error.response.data.errors : error.message);
    res.status(500).json({ message: 'Failed to fetch lists from MangaDex API.' });
  }
};
