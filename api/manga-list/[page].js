const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { page = '1' } = req.query;
    // UPDATED: New source website
    const siteUrl = `https://weebcentral.com/updates?page=${page}`;

    const { data } = await axios.get(siteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const mangaList = [];

    // UPDATED: New selectors for weebcentral.com
    $('div[class*="col-span-1"]').each((i, el) => {
      const titleElement = $(el).find('a[class*="text-white"]');
      const latestChapterElement = $(el).find('a[class*="text-gray-300"]');
      const imgElement = $(el).find('img');
      
      const mangaId = titleElement.attr('href')?.split('/').pop();
      const title = titleElement.text().trim();
      const imgUrl = imgElement.attr('src');
      const latestChapter = latestChapterElement.text().trim();

      if (mangaId && title && imgUrl) {
          mangaList.push({
            id: mangaId,
            title: title,
            imgUrl: imgUrl,
            latestChapter: latestChapter,
            description: '', // Description is not available on the list page
          });
      }
    });

    if (mangaList.length === 0) {
        return res.status(404).json({ message: 'No manga found on the page. The website structure may have changed.' });
    }

    res.status(200).json({
      // Pagination logic can be simplified as we're not scraping it from this site
      pagination: [parseInt(page, 10)],
      data: mangaList,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error scraping manga list.', error: error.message });
  }
};
