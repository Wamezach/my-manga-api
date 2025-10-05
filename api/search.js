const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Search query is required.' });

    const response = await axios.get('https://kitsu.io/api/edge/manga', {
      params: { 'filter[text]': q, 'page[limit]': 20 }
    });

    const mangaList = response.data.data.map(manga => ({
      id: manga.id,
      title: manga.attributes.canonicalTitle,
      imgUrl: manga.attributes.posterImage?.medium || 'https://via.placeholder.com/256?text=No+Cover',
      synopsis: manga.attributes.synopsis,
      status: manga.attributes.status,
    }));

    res.status(200).json({ data: mangaList });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch search results from Kitsu API.' });
  }
};
