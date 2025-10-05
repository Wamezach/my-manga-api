const axios = require('axios');

const API_BASE_URL = 'https://api.mangadex.org';

const getCoverFilename = async (coverId) => {
    try {
        const res = await axios.get(`${API_BASE_URL}/cover/${coverId}`);
        return res.data.data.attributes.fileName;
    } catch (e) {
        return null;
    }
};

const processMangaList = async (mangaData) => {
    if (!mangaData) return [];
    // For each manga, check if coverArt.attributes.fileName exists,
    // else fetch filename from /cover/{id}
    return await Promise.all(mangaData.map(async manga => {
        const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
        let coverFilename = coverArt && coverArt.attributes && coverArt.attributes.fileName
            ? coverArt.attributes.fileName
            : null;

        if (!coverFilename && coverArt && coverArt.id) {
            coverFilename = await getCoverFilename(coverArt.id);
        }

        const imgUrl = coverFilename
            ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFilename}.512.jpg`
            : 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';

        return {
            id: manga.id,
            title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
            imgUrl: imgUrl,
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
        const [trendingRes, latestRes, newRes] = await Promise.all([
            fetchList({ followedCount: 'desc' }),
            fetchList({ updatedAt: 'desc' }),
            fetchList({ createdAt: 'desc' })
        ]);

        // Use async processMangaList
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
        console.error('MangaDex Lists API Error:', error.response ? error.response.data.errors : error.message);
        res.status(500).json({ message: 'Failed to fetch lists from MangaDex API.' });
    }
};
