const axios = require('axios');

const API_BASE_URL = 'https://api.mangadex.org';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { chapterId } = req.query;

    if (!chapterId) {
      return res.status(400).json({ message: 'Chapter ID is required from the URL path.' });
    }

    const serverResponse = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/at-home/server/${chapterId}`,
    });

    const { baseUrl, chapter: chapterData } = serverResponse.data;
    const { hash, data: pageFilenames, dataSaver: pageFilenamesDataSaver } = chapterData;

    // --- INTELLIGENT FALLBACK LOGIC ---
    let pages = pageFilenames;
    let mode = 'data';

    // If the high-quality 'data' list is empty, use the 'dataSaver' list instead.
    if (!pages || pages.length === 0) {
      pages = pageFilenamesDataSaver;
      mode = 'data-saver';
    }
    // --- END OF FALLBACK LOGIC ---

    const imageUrls = pages.map(filename => {
      return `${baseUrl}/${mode}/${hash}/${filename}`;
    });

    res.status(200).json({
      title: 'Manga Chapter',
      chapter: chapterId,
      imageUrls: imageUrls,
    });

  } catch (error) {
    console.error('MangaDex Chapter API Error:', error.response ? error.response.data.errors : error.message);
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ message: 'Chapter not found on MangaDex.' });
    }
    res.status(500).json({ message: 'Failed to fetch chapter images from MangaDex API.' });
  }
};
