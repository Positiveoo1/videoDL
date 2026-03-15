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

// Get video metadata without downloading
app.post('/api/info', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Normalize Instagram URLs
        let processUrl = url;
        if (url.includes('instagram.com')) {
            // Ensure Instagram URL ends with proper format
            processUrl = url.replace(/\/$/, '') + '/';
        }

        // Use yt-dlp to extract video metadata as JSON with retry logic
        const maxRetries = 2;
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const command = `yt-dlp -j --no-warnings --socket-timeout 10 "${processUrl}" 2>&1`;
            
            const result = await new Promise((resolve) => {
                exec(command, { timeout: 40000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                    resolve({ error, stdout, stderr });
                });
            });

            if (!result.error && result.stdout) {
                try {
                    const data = JSON.parse(result.stdout);
                    
                    return res.json({
                        title: data.title || 'Video',
                        duration: data.duration || 0,
                        platform: data.extractor || 'Unknown',
                        thumbnail: data.thumbnail || null,
                        description: data.description || '',
                        uploader: data.uploader || 'Unknown',
                        upload_date: data.upload_date || null,
                        view_count: data.view_count || 0
                    });
                } catch (parseError) {
                    lastError = parseError.message;
                }
            } else {
                lastError = result.stderr || result.error?.message || 'Unknown error';
            }

            // Wait before retry
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.error('All retry attempts failed. Last error:', lastError);
        
        // Provide more specific error messages
        if (lastError.includes('Instagram') || lastError.includes('instagram')) {
            return res.status(400).json({ 
                error: 'Instagram Error',
                details: 'The video may be private, deleted, or Instagram is blocking access. Try downloading instead.'
            });
        }

        return res.status(400).json({ 
            error: 'Unable to fetch video information',
            details: 'The video may be private, deleted, or the platform is blocking access. Try the Download button to process it.'
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Get playable video URL (stream URL)
app.post('/api/stream', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Normalize Instagram URLs
        let processUrl = url;
        if (url.includes('instagram.com')) {
            processUrl = url.replace(/\/$/, '') + '/';
        }

        // Use yt-dlp to get the best video stream URL with retry logic
        const maxRetries = 2;
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const command = `yt-dlp -f "best[ext=mp4]/best" -g --no-warnings --socket-timeout 10 "${processUrl}" 2>&1`;
            
            const result = await new Promise((resolve) => {
                exec(command, { timeout: 40000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                    resolve({ error, stdout, stderr });
                });
            });

            if (!result.error && result.stdout) {
                const streamUrl = result.stdout.trim();
                if (streamUrl && !streamUrl.includes('ERROR')) {
                    return res.json({
                        url: streamUrl,
                        status: 'success'
                    });
                }
            }

            lastError = result.stderr || result.error?.message || 'Unknown error';

            // Wait before retry
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.error('Stream fetch failed:', lastError);
        return res.status(400).json({ 
            error: 'Unable to get video stream',
            details: 'Stream URL could not be extracted. Video may be protected or platform is blocking access.'
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

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
        
        // Optimized format selection for faster downloads with good quality
        // Tries multiple format options for compatibility with short videos
        const formatOptions = [
            'bestvideo[height<=720]+bestaudio/best[height<=720]', // Fast: 720p with audio
            'best[height<=720]',                                     // Fallback: best 720p or lower
            'best',                                                   // Last resort: absolute best
        ];
        
        let lastError = null;
        let downloaded = false;
        
        for (const format of formatOptions) {
            if (downloaded) break;
            
            const command = `yt-dlp -f "${format}" -N 4 --socket-timeout 30 -o "${outputPath}" "${url}" 2>&1`;
            
            // Retry logic wrapper
            await new Promise((resolve) => {
                exec(command, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Download error with format "${format}":`, error.message);
                        lastError = stderr || error.message;
                    } else {
                        downloaded = true;
                        lastError = null;
                    }
                    resolve();
                });
            });
        }
        
        if (!downloaded) {
            console.error('All format attempts failed');
            return res.status(400).json({ 
                error: 'Failed to download video. This may be a very short video or restricted content.',
                details: lastError
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
