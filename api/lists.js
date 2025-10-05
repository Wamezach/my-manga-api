const axios = require('axios');

const BASE_URL = 'https://api.consumet.org/manga/mangakakalot';

async function getList(type = "popular", page = 1) {
  const res = await axios.get(`${BASE_URL}/${type}?page=${page}`);
  return res.data.results.map(manga => ({
    id: manga.id,
    title: manga.title,
    imgUrl: manga.image,
    url: manga.url,
    latestChapter: manga.latestChapter || "",
  }));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const [trending, latest, newlyAdded] = await Promise.all([
      getList("popular"),
      getList("latest"),
      getList("new"),
    ]);
    res.status(200).json({ trending, latest, newlyAdded });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch lists from MangaKakalot.' });
  }
};
