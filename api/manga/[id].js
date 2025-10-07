const axios = require('axios');

const API_BASE_URL = 'https://api.mangadex.org';
const VERCEL_API_URL = 'https://my-manga-api.vercel.app';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ message: 'Manga ID is required from the URL path.' });
    }

    // Manga details
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/manga/${id}`,
      params: { 'includes[]': ['cover_art'] }
    });

    const manga = response.data.data;
    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    const coverFilename = coverArt ? coverArt.attributes.fileName : null;
    const imgUrl = coverFilename
      ? `${VERCEL_API_URL}/api/proxy-cover?id=${id}&filename=${encodeURIComponent(coverFilename)}`
      : 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';

    res.status(200).json({
      id: manga.id,
      title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
      imgUrl,
      attributes: manga.attributes,
    });

  } catch (error) {
    console.error('MangaDex Manga API Error:', error.response ? error.response.data.errors : error.message);
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ message: 'Manga not found on MangaDex.' });
    }
    res.status(500).json({ message: 'Failed to fetch manga details from MangaDex API.' });
  }
};
