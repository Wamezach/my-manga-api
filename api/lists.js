const axios = require('axios');

const MANGADEX_API_BASE_URL = 'https://api.mangadex.org';
const ANILIST_API_URL = 'https://graphql.anilist.co';

// Get cover image from AniList by title
const getAniListCover = async (title) => {
    const query = `
        query ($search: String) {
            Media(search: $search, type: MANGA) {
                coverImage {
                    large
                    extraLarge
                    medium
                }
            }
        }
    `;
    const variables = { search: title };
    try {
        const res = await axios.post(ANILIST_API_URL, { query, variables });
        const cover = res.data.data.Media?.coverImage;
        if (cover?.extraLarge) return cover.extraLarge;
        if (cover?.large) return cover.large;
        if (cover?.medium) return cover.medium;
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
        const imgUrl = await getAniListCover(title);
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
