const axios = require('axios');
const KETSU_INFO_URL = 'https://api.ketsu.io/manga/info';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: 'Manga id is required.' });

    const infoRes = await axios.get(`${KETSU_INFO_URL}?id=${id}`);
    const manga = infoRes.data;

    // You could add a field for your frontend to know this is a MangaDex chapter id for reading.
    res.status(200).json({
      id: manga.id,
      title: manga.title,
      author: manga.author || 'Unknown',
      status: manga.status || "",
      genres: manga.genres || [],
      description: manga.synopsis || "",
      coverImage: manga.image,
      chapters: (manga.chapters || []).map(chap => ({
        chapterId: chap.mangaDexId, // Use MangaDex id for reading!
        chapterTitle: chap.title || `Chapter ${chap.number}`,
        // If you need both: store both Ketsu id and MangaDex id
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch manga details from Ketsu.' });
  }
};
