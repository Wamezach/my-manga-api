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

    const serverResponse = await axios({
      method: 'GET',
      url: `${API_BASE_URL}/at-home/server/${chapterId}`,
    });

    const { baseUrl, chapter: chapterData } = serverResponse.data;
    const hash = chapterData?.hash;
    const pageFilenames = chapterData?.data || [];
    const pageFilenamesDataSaver = chapterData?.dataSaver || [];

    let pages = pageFilenames;
    let mode = 'data';

    // If the high-quality 'data' list is empty or doesn't exist, try the 'data-saver' list.
    if (!pages || pages.length === 0) {
      pages = pageFilenamesDataSaver;
      mode = 'data-saver';
    }

    // If BOTH lists are empty, set to empty array
    if (!pages || !Array.isArray(pages)) {
      pages = [];
    }

    // Use proxy for chapter images
    const imageUrls = Array.isArray(pages)
      ? pages.map(filename => `${VERCEL_API_URL}/api/proxy-cover?id=${chapterId}&filename=${encodeURIComponent(`${mode}/${hash}/${filename}`)}`)
      : [];

    res.status(200).json({
      title: 'Manga Chapter',
      chapter: chapterId,
      imageUrls: imageUrls,
    });

  } catch (error) {
    console.error('MangaDex Chapter API Error:', error.response ? error.response.data.errors : error.message);
    // Always return imageUrls array (even empty) for frontend safety
    res.status(200).json({
      title: 'Manga Chapter',
      chapter: req.query.chapterId,
      imageUrls: [],
      message: 'Failed to fetch chapter images from MangaDex API.',
    });
  }
};
