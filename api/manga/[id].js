const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: 'Manga id is required.' });

    // Get manga detail
    const mangaRes = await axios.get(`https://kitsu.io/api/edge/manga/${id}`);
    const manga = mangaRes.data.data;

    // Get chapters for manga
    let chapters = [];
    try {
      const chaptersRes = await axios.get('https://kitsu.io/api/edge/manga-chapters', {
        params: { 'filter[manga]': id, 'page[limit]': 500, 'sort': 'number' }
      });
      chapters = Array.isArray(chaptersRes.data.data)
        ? chaptersRes.data.data.map(chap => ({
            chapterId: chap.id,
            chapterTitle: `Chapter ${chap.attributes.number}` + (chap.attributes.titles?.en ? `: ${chap.attributes.titles.en}` : ''),
            synopsis: chap.attributes.synopsis
          }))
        : [];
    } catch (e) {
      chapters = [];
    }

    res.status(200).json({
      id: manga.id,
      title: manga.attributes.canonicalTitle,
      author: manga.attributes.author || 'Unknown',
      status: manga.attributes.status,
      genres: manga.attributes.categories || [],
      description: manga.attributes.synopsis,
      coverImage: manga.attributes.posterImage?.large || 'https://via.placeholder.com/512?text=No+Cover',
      chapters, // Always an array!
    });

  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch manga details from Kitsu API.' });
  }
};
