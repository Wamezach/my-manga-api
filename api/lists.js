const axios = require('axios');

// Helper: Get cover image from Jikan by title
async function getCoverFromJikan(title) {
  try {
    const res = await axios.get('https://api.jikan.moe/v4/manga', { params: { q: title, limit: 1 } });
    const manga = res.data.data[0];
    return manga?.images?.jpg?.large_image_url || manga?.images?.jpg?.image_url || null;
  } catch {
    return null;
  }
}

const processMangaList = async (mangaData) => {
  if (!mangaData) return [];
  // Parallel fetch covers from Jikan
  return await Promise.all(mangaData.map(async manga => {
    const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0];
    const imgUrl = await getCoverFromJikan(title)
      || 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';
    return {
      id: manga.id,
      title,
      imgUrl,
    };
  }));
};

const fetchList = (orderParams) => axios({
  method: 'GET',
  url: 'https://api.mangadex.org/manga',
  params: {
    limit: 15,
    'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
    hasAvailableChapters: true,
    order: orderParams,
  }
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const [trendingRes, latestRes, newRes] = await Promise.all([
      fetchList({ followedCount: 'desc' }),
      fetchList({ updatedAt: 'desc' }),
      fetchList({ createdAt: 'desc' })
    ]);
    // Use Promise.all to fetch covers for each list in parallel
    const trending = await processMangaList(trendingRes.data.data);
    const latest = await processMangaList(latestRes.data.data);
    const newlyAdded = await processMangaList(newRes.data.data);

    res.status(200).json({ trending, latest, newlyAdded });
  } catch (error) {
    console.error('API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Failed to fetch lists.' });
  }
};
