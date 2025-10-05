const axios = require('axios');

const API_BASE_URL = 'https://api.mangadex.org';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    // The 'id' is the manga ID, and 'chapter' is the chapter ID from the URL
    // e.g., /api/read/MANGA_ID/CHAPTER_ID
    const { chapter: chapterId } = req.query;

    if (!chapterId) {
      return res.status(400).json({ message: 'Chapter ID is required from the URL path.' });
    }

    // --- Get the MangaDex server URL for the chapter images ---
    const serverResponse = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/at-home/server/${chapterId}`,
    });

    const { baseUrl, chapter: chapterData } = serverResponse.data;
    const { hash, data: pageFilenames, dataSaver: pageFilenamesDataSaver } = chapterData;

    // --- Construct the full URL for each page image ---
    const imageUrls = pageFilenames.map(filename => {
      // The final URL is a combination of the base URL, 'data' mode, the hash, and the filename
      return `${baseUrl}/data/${hash}/${filename}`;
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
