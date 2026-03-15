const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.static(__dirname));

const tempDir = path.join(os.tmpdir(), 'video-downloader');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

setInterval(() => {
    fs.readdir(tempDir, (err, files) => {
        if (err) return;
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            const now = new Date().getTime();
            const fileTime = stats.mtime.getTime();
            const fileAge = now - fileTime; 
            
            if (fileAge > 3600000) {
                fs.unlink(filePath, () => {});
            }
        });
    });
}, 600000); 

app.post('/api/download', async (req, res) => {
    try {
        const { url, title } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const sanitized = (title || 'video')
            .replace(/[<>:"/\\|?*]+/g, '_')
            .substring(0, 50);
        
        const outputPath = path.join(tempDir, `${sanitized}_%(id)s.%(ext)s`);
        
        const command = `yt-dlp -f best -o "${outputPath}" "${url}" 2>&1`;

        exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('Download error:', error);
                return res.status(400).json({ 
                    error: 'Failed to download video. Make sure url is valid and public.',
                    details: stderr || error.message
                });
            }

            const files = fs.readdirSync(tempDir);
            const videoFile = files.find(f => f.includes(sanitized));

            if (!videoFile) {
                return res.status(400).json({ error: 'Video file not found after download' });
            }

            const filePath = path.join(tempDir, videoFile);
            
            res.download(filePath, `${sanitized}.mp4`, (err) => {
                if (err) console.error('Download send error:', err);
                setTimeout(() => {
                    fs.unlink(filePath, () => {});
                }, 5000);
            });
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

app.get('/api/check-setup', (req, res) => {
    exec('yt-dlp --version', (error, stdout) => {
        if (error) {
            return res.json({ 
                installed: false, 
                message: 'yt-dlp not found. Run: brew install yt-dlp (macOS) or pip install yt-dlp (Windows/Linux)' 
            });
        }
        res.json({ 
            installed: true, 
            version: stdout.trim(),
            message: 'yt-dlp is ready' 
        });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎥 Video Downloader Server Running`);
    console.log(`📍 Open: http://0.0.0.0:${PORT}`);
    console.log(`\n✨ Features: YouTube, Instagram, Facebook, TikTok, Twitter, and 1000+ more platforms\n`);
});
