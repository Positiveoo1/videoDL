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

        // Normalize URLs
        let processUrl = url;
        if (url.includes('instagram.com')) {
            processUrl = url.replace(/\/$/, '') + '/';
        }
        // YouTube Shorts: convert to standard URL format
        if (url.includes('youtube.com/shorts/')) {
            const videoId = url.match(/shorts\/([a-zA-Z0-9_-]{11})/)?.[1];
            if (videoId) {
                processUrl = `https://www.youtube.com/watch?v=${videoId}`;
            }
        }

        // Use yt-dlp to extract video metadata as JSON with retry logic
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            // Build command with YouTube-specific options if it's a YouTube URL
            let command = '';
            if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('shorts')) {
                // YouTube (including Shorts) requires special handling
                command = `yt-dlp -j --no-warnings --socket-timeout 15 --extractor-args youtube:player_client=web --no-check-certificate "${processUrl}"`;
            } else {
                // Standard command for other platforms
                command = `yt-dlp -j --no-warnings --socket-timeout 15 "${processUrl}"`;
            }
            
            console.log(`Attempt ${attempt + 1} for URL:`, url);
            
            const result = await new Promise((resolve) => {
                exec(command, { timeout: 60000, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
                    resolve({ error, stdout, stderr });
                });
            });

            if (!result.error && result.stdout) {
                try {
                    const data = JSON.parse(result.stdout);
                    
                    console.log('Successfully fetched metadata for:', data.title || 'Unknown Title');
                    
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
                    console.error('Parse error:', parseError.message);
                }
            } else {
                // Priority: stderr > stdout > error message
                const errorOutput = result.stderr || result.stdout || result.error?.message || 'Unknown error';
                lastError = errorOutput;
                console.error(`Attempt ${attempt + 1} failed - yt-dlp error:`, errorOutput);
            }

            // Wait before retry
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        console.error('All retry attempts failed. Last error:', lastError);
        
        // Return error with full details for debugging
        return res.status(400).json({ 
            error: 'Unable to fetch video information',
            details: lastError || 'The video may be private, deleted, or the platform is blocking access.'
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
        // YouTube Shorts: convert to standard URL format
        if (url.includes('youtube.com/shorts/')) {
            const videoId = url.match(/shorts\/([a-zA-Z0-9_-]{11})/)?.[1];
            if (videoId) {
                processUrl = `https://www.youtube.com/watch?v=${videoId}`;
            }
        }

        // Use yt-dlp to get the best video stream URL with retry logic
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            let command = '';
            if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('shorts')) {
                // YouTube specific options
                command = `yt-dlp -f "best[ext=mp4]/best" -g --no-warnings --socket-timeout 15 --extractor-args youtube:player_client=web --no-check-certificate "${processUrl}"`;
            } else {
                // Standard command
                command = `yt-dlp -f "best[ext=mp4]/best" -g --no-warnings --socket-timeout 15 "${processUrl}"`;
            }
            
            console.log(`Stream extraction attempt ${attempt + 1} for:`, url);
            
            const result = await new Promise((resolve) => {
                exec(command, { timeout: 60000, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
                    resolve({ error, stdout, stderr });
                });
            });

            if (!result.error && result.stdout) {
                const streamUrl = result.stdout.trim();
                if (streamUrl && !streamUrl.includes('ERROR')) {
                    console.log('Stream URL extracted successfully');
                    return res.json({
                        url: streamUrl,
                        status: 'success'
                    });
                }
            }

            const errorOutput = result.stderr || result.stdout || result.error?.message || 'Unknown error';
            lastError = errorOutput;
            console.error(`Attempt ${attempt + 1} failed - yt-dlp error:`, errorOutput);

            // Wait before retry
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        console.error('Stream fetch failed after all attempts:', lastError);
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
        
        // YouTube-specific initial check
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('shorts');
        let baseCommand = isYouTube 
            ? `yt-dlp --extractor-args youtube:player_client=web --no-check-certificate --socket-timeout 30`
            : `yt-dlp --socket-timeout 30`;
        
        for (const format of formatOptions) {
            if (downloaded) break;
            
            const command = `${baseCommand} -f "${format}" -N 4 -o "${outputPath}" "${url}"`;
            
            console.log(`Attempting download with format: ${format}`);
            
            // Retry logic wrapper
            await new Promise((resolve) => {
                exec(command, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                    if (error) {
                        const errorOutput = stderr || stdout || error.message;
                        console.error(`Download error with format "${format}" - yt-dlp error:`, errorOutput);
                        lastError = errorOutput;
                    } else {
                        downloaded = true;
                        lastError = null;
                        console.log('Download successful');
                    }
                    resolve();
                });
            });
        }
        
        if (!downloaded) {
            console.error('All format attempts failed. Last error:', lastError);
            return res.status(400).json({ 
                error: 'Failed to download video. This may be a very short video or restricted content.',
                details: lastError || 'Unknown error'
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
