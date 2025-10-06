const axios = require('axios');
const VERCEL_API_URL = 'https://my-manga-api.vercel.app'; // <-- Update to your Vercel deploy URL

const API_BASE_URL = 'https://api.mangadex.org';

// Map language codes to country flags (expand as needed)
const LANGUAGE_FLAG_MAP = {
    'ja': '🇯🇵', // Japanese
    'en': '🇺🇸', // English
    'ko': '🇰🇷', // Korean
    'zh': '🇨🇳', // Chinese
    'zh-hk': '🇭🇰', // Chinese (Hong Kong)
    'th': '🇹🇭', // Thai
    'fr': '🇫🇷', // French
    'it': '🇮🇹', // Italian
    'es': '🇪🇸', // Spanish
    'pt-br': '🇧🇷', // Brazilian Portuguese
    'de': '🇩🇪', // German
    'ru': '🇷🇺', // Russian
    'vi': '🇻🇳', // Vietnamese
    'pl': '🇵🇱', // Polish
    'tr': '🇹🇷', // Turkish
    'id': '🇮🇩', // Indonesian
    'ar': '🇸🇦', // Arabic
    'uk': '🇺🇦', // Ukrainian
    'bg': '🇧🇬', // Bulgarian
    'ms': '🇲🇾', // Malay
    'fa': '🇮🇷', // Persian
    'ro': '🇷🇴', // Romanian
    'hu': '🇭🇺', // Hungarian
    'el': '🇬🇷', // Greek
    'cs': '🇨🇿', // Czech
    'nl': '🇳🇱', // Dutch
    'sv': '🇸🇪', // Swedish
    'da': '🇩🇰', // Danish
    'fi': '🇫🇮', // Finnish
    'he': '🇮🇱', // Hebrew
    // ...add more as needed
};

function getCountryFlag(lang) {
    return LANGUAGE_FLAG_MAP[lang] || '';
}

// Given a manga ID, fetch all available language flags for its chapters
async function getAvailableFlagsForManga(mangaId) {
    try {
        const chaptersRes = await axios({
            method: 'GET',
            url: `${API_BASE_URL}/manga/${mangaId}/feed`,
            params: {
                limit: 500,
                // Remove 'translatedLanguage[]' to get all languages
            }
        });
        const chapterLanguages = chaptersRes.data.data
            .map(chap => chap.attributes.translatedLanguage)
            .filter((v, i, arr) => arr.indexOf(v) === i); // Unique
        return chapterLanguages.map(getCountryFlag).filter(Boolean);
    } catch (e) {
        return [];
    }
}

const processMangaList = async (mangaData) => {
    if (!mangaData) return [];
    // For each manga, gather flags
    return await Promise.all(mangaData.map(async manga => {
        const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
        const coverFilename = coverArt ? coverArt.attributes.fileName : null;
        const imgUrl = coverFilename
            ? `${VERCEL_API_URL}/api/proxy-cover?id=${manga.id}&filename=${encodeURIComponent(coverFilename + '.512.jpg')}`
            : 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';
        const flags = await getAvailableFlagsForManga(manga.id);

        return {
            id: manga.id,
            title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
            imgUrl: imgUrl,
            flags: flags // Array of flags for available countries/languages
        };
    }));
};

const fetchList = (orderParams) => {
    return axios({
        method: 'GET',
        url: `${API_BASE_URL}/manga`,
        params: {
            limit: 15,
            'includes[]': ['cover_art'],
            'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
            hasAvailableChapters: 'true', // Only get manga with chapters
            order: orderParams,
        }
    });
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        const [trendingRes, latestRes, newRes] = await Promise.all([
            fetchList({ followedCount: 'desc' }), // Trending
            fetchList({ updatedAt: 'desc' }),     // Latest
            fetchList({ createdAt: 'desc' })      // New
        ]);

        res.status(200).json({
            trending: await processMangaList(trendingRes.data.data),
            latest: await processMangaList(latestRes.data.data),
            newlyAdded: await processMangaList(newRes.data.data),
        });

    } catch (error) {
        console.error('MangaDex Lists API Error:', error.response ? error.response.data.errors : error.message);
        // Always return empty arrays so frontend .map never fails
        res.status(200).json({
            trending: [],
            latest: [],
            newlyAdded: [],
            message: 'Failed to fetch lists from MangaDex API.'
        });
    }
};
