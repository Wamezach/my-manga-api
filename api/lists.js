const axios = require('axios');

const API_BASE_URL = 'https://api.mangadex.org';

// Map language codes to country flags (expanded)
const LANGUAGE_FLAG_MAP = {
    'ja': '🇯🇵', 'en': '🇺🇸', 'en-gb': '🇬🇧', 'en-ca': '🇨🇦', 'en-au': '🇦🇺', 'en-nz': '🇳🇿',
    'ko': '🇰🇷', 'zh': '🇨🇳', 'zh-hk': '🇭🇰', 'zh-tw': '🇹🇼', 'th': '🇹🇭', 'fr': '🇫🇷', 'it': '🇮🇹',
    'es': '🇪🇸', 'es-la': '🇲🇽', 'pt-br': '🇧🇷', 'de': '🇩🇪', 'ru': '🇷🇺', 'vi': '🇻🇳', 'pl': '🇵🇱',
    'tr': '🇹🇷', 'id': '🇮🇩', 'ar': '🇸🇦', 'uk': '🇺🇦', 'bg': '🇧🇬', 'ms': '🇲🇾', 'fa': '🇮🇷',
    'ro': '🇷🇴', 'hu': '🇭🇺', 'el': '🇬🇷', 'cs': '🇨🇿', 'nl': '🇳🇱', 'sv': '🇸🇪', 'da': '🇩🇰',
    'fi': '🇫🇮', 'he': '🇮🇱', 'hi': '🇮🇳', 'ta': '🇮🇳', 'bn': '🇧🇩', 'no': '🇳🇴', 'sk': '🇸🇰',
    'sr': '🇷🇸', 'lt': '🇱🇹', 'lv': '🇱🇻', 'et': '🇪🇪', 'hr': '🇭🇷', 'sl': '🇸🇮', 'ca': '🇪🇸',
    'eu': '🇪🇸', 'gl': '🇪🇸', 'ga': '🇮🇪'
};

function getCountryFlag(lang) {
    return LANGUAGE_FLAG_MAP[lang] || '';
}

const processMangaList = (mangaData) => {
    if (!mangaData) return [];
    return mangaData.map(manga => {
        const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
        const coverFilename = coverArt ? coverArt.attributes.fileName : null;
        const imgUrl = coverFilename
            ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFilename}.512.jpg`
            : 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';

        return {
            id: manga.id,
            title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
            imgUrl: imgUrl,
        };
    });
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
        // You can add or remove fetchList calls for new sections as needed
        const [latestRes, newRes, featuredRes, recommendedRes, seasonalRes, selfPublishedRes] = await Promise.all([
            fetchList({ updatedAt: 'desc' }),          // Latest Updates
            fetchList({ createdAt: 'desc' }),          // Newly Added
            fetchList({ followedCount: 'desc' }),      // Featured (popular)
            fetchList({ relevance: 'desc' }),          // Recommended (loosely, or adjust as needed)
            fetchList({ year: 'desc' }),               // Seasonal (placeholder, can refine params)
            fetchList({ createdAt: 'desc' })           // Self-Published (placeholder, can refine params)
        ]);

        res.status(200).json({
            featured: processMangaList(featuredRes.data.data),
            seasonal: processMangaList(seasonalRes.data.data),
            "self-published": processMangaList(selfPublishedRes.data.data),
            recommended: processMangaList(recommendedRes.data.data),
            latest: processMangaList(latestRes.data.data),
            newlyAdded: processMangaList(newRes.data.data)
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
