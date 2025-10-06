const axios = require('axios');
const VERCEL_API_URL = 'https://my-manga-api.vercel.app'; // Change to your deploy URL

const API_BASE_URL = 'https://api.mangadex.org';

// All English variants for MangaDex
const ENGLISH_VARIANTS = ['en', 'en-gb', 'en-ca', 'en-au', 'en-nz', 'en-ie', 'en-za', 'en-in'];

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

    // --- Group chapters by translatedLanguage ---
    const chaptersRaw = chapterResponse.data.data;
    const variantCounts = {};
    ENGLISH_VARIANTS.forEach(variant => variantCounts[variant] = 0);

    chaptersRaw.forEach(chap => {
      if (ENGLISH_VARIANTS.includes(chap.attributes.translatedLanguage)) {
        variantCounts[chap.attributes.translatedLanguage]++;
      }
    });

    // Find the variant with the most chapters
    let maxCount = 0;
    let chosenVariant = null;
    for (const variant of ENGLISH_VARIANTS) {
      if (variantCounts[variant] > maxCount) {
        maxCount = variantCounts[variant];
        chosenVariant = variant;
      }
    }

    // Filter chapters to only use the chosen variant (if any)
    let chapters;
    if (chosenVariant) {
      chapters = chaptersRaw
        .filter(chap => chap.attributes.translatedLanguage === chosenVariant)
        .map(chosen => ({
          chapterId: chosen.id,
          chapterTitle: `Chapter ${chosen.attributes.chapter}` + (chosen.attributes.title ? `: ${chosen.attributes.title}` : ''),
          translatedLanguage: chosen.attributes.translatedLanguage
        }));
    } else {
      // If no English variant chapters, show all chapters (all languages)
      chapters = chaptersRaw.map(chosen => ({
        chapterId: chosen.id,
        chapterTitle: `Chapter ${chosen.attributes.chapter}` + (chosen.attributes.title ? `: ${chosen.attributes.title}` : ''),
        translatedLanguage: chosen.attributes.translatedLanguage
      }));
    }

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
      chosenEnglishVariant: chosenVariant // optional, for frontend
    });

  } catch (error) {
    console.error('MangaDex API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Failed to fetch manga details from MangaDex API.' });
  }
};
