const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  // Allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { id } = req.query; // Get manga ID from the URL path, e.g., /api/manga/your-manga-id
    if (!id) {
      return res.status(400).json({ message: 'Manga ID is required.' });
    }

    const siteUrl = `https://ww8.mangakakalot.tv/manga/${id}`;
    const { data } = await axios.get(siteUrl);
    const $ = cheerio.load(data);

    // Helper function to extract info from the info list
    const getInfoText = (label) => {
        const element = $(`.story-info-right-extent p:contains('${label}')`);
        if (element.length) {
            // Clones the element, removes the label span, and gets the remaining text
            return element.clone().find('span').remove().end().text().trim();
        }
        return 'N/A';
    };
    
    // Extract genres from the list
    const genres = [];
    const genreElements = $(`.story-info-right-extent p:contains('Genres') a`);
    if (genreElements.length) {
        genreElements.each((i, el) => {
            genres.push($(el).text());
        });
    }

    const chapters = [];
    $('.row-content-chapter li').each((i, el) => {
      const chapterLink = $(el).find('a');
      const views = $(el).find('.chapter-view').text().trim();
      const uploaded = $(el).find('.chapter-time').text().trim();

      chapters.push({
        chapterId: chapterLink.attr('href').split('/').pop(),
        title: chapterLink.text(),
        views: views,
        uploaded: uploaded,
      });
    });

    const mangaInfo = {
      id: id,
      title: $('.story-info-right h1').text(),
      imageUrl: $('.story-info-left .info-image img').attr('src'),
      author: getInfoText('Author(s)'),
      status: getInfoText('Status'),
      lastUpdated: getInfoText('Updated'),
      views: getInfoText('View'),
      genres: genres,
      rating: $('.story-info-right-extent .rate-score-number').text() || 'N/A',
      description: $('#panel-story-info-description').text().trim(),
      chapters: chapters, // Chapters are already scraped in correct order (newest first)
    };

    res.status(200).json(mangaInfo);
  } catch (error) {
    console.error(error);
    if (error.response && error.response.status === 404) {
        return res.status(404).json({ message: `Manga with ID '${req.query.id}' not found.` });
    }
    res.status(500).json({ message: 'Error scraping manga info.' });
  }
};
