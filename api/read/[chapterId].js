const axios = require('axios');

const VERCEL_API_URL = 'https://my-manga-api.vercel.app'; // Update with your actual Vercel deployment URL
const API_BASE_URL = 'https://api.mangadex.org';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { chapterId } = req.query;

    if (!chapterId) {
      return res.status(400).json({ message: 'Chapter ID is required from the URL path.', imageUrls: [] });
    }

    let serverResponse;
    try {
      serverResponse = await axios({
        method: 'GET',
        url: `${API_BASE_URL}/at-home/server/${chapterId}`,
      });
    } catch (err) {
      // API error: return empty array but include error message
      return res.status(200).json({
        title: 'Manga Chapter',
        chapter: chapterId,
        imageUrls: [],
        message: err.response?.data?.errors?.[0]?.detail || 'Failed to fetch chapter images from MangaDex API.',
        error: true,
      });
    }

    const chapterData = serverResponse?.data?.chapter || {};
    const hash = chapterData.hash || '';
    const pageFilenames = Array.isArray(chapterData.data) ? chapterData.data : [];
    const pageFilenamesDataSaver = Array.isArray(chapterData.dataSaver) ? chapterData.dataSaver : [];

    let pages = pageFilenames;
    let mode = 'data';

    if (!pages.length) {
      pages = pageFilenamesDataSaver;
      mode = 'data-saver';
    }

    // FINAL: Ensure pages is always an array
    if (!Array.isArray(pages)) {
      pages = [];
    }

    const imageUrls = pages.map(filename =>
      `${VERCEL_API_URL}/api/proxy-cover?id=${chapterId}&filename=${encodeURIComponent(`${mode}/${hash}/${filename}`)}`
    );

    res.status(200).json({
      title: 'Manga Chapter',
      chapter: chapterId,
      imageUrls,
      error: false,
    });

  } catch (error) {
    console.error('MangaDex Chapter API Error:', error.response ? error.response.data.errors : error.message);
    res.status(200).json({
      title: 'Manga Chapter',
      chapter: req.query.chapterId,
      imageUrls: [],
      message: 'Failed to fetch chapter images from MangaDex API.',
      error: true,
    });
  }
};
