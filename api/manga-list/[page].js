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
    const { data } = await axios.get(siteUrl);
    const $ = cheerio.load(data);

    // --- Scrape Manga Data ---
    const mangaList = [];
    $('.list-truyen-item-wrap').each((i, el) => {
      const titleElement = $(el).find('h3 a');
      const latestChapterElement = $(el).find('.list-story-item-wrap-chapter');
      const description = $(el).attr('data-tip'); // The description is in a tooltip attribute
      
      // Basic cleaning of the description HTML
      const cleanedDescription = description 
        ? cheerio.load(description).text().replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim() 
        : 'No description available.';

      mangaList.push({
        id: titleElement.attr('href').split('/').pop(),
        title: titleElement.text(),
        imgUrl: $(el).find('img').attr('src'),
        latestChapter: latestChapterElement.text(),
        description: cleanedDescription,
      });
    });

    // --- Scrape Pagination ---
    const pagination = [];
    $('.panel_page_number .page-item a.page-link').each((i, el) => {
        const pageNum = $(el).text();
        // The site uses '...' for gaps, we only want numbers
        if (!isNaN(pageNum)) {
            pagination.push(parseInt(pageNum, 10));
        }
    });

    // The site doesn't always show the first/last page numbers in the main links
    // We can extract them from the 'First' and 'Last' buttons if they exist
    const firstPage = $('.page-item a[aria-label="First"]')?.attr('href')?.split('page=')[1] || '1';
    const lastPage = $('.page-item a[aria-label="Last"]')?.attr('href')?.split('page=')[1] || (pagination.length > 0 ? Math.max(...pagination).toString() : '1');

    const finalPagination = [
        parseInt(firstPage, 10),
        ...pagination,
        parseInt(lastPage, 10)
    ].filter((v, i, a) => a.indexOf(v) === i).sort((a,b) => a-b); // Unique and sorted


    res.status(200).json({
      pagination: finalPagination,
      data: mangaList,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error scraping manga list.' });
  }
};
