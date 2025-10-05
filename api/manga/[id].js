const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { id } = req.query;
    // UPDATED: New source website
    const siteUrl = `https://weebcentral.com/manga/${id}`;

    const { data } = await axios.get(siteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);

    // UPDATED: New selectors for weebcentral.com
    const title = $('h1[class*="text-2xl"]').text().trim();
    const coverImage = $('img[class*="rounded-md"][alt*="cover image"]').attr('src');
    const description = $('p[class*="text-gray-300"]').first().text().trim();
    
    const genres = [];
    $('div[class*="items-center"] a[href*="/genre/"]').each((i, el) => {
      genres.push($(el).text().trim());
    });

    const chapters = [];
    $('div[class*="col-span-1"] a[href*="/manga/"]').each((i, el) => {
      const chapterId = $(el).attr('href')?.split('/').pop();
      const chapterTitle = $(el).find('div').first().text().trim();
      chapters.push({ chapterTitle, chapterId });
    });

    res.status(200).json({
      id,
      title,
      author: 'N/A', // Author info is not easily available on this site
      status: 'N/A', // Status info is not easily available on this site
      genres,
      description,
      coverImage,
      chapters: chapters.reverse(), // Reverse to show Chapter 1 first
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error scraping manga details.', error: error.message });
  }
};
