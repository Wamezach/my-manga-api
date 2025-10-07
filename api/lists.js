const axios = require('axios');

const VERCEL_API_URL = 'https://my-manga-api.vercel.app'; // <-- Update this to your deployed API URL!
const API_BASE_URL = 'https://api.mangadex.org';

// Helper to get proxy URL for a cover image (always absolute)
function getProxyCoverUrl(mangaId, fileName) {
    return `${VERCEL_API_URL}/api/proxy-cover?src=${encodeURIComponent(`https://uploads.mangadex.org/covers/${mangaId}/${fileName}.512.jpg`)}`;
}

const processMangaList = (mangaData) => {
    if (!mangaData) return [];
    return mangaData.map(manga => {
        const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
        const coverFilename = coverArt ? coverArt.attributes.fileName : null;
        const imgUrl = coverFilename
            ? getProxyCoverUrl(manga.id, coverFilename)
            : `${VERCEL_API_URL}/api/proxy-cover?src=https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover`;

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
            hasAvailableChapters: 'true',
            order: orderParams,
        }
    });
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        const [latestRes, newRes, featuredRes, recommendedRes, seasonalRes, selfPublishedRes] = await Promise.all([
            fetchList({ updatedAt: 'desc' }),
            fetchList({ createdAt: 'desc' }),
            fetchList({ followedCount: 'desc' }),
            fetchList({ relevance: 'desc' }),
            fetchList({ year: 'desc' }),
            fetchList({ createdAt: 'desc' })
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
