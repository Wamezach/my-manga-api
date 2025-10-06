const axios = require('axios');

const API_BASE_URL = 'https://api.mangadex.org';
const COVER_PROXY_BASE = 'https://my-manga-api.vercel.app/api/image-proxy';

const processMangaList = (mangaData) => {
    if (!mangaData) return [];
    return mangaData.map(manga => {
        const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
        const coverFilename = coverArt ? coverArt.attributes.fileName : null;
        const imgUrl = (coverFilename && manga.id)
            ? `${COVER_PROXY_BASE}?mangaId=${manga.id}&coverFilename=${coverFilename}.512.jpg`
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
            hasAvailableChapters: 'true',
            order: orderParams,
        }
    });
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    try {
        const [trendingRes, latestRes, newRes] = await Promise.all([
            fetchList({ followedCount: 'desc' }),
            fetchList({ updatedAt: 'desc' }),
            fetchList({ createdAt: 'desc' })
        ]);
        res.status(200).json({
            trending: processMangaList(trendingRes.data.data),
            latest: processMangaList(latestRes.data.data),
            newlyAdded: processMangaList(newRes.data.data),
        });
    } catch (error) {
        console.error('MangaDex Lists API Error:', error.response ? error.response.data.errors : error.message);
        res.status(500).json({ message: 'Failed to fetch lists from MangaDex API.' });
    }
}
