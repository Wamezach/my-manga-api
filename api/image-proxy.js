const axios = require('axios');

export default async function handler(req, res) {
  const { mangaId, coverFilename } = req.query;
  if (!mangaId || !coverFilename) {
    return res.status(400).json({ message: 'Missing parameters.' });
  }
  const url = `https://uploads.mangadex.org/covers/${mangaId}/${coverFilename}`;
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch image.' });
  }
}
