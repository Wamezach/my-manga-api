const axios = require('axios');
const { URLSearchParams } = require('url');

const API_BASE_URL = 'https://api.mangadex.org';

// Helper function to process the API response into our simple format
const processMangaList = (mangaData) => {
    return mangaData.map(manga => {
        const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
        const coverFilename = coverArt ? coverArt.attributes.fileName : null;
        const imgUrl = coverFilename
            ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFilename}.512.jpg` // Use higher quality images
            : 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';

        return {
            id: manga.id,
            title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
            imgUrl: imgUrl,
            description: manga.attributes.description.en || '',
        };
    });
};

// Helper function to fetch a specific list from MangaDex
const fetchList = (order) => {
    const params = new URLSearchParams({
        limit: 15, // Get 15 items for the carousel
        'includes[]': 'cover_art',
        'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'], // Include all ratings as requested
    });
    // Add the order parameter
    for (const key in order) {
        params.append(`order[${key}]`, order[key]);
    }

    return axios.get(`${API_BASE_URL}/manga?${params.toString()}`);
};


module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        // Use Promise.all to run all three requests in parallel for speed
        const [trendingRes, latestRes, newRes] = await Promise.all([
            fetchList({ followedCount: 'desc' }), // Trending manga
            fetchList({ updatedAt: 'desc' }),     // Latest updates
            fetchList({ createdAt: 'desc' })      // Newly created manga
        ]);

        res.status(200).json({
            trending: processMangaList(trendingRes.data.data),
            latest: processMangaList(latestRes.data.data),
            newlyAdded: processMangaList(newRes.data.data),
        });

    } catch (error) {
        console.error('MangaDex Lists API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Failed to fetch lists from MangaDex API.' });
    }
};
