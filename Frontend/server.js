import express from 'express';
import fetch from 'node-fetch';

const app = express();

// Serve built frontend
app.use(express.static('dist'));

// Proxy sitemap
app.get('/sitemap-profiles.xml', async (req, res) => {
  try {
    const response = await fetch('https://rankbaaz.onrender.com/sitemap-profiles.xml');
    const body = await response.text();
    res.header('Content-Type', 'application/xml');
    res.send(body);
  } catch (err) {
    res.status(500).send('Error fetching sitemap');
  }
});

app.listen(3000, () => console.log('Server running on 3000'));
