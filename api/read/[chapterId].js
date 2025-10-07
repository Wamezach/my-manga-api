const axios = require('axios');
const VERCEL_API_URL = 'https://my-manga-api.vercel.app'; // Change to your deploy URL
const API_BASE_URL = 'https://api.mangadex.org';

// Map language codes to flags and country names for display
const LANGUAGE_META = {
  'en':   { flag: '🇺🇸', country: 'United States' },
  'en-gb':{ flag: '🇬🇧', country: 'United Kingdom' },
  'en-ca':{ flag: '🇨🇦', country: 'Canada' },
  'en-au':{ flag: '🇦🇺', country: 'Australia' },
  'en-nz':{ flag: '🇳🇿', country: 'New Zealand' },
  'zh':   { flag: '🇨🇳', country: 'China' },
  'zh-hk':{ flag: '🇭🇰', country: 'Hong Kong' },
  'zh-tw':{ flag: '🇹🇼', country: 'Taiwan' },
  'ja':   { flag: '🇯🇵', country: 'Japan' },
  'es':   { flag: '🇪🇸', country: 'Spain' },
  'es-la':{ flag: '🇲🇽', country: 'Latin America' },
  'fr':   { flag: '🇫🇷', country: 'France' },
  'de':   { flag: '🇩🇪', country: 'Germany' },
  'ru':   { flag: '🇷🇺', country: 'Russia' },
  'it':   { flag: '🇮🇹', country: 'Italy' },
  'pt-br':{ flag: '🇧🇷', country: 'Brazil' },
  'ko':   { flag: '🇰🇷', country: 'Korea' },
  'pl':   { flag: '🇵🇱', country: 'Poland' },
  'ar':   { flag: '🇸🇦', country: 'Arabic' },
  'tr':   { flag: '🇹🇷', country: 'Turkey' },
  'id':   { flag: '🇮🇩', country: 'Indonesia' },
  'ro':   { flag: '🇷🇴', country: 'Romania' },
  'vi':   { flag: '🇻🇳', country: 'Vietnam' },
  'uk':   { flag: '🇺🇦', country: 'Ukraine' },
  'th':   { flag: '🇹🇭', country: 'Thailand' },
  'br':   { flag: '🇧🇷', country: 'Brazil' }
  // Add more if needed
};

function getLangMeta(lang) {
  let l = (lang || '').toLowerCase();
  return LANGUAGE_META[l] || { flag: '', country: l.toUpperCase() };
}

// Fetch all chapters with pagination
async function fetchAllChapters(id) {
  let all = [];
  let offset = 0;
  const limit = 500;
  let hasMore = true;
  while (hasMore) {
    const res = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/manga/${id}/feed`,
      params: {
        limit,
        offset,
        order: { chapter: 'asc' }
      },
    });
    const data = res.data.data;
    all = all.concat(data);
    offset += data.length;
    hasMore = data.length === limit;
  }
  return all;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { id } = req.query;

    // Get Manga Details
    const mangaResponse = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/manga/${id}`,
      params: { 'includes[]': ['cover_art', 'author'] },
    });
    const manga = mangaResponse.data.data;

    // Get all chapters (all pages)
    const chaptersRaw = await fetchAllChapters(id);

    // Group chapters by chapter number (as string)
    const chaptersByNumber = {};
    chaptersRaw.forEach(chap => {
      const chapNum = chap.attributes.chapter;
      if (!chapNum) return;
      if (!chaptersByNumber[chapNum]) chaptersByNumber[chapNum] = [];
      chaptersByNumber[chapNum].push(chap);
    });

    // For each chapter, collect all language/country variants
    const chapters = Object.keys(chaptersByNumber)
      .sort((a, b) => {
        // Handle decimal and special chapters gracefully (e.g. 1, 1.5, 2, 10, "A", etc.)
        const na = parseFloat(a);
        const nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        if (!isNaN(na)) return -1;
        if (!isNaN(nb)) return 1;
        return a.localeCompare(b);
      })
      .map(chapNum => {
        const group = chaptersByNumber[chapNum];
        const allAlternatives = group
          .sort((a, b) => {
            const la = (a.attributes.translatedLanguage || '').toLowerCase();
            const lb = (b.attributes.translatedLanguage || '').toLowerCase();
            // EN/EN-gb always first
            if (la.startsWith('en') && !lb.startsWith('en')) return -1;
            if (!la.startsWith('en') && lb.startsWith('en')) return 1;
            return la.localeCompare(lb);
          })
          .map(chap => {
            const lang = (chap.attributes.translatedLanguage || '').toLowerCase();
            const meta = getLangMeta(lang);
            return {
              chapterId: chap.id,
              chapterTitle: chap.attributes.chapter
                ? (chap.attributes.title
                  ? `Chapter ${chap.attributes.chapter}: ${chap.attributes.title}`
                  : `Chapter ${chap.attributes.chapter}`)
                : 'Untitled',
              translatedLanguage: lang,
              flag: meta.flag,
              country: meta.country,
              groupName: chap.relationships.find(rel => rel.type === 'scanlation_group')?.attributes?.name || '',
              uploader: chap.relationships.find(rel => rel.type === 'user')?.attributes?.username || ''
            };
          });

        // For frontend: availableCountries is a summary, alternatives is the detailed list
        const availableCountries = allAlternatives.map(a => ({
          code: a.translatedLanguage,
          flag: a.flag,
          country: a.country,
        }));

        return {
          chapterNumber: chapNum,
          availableCountries,
          alternatives: allAlternatives
        };
      });

    // Cover/author logic unchanged
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
    console.error('MangaDex API Error:', error.response ? JSON.stringify(error.response.data) : error.message, error.stack);
    res.status(500).json({ message: 'Failed to fetch manga details from MangaDex API.', error: error.response ? error.response.data : error.message });
  }
};
