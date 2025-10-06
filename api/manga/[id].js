const axios = require('axios');
const VERCEL_API_URL = 'https://my-manga-api.vercel.app'; // Change to your deploy URL

const API_BASE_URL = 'https://api.mangadex.org';

// Preferred language codes in order
const PREFERRED_LANGUAGES = ['en', 'en-gb', 'en-ca', 'pt-br'];

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

    // --- Get Chapter List (all languages) ---
    const chapterResponse = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/manga/${id}/feed`,
      params: {
        limit: 500,
        order: { chapter: 'asc' },
      },
    });

    // --- Process Chapters: Pick only preferred language per chapter number ---
    // Group chapters by chapter number
    const chaptersByNumber = {};
    for (const chap of chapterResponse.data.data) {
      const chapNum = chap.attributes.chapter;
      if (!chapNum) continue; // skip if no chapter number

      if (!chaptersByNumber[chapNum]) chaptersByNumber[chapNum] = [];

      chaptersByNumber[chapNum].push(chap);
    }

    // For each chapter number, pick preferred language
    const chapters = Object.keys(chaptersByNumber).sort((a, b) => Number(a) - Number(b)).map(chapNum => {
      const group = chaptersByNumber[chapNum];
      // Find the preferred language
      let chosen = null;
      for (const lang of PREFERRED_LANGUAGES) {
        chosen = group.find(chap => chap.attributes.translatedLanguage === lang);
        if (chosen) break;
      }
      // If none, pick the first available
      if (!chosen) chosen = group[0];

      return {
        chapterId: chosen.id,
        chapterTitle: `Chapter ${chosen.attributes.chapter}` + (chosen.attributes.title ? `: ${chosen.attributes.title}` : ''),
        translatedLanguage: chosen.attributes.translatedLanguage
      };
    });

    // --- Cover logic unchanged ---
    const author = manga.relationships.find(rel => rel.type === 'author')?.attributes?.name || 'Unknown';
    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    const coverFilename = coverArt ? coverArt.attributes.fileName : null;
    const coverImage = coverFilename
      ? `${VERCEL_API_URL}/api/proxy-cover?id=${manga.id}&filename=${encodeURIComponent(coverFilename + '.512.jpg')}`
      : 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';

    res.status(200).json({
      id: manga.id,
      title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
      author: author,
      status: manga.attributes.status,
      genres: manga.attributes.tags.filter(tag => tag.attributes.group === 'genre').map(tag => tag.attributes.name.en),
      description: manga.attributes.description.en || 'No description available.',
      coverImage: coverImage,
      chapters: chapters,
    });

  } catch (error) {
    console.error('MangaDex API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Failed to fetch manga details from MangaDex API.' });
  }
};
