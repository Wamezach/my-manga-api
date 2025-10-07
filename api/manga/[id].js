const axios = require('axios');
const VERCEL_API_URL = 'https://my-manga-api.vercel.app'; // Change to your actual deploy URL

const API_BASE_URL = 'https://api.mangadex.org';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { id } = req.query;

    // --- Get Manga Details ---
    const mangaResponse = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/manga/${id}`,
      params: {
        'includes[]': ['cover_art', 'author'],
      },
    });

    const manga = mangaResponse.data.data;

    // --- Get Chapter List ---
    const chapterResponse = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/manga/${id}/feed`,
      params: {
        limit: 500,
        order: { chapter: 'asc' },
        'translatedLanguage[]': ['en'],
      },
    });

    const author =
      manga.relationships.find(rel => rel.type === 'author')?.attributes?.name || 'Unknown';

    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    const coverFilename = coverArt ? coverArt.attributes.fileName : null;
    const coverImage = coverFilename
      ? `${VERCEL_API_URL}/api/proxy-cover?id=${manga.id}&filename=${encodeURIComponent(
          coverFilename + '.512.jpg'
        )}`
      : 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';

    // Make sure chapters is always an array
    const chapters = Array.isArray(chapterResponse.data.data)
      ? chapterResponse.data.data.map(chap => ({
          chapterId: chap.id,
          chapterTitle:
            `Chapter ${chap.attributes.chapter}` +
            (chap.attributes.title ? `: ${chap.attributes.title}` : ''),
        }))
      : [];

    // Make sure genres is always an array
    const genres = Array.isArray(manga.attributes.tags)
      ? manga.attributes.tags
          .filter(tag => tag.attributes.group === 'genre')
          .map(tag => tag.attributes.name.en)
      : [];

    res.status(200).json({
      id: manga.id,
      title: manga.attributes.title.en || Object.values(manga.attributes.title)[0] || 'Untitled',
      author: author,
      status: manga.attributes.status || 'Unknown',
      genres: genres,
      description: manga.attributes.description.en || 'No description available.',
      coverImage: coverImage,
      chapters: chapters,
    });

  } catch (error) {
    console.error('MangaDex API Error:', error.response ? error.response.data : error.message);
    // Always return safe fallback values for frontend
    res.status(200).json({
      id: req.query.id,
      title: 'Unknown',
      author: 'Unknown',
      status: 'Unknown',
      genres: [],
      description: 'Failed to fetch manga details from MangaDex API.',
      coverImage: 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover',
      chapters: [],
      message: 'Failed to fetch manga details from MangaDex API.',
    });
  }
};
