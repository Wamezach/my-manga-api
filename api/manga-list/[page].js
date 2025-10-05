const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = 24;
    const offset = (page - 1) * limit;

    // Kitsu paginated manga list
    const response = await axios.get('https://kitsu.io/api/edge/manga', {
      params: {
        'page[limit]': limit,
        'page[offset]': offset,
        'sort': '-updatedAt'
      }
    });

    const mangaList = response.data.data.map(manga => ({
      id: manga.id,
      title: manga.attributes.canonicalTitle,
      imgUrl: manga.attributes.posterImage?.medium || 'https://via.placeholder.com/256?text=No+Cover',
      status: manga.attributes.status,
    }));

    res.status(200).json({
      pagination: [page],
      data: mangaList,
    });

  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch data from Kitsu API.' });
  }
};
