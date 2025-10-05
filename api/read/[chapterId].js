const axios = require('axios');
const MANGADEX_BASE_URL = 'https://api.mangadex.org';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { chapterId } = req.query;
    if (!chapterId) return res.status(400).json({ message: 'Chapter ID is required.' });

    const serverResponse = await axios({
      method: 'GET',
      url: `${MANGADEX_BASE_URL}/at-home/server/${chapterId}`,
    });

    const { baseUrl, chapter: chapterData } = serverResponse.data;
    const { hash, data: pageFilenames, dataSaver: pageFilenamesDataSaver } = chapterData;

    let pages = pageFilenames;
    let mode = 'data';

    if (!pages || pages.length === 0) {
      pages = pageFilenamesDataSaver;
      mode = 'data-saver';
    }
    if (!pages) pages = [];

    const imageUrls = pages.map(filename => `${baseUrl}/${mode}/${hash}/${filename}`);

    res.status(200).json({
      title: 'Manga Chapter',
      chapter: chapterId,
      imageUrls: imageUrls,
    });

  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch chapter images from MangaDex.' });
  }
};
