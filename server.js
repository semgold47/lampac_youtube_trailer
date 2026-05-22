const express = require('express');
const { spawn } = require('child_process');
const { SocksProxyAgent } = require('socks-proxy-agent');
const https = require('https');

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

// Стриминг видео (через yt-dlp) — socks5_url передаётся как query-параметр
app.get('/stream', (req, res) => {
    const videoId = req.query.videoId;
    const socks5 = req.query.socks5;   // ← приходит из плагина

    if (!videoId) return res.status(400).send('Missing videoId');
    if (!socks5) return res.status(400).send('Missing socks5 proxy');

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
        '--proxy', socks5,
        '-f', 'bestvideo+bestaudio/best',
        '-o', '-',
        '--no-playlist',
        youtubeUrl
    ];

    console.log(`Streaming ${youtubeUrl} via ${socks5}`);

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

// Проксирование превьюшек — socks5_url тоже через query
app.get('/thumbnail', (req, res) => {
    const videoId = req.query.videoId;
    const size = req.query.size || 'mq';
    const socks5 = req.query.socks5;

    if (!videoId) return res.status(400).send('Missing videoId');
    if (!socks5) return res.status(400).send('Missing socks5 proxy');

    const options = {
        hostname: 'i.ytimg.com',
        path: `/vi/${videoId}/${size}default.jpg`,
        method: 'GET',
        agent: new SocksProxyAgent(socks5),   // ← создаётся под каждый запрос
        headers: { 'User-Agent': 'Mozilla/5.0' }
    };

    console.log(`Proxying thumbnail: https://i.ytimg.com/vi/${videoId}/${size}default.jpg via ${socks5}`);

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
