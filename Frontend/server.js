import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy sitemap-profiles.xml to backend
app.use('/sitemap-profiles.xml', createProxyMiddleware({
  target: 'https://rankbaaz.onrender.com/sitemap-profiles.xml',
  changeOrigin: true,
  pathRewrite: {
    '^/sitemap-profiles.xml': '/sitemap-profiles.xml'
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['content-type'] = 'application/xml; charset=utf-8';
    proxyRes.headers['cache-control'] = 'public, max-age=3600';
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Error fetching sitemap');
  },
  logLevel: 'warn'
}));

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// ✅ FIXED: Use middleware instead of app.get() for catch-all
app.use((req, res, next) => {
  // If the request is not for a file and not already handled, serve index.html
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Sitemap proxy: http://localhost:${PORT}/sitemap-profiles.xml`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});
