const axios = require('axios');

module.exports = async (req, res) => {
  const { baseUrl, mode, hash, filename } = req.query;
  if (!baseUrl || !mode || !hash || !filename) {
    return res.status(400).send('Missing required image parameters');
  }
  const imageUrl = `${baseUrl}/${mode}/${hash}/${filename}`;
  try {
    const response = await axios.get(imageUrl, { responseType: 'stream' });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers['content-type']);
    response.data.pipe(res);
  } catch (err) {
    res.status(404).send('Chapter page not found');
  }
};
