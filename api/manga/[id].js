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

    const chaptersRaw = chapterResponse.data.data;
    const chaptersByNumber = {};

    chaptersRaw.forEach(chap => {
      const chapNum = chap.attributes.chapter;
      if (!chapNum) return; // skip if no chapter number

      // Only group chapters that belong to the current manga
      if (!chaptersByNumber[chapNum]) chaptersByNumber[chapNum] = [];
      chaptersByNumber[chapNum].push(chap);
    });

    // For each chapter number, collect all English alternatives
    const chapters = Object.keys(chaptersByNumber)
      .sort((a, b) => parseFloat(a) - parseFloat(b))
      .map(chapNum => {
        const group = chaptersByNumber[chapNum];

        // All English alternatives for this chapter
        const englishAlternatives = group
          .filter(chap => ENGLISH_VARIANTS.includes(chap.attributes.translatedLanguage) && !!chap.id)
          .map(chap => ({
            chapterId: chap.id,
            chapterTitle: chap.attributes.chapter
              ? (chap.attributes.title
                  ? `Chapter ${chap.attributes.chapter}: ${chap.attributes.title}`
                  : `Chapter ${chap.attributes.chapter}`
                )
              : 'Untitled',
            translatedLanguage: chap.attributes.translatedLanguage || 'EN',
            groupName: chap.relationships.find(rel => rel.type === 'scanlation_group')?.attributes?.name || '',
            uploader: chap.relationships.find(rel => rel.type === 'user')?.attributes?.username || ''
          }));

        return {
          chapterNumber: chapNum,
          englishAlternatives
        };
      })
      // Optional: Only include chapters with at least one English alternative
      // .filter(chap => chap.englishAlternatives.length > 0)
      ;

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
    console.error('MangaDex API Error:', error.response ? JSON.stringify(error.response.data) : error.message);
    res.status(500).json({ message: 'Failed to fetch manga details from MangaDex API.' });
  }
};
