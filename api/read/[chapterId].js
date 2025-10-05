const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { chapterId } = req.query;
    if (!chapterId) return res.status(400).json({ message: 'Chapter ID is required.' });

    // Get chapter details from Kitsu
    const chapterRes = await axios.get(`https://kitsu.io/api/edge/manga-chapters/${chapterId}`);
    const chapter = chapterRes.data.data;

    res.status(200).json({
      title: chapter.attributes.titles?.en || chapter.attributes.titles?.canonical || `Chapter ${chapter.attributes.number}`,
      chapterId: chapter.id,
      synopsis: chapter.attributes.synopsis,
      // No scan images available with Kitsu, so only metadata is returned.
      imageUrls: []
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch chapter details from Kitsu API.' });
  }
};
