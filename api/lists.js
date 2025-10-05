const axios = require('axios');

const MANGADEX_API_BASE_URL = 'https://api.mangadex.org';

// Get cover image from DuckDuckGo by title
const getDuckDuckGoImage = async (title) => {
    try {
        const res = await axios.get('https://api.duckduckgo.com/', {
            params: {
                q: `${title} manga`,
                format: 'json',
                no_redirect: 1,
                no_html: 1,
                skip_disambig: 1
            }
        });
        // DuckDuckGo sometimes returns empty for manga, fallback if missing
        if (res.data.Image && res.data.Image !== "") return res.data.Image;
    } catch (e) {
        // Optionally log error
    }
    return 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';
};

const processMangaList = async (mangaData) => {
    if (!mangaData) return [];
    return await Promise.all(mangaData.map(async manga => {
        const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0];
        const imgUrl = await getDuckDuckGoImage(title);
        return {
            id: manga.id,
            title,
            imgUrl,
            mangaDexUrl: `https://mangadex.org/title/${manga.id}`,
        };
    }));
};

const fetchList = (orderParams) => {
    return axios({
        method: 'GET',
        url: `${MANGADEX_API_BASE_URL}/manga`,
        params: {
            limit: 15,
            hasAvailableChapters: 'true', // Only manga available for reading!
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

        // Use async processMangaList for external covers
        const [trending, latest, newlyAdded] = await Promise.all([
            processMangaList(trendingRes.data.data),
            processMangaList(latestRes.data.data),
            processMangaList(newRes.data.data),
        ]);

        res.status(200).json({
            trending,
            latest,
            newlyAdded,
        });

    } catch (error) {
        console.error('Lists API Error:', error.message);
        res.status(500).json({ message: 'Failed to fetch lists.' });
    }
};
