const axios = require('axios');
const VERCEL_API_URL = 'https://my-manga-api.vercel.app'; // <-- Update to your Vercel deploy URL

const API_BASE_URL = 'https://api.mangadex.org';

// Map language codes to country flags (expand as needed)
const LANGUAGE_FLAG_MAP = {
    'ja': '🇯🇵', 'en': '🇺🇸', 'ko': '🇰🇷', 'zh': '🇨🇳', 'zh-hk': '🇭🇰', 'th': '🇹🇭', 'fr': '🇫🇷',
    'it': '🇮🇹', 'es': '🇪🇸', 'pt-br': '🇧🇷', 'de': '🇩🇪', 'ru': '🇷🇺', 'vi': '🇻🇳', 'pl': '🇵🇱',
    'tr': '🇹🇷', 'id': '🇮🇩', 'ar': '🇸🇦', 'uk': '🇺🇦', 'bg': '🇧🇬', 'ms': '🇲🇾', 'fa': '🇮🇷',
    'ro': '🇷🇴', 'hu': '🇭🇺', 'el': '🇬🇷', 'cs': '🇨🇿', 'nl': '🇳🇱', 'sv': '🇸🇪', 'da': '🇩🇰',
    'fi': '🇫🇮', 'he': '🇮🇱'
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
            params: { limit: 500 }
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
            flags: flags
        };
    }));
};

const fetchList = (orderParams, extraParams = {}) => {
    return axios({
        method: 'GET',
        url: `${API_BASE_URL}/manga`,
        params: {
            limit: 15,
            'includes[]': ['cover_art'],
            'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
            hasAvailableChapters: 'true',
            order: orderParams,
            ...extraParams
        }
    });
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        // You may adjust the fetchList calls and parameters to fit your backend/data source if needed.
        const [
            latestRes, newRes, featuredRes, recommendedRes, seasonalRes, selfPublishedRes
        ] = await Promise.all([
            fetchList({ updatedAt: 'desc' }),                // Latest Updates
            fetchList({ createdAt: 'desc' }),                // Newly Added
            fetchList({ followedCount: 'desc' }),            // Featured (could use custom logic)
            fetchList({ relevance: 'desc' }),                // Recommended (could use custom logic)
            fetchList({ year: 'desc' }, { year: 2025, season: 'summer' }), // Seasonal: Summer 2025
            fetchList({ createdAt: 'desc' }, { publicationDemographic: 'none' }) // Self-Published (demographic: none)
        ]);

        res.status(200).json({
            featured: await processMangaList(featuredRes.data.data),
            seasonal: await processMangaList(seasonalRes.data.data),
            "self-published": await processMangaList(selfPublishedRes.data.data),
            recommended: await processMangaList(recommendedRes.data.data),
            latest: await processMangaList(latestRes.data.data),
            newlyAdded: await processMangaList(newRes.data.data)
        });

    } catch (error) {
        console.error('MangaDex Lists API Error:', error.response ? error.response.data.errors : error.message);
        res.status(200).json({
            featured: [],
            seasonal: [],
            "self-published": [],
            recommended: [],
            latest: [],
            newlyAdded: [],
            message: 'Failed to fetch lists from MangaDex API.'
        });
    }
};
