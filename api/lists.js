const axios = require('axios');

// Helper: Get manga from Kitsu by filter (e.g. trending, latest, etc.)
async function getKitsuMangaList(params = {}) {
  const res = await axios.get('https://kitsu.io/api/edge/manga', { params });
  return res.data.data.map(manga => ({
    id: manga.id,
    title: manga.attributes.canonicalTitle,
    imgUrl: manga.attributes.posterImage?.medium || 'https://via.placeholder.com/256?text=No+Cover',
    synopsis: manga.attributes.synopsis,
    status: manga.attributes.status,
  }));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Example fetches: Trending, Latest, Newly Added
    const [trending, latest, newlyAdded] = await Promise.all([
      getKitsuMangaList({ 'sort': 'popularityRank', 'page[limit]': 15 }),
      getKitsuMangaList({ 'sort': '-updatedAt', 'page[limit]': 15 }),
      getKitsuMangaList({ 'sort': '-createdAt', 'page[limit]': 15 }),
    ]);
    res.status(200).json({ trending, latest, newlyAdded });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch lists from Kitsu API.' });
  }
};
