const axios = require('axios');

module.exports = async (req, res) => {
    const { id, filename } = req.query;
    if (!id || !filename) {
        return res.status(400).send('Missing id or filename');
    }

    let imageUrl;

    // If filename includes a slash, it's a chapter image (data/data-saver)
    if (filename.includes('/')) {
        // Chapter image (ignore id, construct full path from filename)
        imageUrl = `https://uploads.mangadex.org/${filename}`;
    } else {
        // Cover image
        imageUrl = `https://uploads.mangadex.org/covers/${id}/${filename}`;
    }

    try {
        const response = await axios.get(imageUrl, { responseType: 'stream' });
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
        response.data.pipe(res);
    } catch (err) {
        res.status(404).send('Image not found');
    }
};
