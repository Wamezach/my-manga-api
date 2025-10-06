const axios = require('axios');

const VERCEL_API_URL = 'https://my-manga-api.vercel.app'; // replace with your actual Vercel URL
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

    let pages = pageFilenames;
    let mode = 'data';

    if (!pages || pages.length === 0) {
      pages = pageFilenamesDataSaver;
      mode = 'data-saver';
    }

    if (!pages) {
      pages = [];
    }

    // Return proxy URLs for each image
    const imageUrls = pages.map(filename => 
      `${VERCEL_API_URL}/api/proxy-cover?baseUrl=${encodeURIComponent(baseUrl)}&mode=${encodeURIComponent(mode)}&hash=${encodeURIComponent(hash)}&filename=${encodeURIComponent(filename)}`
    );

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
