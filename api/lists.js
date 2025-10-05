const axios = require('axios');

const MANGADEX_API_BASE_URL = 'https://api.mangadex.org';
const KITSU_API_BASE_URL = 'https://kitsu.io/api/edge/manga';

// Get cover image from Kitsu by title
const getExternalCover = async (title) => {
    try {
        const res = await axios.get(KITSU_API_BASE_URL, {
            params: { 'filter[text]': title }
        });
        if (res.data.data.length > 0 && res.data.data[0].attributes.posterImage) {
            // Use the original or large poster image
            return res.data.data[0].attributes.posterImage.original || res.data.data[0].attributes.posterImage.large;
        }
    } catch (e) {
        // Optionally log error
    }
    // Fallback placeholder
    return 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';
};

const processMangaList = async (mangaData) => {
    if (!mangaData) return [];
    return await Promise.all(mangaData.map(async manga => {
        const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0];
        const imgUrl = await getExternalCover(title);
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
