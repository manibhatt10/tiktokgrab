const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * POST /api/info
 * Accepts { url } and returns video metadata from tikwm.com
 */
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Please provide a TikTok URL' });
    }

    // Validate TikTok URL pattern
    const tiktokPattern = /tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com/i;
    if (!tiktokPattern.test(url)) {
      return res.status(400).json({ error: 'Please enter a valid TikTok URL' });
    }

    // Call tikwm.com API
    const response = await axios.post('https://www.tikwm.com/api/', null, {
      params: {
        url: url,
        hd: 1, // Request HD quality
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    const data = response.data;

    if (data.code !== 0 || !data.data) {
      return res.status(400).json({ error: 'Could not fetch video info. Please check the URL and try again.' });
    }

    const video = data.data;

    // Prefer HD play URL, fall back to regular
    const hdUrl = video.hdplay || video.play;
    const sdUrl = video.play || video.wmplay;

    const result = {
      id: video.id,
      title: video.title || 'TikTok Video',
      author: {
        name: video.author?.nickname || video.author?.unique_id || 'Unknown',
        username: video.author?.unique_id || '',
        avatar: video.author?.avatar || '',
      },
      stats: {
        plays: video.play_count || 0,
        likes: video.digg_count || 0,
        comments: video.comment_count || 0,
        shares: video.share_count || 0,
      },
      duration: video.duration || 0,
      thumbnail: video.cover || video.origin_cover || '',
      music: video.music || '',
      musicTitle: video.music_info?.title || '',
      hdUrl: hdUrl,
      sdUrl: sdUrl,
      isHD: !!video.hdplay,
    };

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error fetching video info:', err.message);
    res.status(500).json({ error: 'Failed to fetch video information. Please try again.' });
  }
});

/**
 * GET /api/download
 * Proxies the video download to avoid CORS issues
 */
app.get('/api/download', async (req, res) => {
  try {
    const { url, filename } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'No video URL provided' });
    }

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
      },
      timeout: 60000,
    });

    const safeName = (filename || 'tiktok_video').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.mp4"`);

    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    response.data.pipe(res);
  } catch (err) {
    console.error('Error downloading video:', err.message);
    res.status(500).json({ error: 'Failed to download video. Please try again.' });
  }
});

// Fallback: serve index.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 TikTok Downloader running at http://localhost:${PORT}`);
});
