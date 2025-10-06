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

    // Fetch MangaDex server info for chapter
    const serverResponse = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/at-home/server/${chapterId}`,
    });

    const { baseUrl, chapter: chapterData } = serverResponse.data;
    const { hash, data: pageFilenames, dataSaver: pageFilenamesDataSaver } = chapterData;

    let pages = pageFilenames && pageFilenames.length > 0 ? pageFilenames : pageFilenamesDataSaver;
    let mode = (pageFilenames && pageFilenames.length > 0) ? 'data' : 'data-saver';

    if (!pages || pages.length === 0) {
      // Always return imageUrls array so frontend does not error
      return res.status(200).json({
        title: 'Manga Chapter',
        chapter: chapterId,
        imageUrls: [],
        message: 'No images found for this chapter.',
      });
    }

    // Use direct MangaDex URLs for reliability
    const imageUrls = pages.map(filename =>
      `${baseUrl}/${mode}/${hash}/${filename}`
    );

    res.status(200).json({
      title: 'Manga Chapter',
      chapter: chapterId,
      imageUrls: imageUrls,
    });

  } catch (error) {
    console.error('MangaDex Chapter API Error:', error.response ? error.response.data.errors : error.message);
    // Always return empty imageUrls array on error for frontend safety
    res.status(200).json({
      title: 'Manga Chapter',
      chapter: req.query.chapterId,
      imageUrls: [],
      message: 'Failed to fetch chapter images from MangaDex API.',
    });
  }
};
