const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();

// Allow requests from any origin
app.use(cors());

// Define the API endpoint to get popular manga
app.get('/api/popular', async (req, res) => {
  try {
    const siteUrl = 'https://ww8.mangakakalot.tv/';
    const { data } = await axios.get(siteUrl);
    const $ = cheerio.load(data);
    
    const popularManga = [];
    $('.item', '.owl-carousel').each((i, el) => {
      popularManga.push({
        title: $(el).find('h3 a').text(),
        id: $(el).find('h3 a').attr('href').split('/').pop(),
        image: $(el).find('img').attr('src'),
      });
    });
    res.json(popularManga);
  } catch (error) {
    res.status(500).json({ message: 'Failed to scrape popular manga.' });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;