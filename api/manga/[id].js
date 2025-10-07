const axios = require('axios');
const VERCEL_API_URL = 'https://my-manga-api.vercel.app'; // Change to your deploy URL

const API_BASE_URL = 'https://api.mangadex.org';

// Prioritize order for English: UK, US, CA, then others
const ENGLISH_PRIORITY = ['en-gb', 'en', 'en-ca', 'en-au', 'en-nz', 'en-ie', 'en-za', 'en-in', 'en-sg', 'en-hk', 'en-ph', 'en-my', 'en-ng', 'en-pk'];

// All known country/language codes on MangaDex (sample, expand as needed)
const LANGUAGE_FLAGS = {
  'en': '🇺🇸', 'en-gb': '🇬🇧', 'en-ca': '🇨🇦', 'en-au': '🇦🇺', 'en-nz': '🇳🇿', 'en-ie': '🇮🇪', 'en-za': '🇿🇦',
  'es': '🇪🇸', 'es-la': '🇲🇽', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹', 'pt-br': '🇧🇷', 'ru': '🇷🇺',
  'ja': '🇯🇵', 'zh': '🇨🇳', 'zh-hk': '🇭🇰', 'zh-tw': '🇹🇼', 'ko': '🇰🇷', 'id': '🇮🇩', 'tr': '🇹🇷',
  'th': '🇹🇭', 'vi': '🇻🇳', 'ar': '🇸🇦', 'pl': '🇵🇱', 'cs': '🇨🇿', 'nl': '🇳🇱', 'hu': '🇭🇺', 'fi': '🇫🇮',
  'bg': '🇧🇬', 'uk': '🇺🇦', 'el': '🇬🇷', 'hi': '🇮🇳', 'ta': '🇮🇳', 'ms': '🇲🇾'
  // ...add more if you want
};

function getFlag(lang) {
  return LANGUAGE_FLAGS[lang] || '';
}

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

    // --- Group chapters by chapter number ---
    const chaptersRaw = chapterResponse.data.data;
    const chaptersByNumber = {};

    chaptersRaw.forEach(chap => {
      const chapNum = chap.attributes.chapter;
      if (!chapNum) return; // skip if no chapter number
      if (!chaptersByNumber[chapNum]) chaptersByNumber[chapNum] = [];
      chaptersByNumber[chapNum].push(chap);
    });

    // For each chapter number, collect all alternatives by language (sorted for English preference)
    const chapters = Object.keys(chaptersByNumber)
      .sort((a, b) => parseFloat(a) - parseFloat(b))
      .map(chapNum => {
        const group = chaptersByNumber[chapNum];

        // Sort: English priority first, then others alphabetically
        const sortedGroup = group.sort((a, b) => {
          const aLang = (a.attributes.translatedLanguage || '').toLowerCase();
          const bLang = (b.attributes.translatedLanguage || '').toLowerCase();
          const aIdx = ENGLISH_PRIORITY.indexOf(aLang);
          const bIdx = ENGLISH_PRIORITY.indexOf(bLang);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return aLang.localeCompare(bLang);
        });

        // Make a language alternative for each
        const allAlternatives = sortedGroup.map(chap => ({
          chapterId: chap.id,
          chapterTitle: chap.attributes.chapter
            ? (chap.attributes.title
                ? `Chapter ${chap.attributes.chapter}: ${chap.attributes.title}`
                : `Chapter ${chap.attributes.chapter}`
              )
            : 'Untitled',
          translatedLanguage: chap.attributes.translatedLanguage || '',
          flag: getFlag((chap.attributes.translatedLanguage || '').toLowerCase()),
          groupName: chap.relationships.find(rel => rel.type === 'scanlation_group')?.attributes?.name || '',
          uploader: chap.relationships.find(rel => rel.type === 'user')?.attributes?.username || ''
        }));

        return {
          chapterNumber: chapNum,
          alternatives: allAlternatives
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
    console.error('MangaDex API Error:', error.response ? JSON.stringify(error.response.data) : error.message);
    res.status(500).json({ message: 'Failed to fetch manga details from MangaDex API.' });
  }
};
