const axios = require('axios');

// Example Ketsu endpoint
const KETSU_LIST_URL = 'https://api.ketsu.io/manga/popular';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const response = await axios.get(KETSU_LIST_URL);
    const mangaList = response.data.results.map(manga => ({
      id: manga.id,
      title: manga.title,
      imgUrl: manga.image,
      genres: manga.genres || [],
      description: manga.synopsis || "",
    }));
    res.status(200).json({ trending: mangaList, latest: mangaList, newlyAdded: mangaList });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch lists from Ketsu.' });
  }
};
