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

// Fetch all chapters for a manga using pagination
async function fetchAllChapters(mangaId) {
    let allChapters = [];
    let offset = 0;
    const limit = 500;
    let more = true;
    while (more) {
        const { data } = await axios.get(`${API_BASE_URL}/manga/${mangaId}/feed`, {
            params: {
                limit,
                offset,
                order: { chapter: 'asc' }
            }
        });
        allChapters = allChapters.concat(data.data);
        offset += data.data.length;
        more = data.data.length === limit;
    }
    return allChapters;
}

// Get all language flags for a manga (fetching all chapters)
async function getAvailableFlagsForManga(mangaId) {
    try {
        const chapters = await fetchAllChapters(mangaId);
        const chapterLanguages = chapters
            .map(chap => chap.attributes.translatedLanguage)
            .filter((v, i, arr) => arr.indexOf(v) === i);
        return chapterLanguages.map(getCountryFlag).filter(Boolean);
    } catch (e) {
        return [];
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        const { id } = req.query;

        // Fetch manga details
        const mangaRes = await axios.get(`${API_BASE_URL}/manga/${id}`, {
            params: { 'includes[]': ['cover_art', 'author'] }
        });
        const manga = mangaRes.data.data;

        // Fetch all chapters for this manga (pagination)
        const chaptersRaw = await fetchAllChapters(id);

        // Group chapters by chapter number (string)
        const chaptersByNumber = {};
        chaptersRaw.forEach(chap => {
            const chapNum = chap.attributes.chapter;
            if (!chapNum) return;
            if (!chaptersByNumber[chapNum]) chaptersByNumber[chapNum] = [];
            chaptersByNumber[chapNum].push(chap);
        });

        // For each chapter, collect all language/country variants and flags
        const chapters = Object.keys(chaptersByNumber)
            .sort((a, b) => {
                const na = parseFloat(a);
                const nb = parseFloat(b);
                if (!isNaN(na) && !isNaN(nb)) return na - nb;
                if (!isNaN(na)) return -1;
                if (!isNaN(nb)) return 1;
                return a.localeCompare(b);
            })
            .map(chapNum => {
                const group = chaptersByNumber[chapNum];
                const allAlternatives = group
                    .sort((a, b) => {
                        const la = (a.attributes.translatedLanguage || '').toLowerCase();
                        const lb = (b.attributes.translatedLanguage || '').toLowerCase();
                        if (la.startsWith('en') && !lb.startsWith('en')) return -1;
                        if (!la.startsWith('en') && lb.startsWith('en')) return 1;
                        return la.localeCompare(lb);
                    })
                    .map(chap => {
                        const lang = (chap.attributes.translatedLanguage || '').toLowerCase();
                        return {
                            chapterId: chap.id,
                            chapterTitle: chap.attributes.chapter
                                ? (chap.attributes.title
                                    ? `Chapter ${chap.attributes.chapter}: ${chap.attributes.title}`
                                    : `Chapter ${chap.attributes.chapter}`)
                                : 'Untitled',
                            translatedLanguage: lang,
                            flag: getCountryFlag(lang),
                            groupName: chap.relationships.find(rel => rel.type === 'scanlation_group')?.attributes?.name || '',
                            uploader: chap.relationships.find(rel => rel.type === 'user')?.attributes?.username || ''
                        };
                    });

                // For frontend: availableCountries is a summary, alternatives is the detailed list
                const availableCountries = allAlternatives.map(a => ({
                    code: a.translatedLanguage,
                    flag: a.flag
                }));

                return {
                    chapterNumber: chapNum,
                    availableCountries,
                    alternatives: allAlternatives
                };
            });

        // Cover/author logic unchanged
        const author = manga.relationships.find(rel => rel.type === 'author')?.attributes?.name || 'Unknown';
        const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
        const coverFilename = coverArt ? coverArt.attributes.fileName : null;
        const coverImage = coverFilename
            ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFilename}.512.jpg`
            : 'https://via.placeholder.com/512/1f2937/d1d5db.png?text=No+Cover';

        // Get all language flags for this manga
        const flags = await getAvailableFlagsForManga(id);

        res.status(200).json({
            id: manga.id,
            title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
            author: author,
            status: manga.attributes.status,
            genres: manga.attributes.tags.filter(tag => tag.attributes.group === 'genre').map(tag => tag.attributes.name.en),
            description: manga.attributes.description.en || 'No description available.',
            coverImage: coverImage,
            flags: flags,
            chapters: chapters,
        });

    } catch (error) {
        console.error('MangaDex API Error:', error.response ? JSON.stringify(error.response.data) : error.message);
        res.status(500).json({ message: 'Failed to fetch manga details from MangaDex API.' });
    }
};
