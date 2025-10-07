const axios = require('axios');

const API_BASE_URL = 'https://api.mangadex.org';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { id } = req.query;

    // --- Get Manga Details ---
    const mangaResponse = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/manga/${id}`,
      params: {
        'includes[]': ['cover_art', 'author'],
      },
    });

    const manga = mangaResponse.data.data;

    // --- Get Chapter List ---
    const chapterResponse = await axios({
        method: 'GET',
        url: `${API_BASE_URL}/manga/${id}/feed`,
        params: {
            limit: 500, // Get up to 500 chapters
            order: { chapter: 'asc' }, // Order by chapter number, ascending
            'translatedLanguage[]': ['en'] // Only get English chapters
        }
    });

    // --- Process the Data ---
    const author = manga.relationships.find(rel => rel.type === 'author')?.attributes.name || 'Unknown';
    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    const coverImage = `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}`;
    
    const chapters = chapterResponse.data.data.map(chap => ({
        chapterId: chap.id,
        chapterTitle: `Chapter ${chap.attributes.chapter}` + (chap.attributes.title ? `: ${chap.attributes.title}`: '')
    }));

    res.status(200).json({
      id: manga.id,
      title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
      author: author,
      status: manga.attributes.status,
      genres: manga.attributes.tags.filter(tag => tag.attributes.group === 'genre').map(tag => tag.attributes.name.en),
      description: manga.attributes.description.en || 'No description available.',
      coverImage: coverImage,
      chapters: chapters,
    });

  } catch (error) {
    console.error('MangaDex API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Failed to fetch manga details from MangaDex API.' });
  }
};
