require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const { SocksProxyAgent } = require('socks-proxy-agent');
const https = require('https');

// ---------- ТВОЙ SOCKS5 ----------
const SOCKS_PROXY_URL = process.env.SOCKS_PROXY_URL;
const agent = new SocksProxyAgent(SOCKS_PROXY_URL);
// ---------------------------------

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.get('/', (req, res) => res.send('YT Trailer Proxy OK'));


app.get('/search', (req, res) => {
    const q = req.query.q;   // поисковый запрос
    if (!q) return res.status(400).json({ error: 'Missing search query' });

    // yt-dlp может искать на YouTube: ytsearch10:запрос
    // --flat-playlist даёт только список видео без деталей, работает быстро
    const searchQuery = `ytsearch10:${q}`;
    const args = [
        '--proxy', SOCKS_PROXY_URL,
        '--flat-playlist',
        '--dump-single-json',
        '--no-playlist',
        searchQuery
    ];

    console.log(`Searching: ${searchQuery}`);
    const ytProcess = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    ytProcess.stdout.on('data', (data) => { stdout += data; });
    ytProcess.stderr.on('data', (data) => { stderr += data; });

    ytProcess.on('close', (code) => {
        if (code !== 0) {
            console.error('yt-dlp search error:', stderr);
            return res.status(500).json({ error: 'Search failed' });
        }
        try {
            const json = JSON.parse(stdout);
            // Извлекаем нужные поля
            const results = (json.entries || []).map(entry => ({
                id: entry.id || entry.video_id,
                title: entry.title || '',
                channel: entry.channel || entry.uploader || '',
                thumbnail: entry.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${entry.id}/mqdefault.jpg`
            }));
            res.json(results);
        } catch (e) {
            console.error('Failed to parse search results:', e);
            res.status(500).json({ error: 'Invalid search results' });
        }
    });
});

// ---------- Стриминг видео ----------
app.get('/stream', (req, res) => {
    const videoId = req.query.videoId;
    const quality = req.query.quality || 'auto';

    if (!videoId) return res.status(400).send('Missing videoId');

    let format;
    switch (quality) {
        case '2160p': format = 'bestvideo[height<=2160]+bestaudio/best[height<=2160]'; break;
        case '1440p': format = 'bestvideo[height<=1440]+bestaudio/best[height<=1440]'; break;
        case '1080p': format = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]'; break;
        case '720p':  format = 'bestvideo[height<=720]+bestaudio/best[height<=720]';   break;
        case '480p':  format = 'bestvideo[height<=480]+bestaudio/best[height<=480]';   break;
        case '360p':  format = 'bestvideo[height<=360]+bestaudio/best[height<=360]';   break;
        default:      format = 'bestvideo+bestaudio/best';
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
        '--proxy', SOCKS_PROXY_URL,
        '-f', format,
        '-o', '-',
        '--no-playlist',
        youtubeUrl
    ];

    console.log(`Streaming ${youtubeUrl} (quality: ${quality})`);
    const ytProcess = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    res.writeHead(200, { 'Content-Type': 'video/mp4' });
    ytProcess.stdout.pipe(res);
    ytProcess.stderr.on('data', (data) => console.error(`yt-dlp: ${data}`));
    ytProcess.on('close', (code) => {
        console.log(`yt-dlp exited with code ${code}`);
        if (code !== 0 && !res.headersSent) res.status(500).send('Failed to stream video');
        else if (code !== 0) res.end();
    });
});

// ---------- Превью (прокси) ----------
app.get('/thumbnail', (req, res) => {
    const videoId = req.query.videoId;
    const size = req.query.size || 'mq';

    if (!videoId) return res.status(400).send('Missing videoId');

    const options = {
        hostname: 'i.ytimg.com',
        path: `/vi/${videoId}/${size}default.jpg`,
        method: 'GET',
        agent: agent,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    };

    console.log(`Proxying thumbnail: https://i.ytimg.com/vi/${videoId}/${size}default.jpg`);
    const thumbReq = https.request(options, (thumbRes) => {
        res.writeHead(thumbRes.statusCode, {
            'Content-Type': thumbRes.headers['content-type'] || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400'
        });
        thumbRes.pipe(res);
    });

    thumbReq.on('error', (err) => {
        console.error('Thumbnail proxy error:', err);
        res.status(500).send('Error fetching thumbnail');
    });

    thumbReq.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Proxy running on port ${PORT}`));
