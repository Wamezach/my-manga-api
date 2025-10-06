const axios = require('axios');

module.exports = async (req, res) => {
    const { id, filename } = req.query;
    if (!id || !filename) {
        return res.status(400).send('Missing id or filename');
    }
    const imageUrl = `https://uploads.mangadex.org/covers/${id}/${filename}`;
    try {
        const response = await axios.get(imageUrl, { responseType: 'stream' });
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', response.headers['content-type']);
        // Proxy the image stream directly
        response.data.pipe(res);
    } catch (err) {
        res.status(404).send('Cover not found');
    }
};
