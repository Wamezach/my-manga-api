const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  // Allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { page = '1' } = req.query; // Default to page 1 if not provided

    const siteUrl = `https://mangakakalot.tv/manga_list?type=latest&category=all&state=all&page=${page}`;
    
    // Make the request with the User-Agent header
    const { data } = await axios.get(siteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);

    // --- Scrape Manga Data ---
    const mangaList = [];
    // UPDATED SELECTOR: The class name has changed from '.list-truyen-item-wrap' to '.item'
    $('.item').each((i, el) => {
      const titleElement = $(el).find('h3 a');
      // UPDATED SELECTOR: The chapter link is now inside an 'em' tag
      const latestChapterElement = $(el).find('em a');
      const imgElement = $(el).find('img');
      
      // The description is no longer in a tooltip, so we can't scrape it from this page.
      const description = 'No description available on this page.';

      mangaList.push({
        id: titleElement.attr('href')?.split('/').pop() || '',
        title: titleElement.text(),
        imgUrl: imgElement.attr('src'),
        latestChapter: latestChapterElement.text(),
        description: description,
      });
    });

    // --- Scrape Pagination ---
    const pagination = [];
    $('.panel_page_number .page-item a.page-link').each((i, el) => {
        const pageNum = $(el).text();
        if (!isNaN(pageNum)) {
            pagination.push(parseInt(pageNum, 10));
        }
    });

    const firstPage = $('.page-item a[aria-label="First"]')?.attr('href')?.split('page=')[1] || '1';
    const lastPage = $('.page-item a[aria-label="Last"]')?.attr('href')?.split('page=')[1] || (pagination.length > 0 ? Math.max(...pagination).toString() : '1');

    const finalPagination = [
        parseInt(firstPage, 10),
        ...pagination,
        parseInt(lastPage, 10)
    ].filter((v, i, a) => a.indexOf(v) === i).sort((a,b) => a-b);


    res.status(200).json({
      pagination: finalPagination,
      data: mangaList,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error scraping manga list.' });
  }
};
