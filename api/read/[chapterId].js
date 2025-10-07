const axios = require('axios');
const VERCEL_API_URL = 'https://my-manga-api.vercel.app'; // Change to your deployment URL!
const API_BASE_URL = 'https://api.mangadex.org';

/**
 * Returns proxied image URLs for all pages of a chapter.
 * Also prefers normal quality, but falls back to data-saver if needed.
 * Result image URLs are always proxied through /api/proxy-cover (or /api/proxy-image if you use that).
 * 
 * Example endpoint: /api/chapterId?chapterId=xxxx
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const chapterId = req.query.chapterId || req.query.id || req.query.chapter_id;
    if (!chapterId) {
      return res.status(400).json({ message: 'Chapter ID is required from the URL path.' });
    }

    // Get the server info and page data for this chapter
    const serverResponse = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/at-home/server/${chapterId}`,
    });

    const { baseUrl, chapter: chapterData } = serverResponse.data;
    if (!chapterData) {
      return res.status(404).json({ message: 'No chapter data found for this chapter ID.' });
    }
    const { hash, data: pageFilenames = [], dataSaver: pageFilenamesDataSaver = [] } = chapterData;

    // Prefer normal quality, fallback to data-saver if not available
    let pages = pageFilenames;
    let mode = 'data'; // normal mode
    if (!pages || pages.length === 0) {
      pages = pageFilenamesDataSaver;
      mode = 'data-saver';
    }
    if (!pages) pages = [];

    // Generate the proxy image URLs
    const imageUrls = pages.map(filename =>
      `${VERCEL_API_URL}/api/proxy-cover?src=${encodeURIComponent(`${baseUrl}/${mode}/${hash}/${filename}`)}`
    );

    res.status(200).json({
      title: 'Manga Chapter',
      chapter: chapterId,
      imageUrls: imageUrls,
    });

  } catch (error) {
    console.error('MangaDex Chapter API Error:', error.response ? JSON.stringify(error.response.data) : error.message, error.stack);
    res.status(500).json({
      title: 'Manga Chapter',
      chapter: req.query.chapterId,
      imageUrls: [],
      message: 'Failed to fetch chapter images from MangaDex API.',
      error: error.response ? error.response.data : error.message
    });
  }
};
