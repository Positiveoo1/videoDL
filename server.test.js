const request = require('supertest');
const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Mock exec
jest.mock('child_process');

describe('Video Downloader API', () => {
    let app;

    beforeAll(() => {
        // Create a minimal server for testing
        app = express();
        app.use(express.json());

        const tempDir = path.join(os.tmpdir(), 'video-downloader');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Info endpoint
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
                // YouTube Shorts
                if (url.includes('youtube.com/shorts/')) {
                    const videoId = url.match(/shorts\/([a-zA-Z0-9_-]{11})/)?.[1];
                    if (videoId) {
                        processUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    }
                }

                const maxRetries = 3;
                let lastError = null;

                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    let command = '';
                    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('shorts')) {
                        command = `yt-dlp -j --no-warnings --socket-timeout 15 --extractor-args youtube:player_client=web --no-check-certificate "${processUrl}" 2>&1`;
                    } else {
                        command = `yt-dlp -j --no-warnings --socket-timeout 15 "${processUrl}" 2>&1`;
                    }

                    const result = await new Promise((resolve) => {
                        exec(command, { timeout: 60000, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
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

                    if (attempt < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }

                return res.status(400).json({
                    error: 'Unable to fetch video information',
                    details: lastError || 'The video may be private, deleted, or the platform is blocking access.'
                });
            } catch (error) {
                res.status(500).json({ error: 'Server error: ' + error.message });
            }
        });

        // Stream endpoint
        app.post('/api/stream', async (req, res) => {
            try {
                const { url } = req.body;

                if (!url) {
                    return res.status(400).json({ error: 'URL is required' });
                }

                let processUrl = url;
                if (url.includes('instagram.com')) {
                    processUrl = url.replace(/\/$/, '') + '/';
                }
                if (url.includes('youtube.com/shorts/')) {
                    const videoId = url.match(/shorts\/([a-zA-Z0-9_-]{11})/)?.[1];
                    if (videoId) {
                        processUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    }
                }

                const maxRetries = 3;
                let lastError = null;

                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    let command = '';
                    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('shorts')) {
                        command = `yt-dlp -f "best[ext=mp4]/best" -g --no-warnings --socket-timeout 15 --extractor-args youtube:player_client=web --no-check-certificate "${processUrl}" 2>&1`;
                    } else {
                        command = `yt-dlp -f "best[ext=mp4]/best" -g --no-warnings --socket-timeout 15 "${processUrl}" 2>&1`;
                    }

                    const result = await new Promise((resolve) => {
                        exec(command, { timeout: 60000, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
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

                    if (attempt < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }

                return res.status(400).json({
                    error: 'Unable to get video stream',
                    details: 'Stream URL could not be extracted. Video may be protected or platform is blocking access.'
                });
            } catch (error) {
                res.status(500).json({ error: 'Server error: ' + error.message });
            }
        });

        // Health endpoint
        app.get('/api/health', (req, res) => {
            res.json({ status: 'ok' });
        });
    });

    describe('POST /api/info', () => {
        test('should return 400 when URL is missing', async () => {
            const response = await request(app)
                .post('/api/info')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('URL is required');
        });

        test('should return video info for valid YouTube URL', async () => {
            exec.mockImplementation((command, options, callback) => {
                const mockData = {
                    title: 'Test Video',
                    duration: 100,
                    extractor: 'youtube',
                    thumbnail: 'https://example.com/thumb.jpg',
                    description: 'Test description',
                    uploader: 'Test User',
                    upload_date: '20240101',
                    view_count: 1000
                };
                callback(null, JSON.stringify(mockData), '');
            });

            const response = await request(app)
                .post('/api/info')
                .send({ url: 'https://www.youtube.com/watch?v=test123' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('title');
            expect(response.body).toHaveProperty('duration');
            expect(response.body.title).toBe('Test Video');
        });

        test('should normalize YouTube Shorts URL to standard format', async () => {
            exec.mockImplementation((command, options, callback) => {
                // Verify the command uses normalized URL
                expect(command).toContain('watch?v=');
                const mockData = {
                    title: 'Short Video',
                    duration: 15,
                    extractor: 'youtube'
                };
                callback(null, JSON.stringify(mockData), '');
            });

            const response = await request(app)
                .post('/api/info')
                .send({ url: 'https://www.youtube.com/shorts/test12345ab' });

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Short Video');
        });

        test('should handle YouTube short URL (youtu.be)', async () => {
            exec.mockImplementation((command, options, callback) => {
                expect(command).toContain('--extractor-args youtube:player_client=web');
                const mockData = {
                    title: 'Short URL Video',
                    duration: 50,
                    extractor: 'youtube'
                };
                callback(null, JSON.stringify(mockData), '');
            });

            const response = await request(app)
                .post('/api/info')
                .send({ url: 'https://youtu.be/test123' });

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Short URL Video');
        });

        test('should handle Instagram URL normalization', async () => {
            exec.mockImplementation((command, options, callback) => {
                expect(command).toContain('/');
                const mockData = {
                    title: 'Instagram Video',
                    duration: 30,
                    extractor: 'instagram'
                };
                callback(null, JSON.stringify(mockData), '');
            });

            const response = await request(app)
                .post('/api/info')
                .send({ url: 'https://www.instagram.com/p/test123' });

            expect(response.status).toBe(200);
        });

        test('should return error on yt-dlp failure', async () => {
            exec.mockImplementation((command, options, callback) => {
                callback(new Error('Command failed'), '', 'Video not found');
            });

            const response = await request(app)
                .post('/api/info')
                .send({ url: 'https://www.youtube.com/watch?v=invalid' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Unable to fetch video information');
        });
    });

    describe('POST /api/stream', () => {
        test('should return 400 when URL is missing', async () => {
            const response = await request(app)
                .post('/api/stream')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('URL is required');
        });

        test('should return stream URL for valid YouTube URL', async () => {
            exec.mockImplementation((command, options, callback) => {
                const mockStreamUrl = 'https://example.com/video.mp4?token=abc123';
                callback(null, mockStreamUrl, '');
            });

            const response = await request(app)
                .post('/api/stream')
                .send({ url: 'https://www.youtube.com/watch?v=test123' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('url');
            expect(response.body.status).toBe('success');
        });

        test('should use YouTube-specific flags in command', async () => {
            let commandUsed = '';
            exec.mockImplementation((command, options, callback) => {
                commandUsed = command;
                callback(null, 'https://example.com/video.mp4', '');
            });

            await request(app)
                .post('/api/stream')
                .send({ url: 'https://www.youtube.com/watch?v=test123' });

            expect(commandUsed).toContain('--extractor-args youtube:player_client=web');
            expect(commandUsed).toContain('--no-check-certificate');
        });

        test('should normalize YouTube Shorts to regular URL for stream extraction', async () => {
            let commandUsed = '';
            exec.mockImplementation((command, options, callback) => {
                commandUsed = command;
                callback(null, 'https://example.com/video.mp4', '');
            });

            await request(app)
                .post('/api/stream')
                .send({ url: 'https://www.youtube.com/shorts/test12345ab' });

            expect(commandUsed).toContain('watch?v=test12345ab');
        });

        test('should return error on stream extraction failure', async () => {
            exec.mockImplementation((command, options, callback) => {
                callback(new Error('Stream extraction failed'), '', '');
            });

            const response = await request(app)
                .post('/api/stream')
                .send({ url: 'https://www.youtube.com/watch?v=invalid' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Unable to get video stream');
        });
    });

    describe('GET /api/health', () => {
        test('should return health status', async () => {
            const response = await request(app).get('/api/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
        });
    });

    describe('URL Normalization', () => {
        test('should detect YouTube URLs correctly', () => {
            const youtubeUrls = [
                'https://www.youtube.com/watch?v=abc123',
                'https://youtu.be/abc123',
                'https://www.youtube.com/shorts/abc12345def',
                'https://m.youtube.com/watch?v=abc123'
            ];

            youtubeUrls.forEach(url => {
                expect(
                    url.includes('youtube.com') ||
                    url.includes('youtu.be') ||
                    url.includes('shorts')
                ).toBe(true);
            });
        });

        test('should extract video ID from Shorts URL', () => {
            const shortsUrl = 'https://www.youtube.com/shorts/RRNL4BCVIXo?si=QyVIHYhCeSgpugCP';
            const videoId = shortsUrl.match(/shorts\/([a-zA-Z0-9_-]{11})/)?.[1];

            expect(videoId).toBe('RRNL4BCVIXo');
        });

        test('should convert Shorts to standard URL format', () => {
            const shortsUrl = 'https://www.youtube.com/shorts/test12345ab?other=params';
            const videoId = shortsUrl.match(/shorts\/([a-zA-Z0-9_-]{11})/)?.[1];
            const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;

            expect(standardUrl).toBe('https://www.youtube.com/watch?v=test12345ab');
        });
    });

    describe('Error Handling', () => {
        test('should handle JSON parse errors gracefully', async () => {
            exec.mockImplementation((command, options, callback) => {
                callback(null, 'invalid json {{{', '');
            });

            const response = await request(app)
                .post('/api/info')
                .send({ url: 'https://www.youtube.com/watch?v=test' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Unable to fetch');
        });

        test('should retry on failure', async () => {
            let attempts = 0;
            exec.mockImplementation((command, options, callback) => {
                attempts++;
                if (attempts < 3) {
                    callback(new Error('Temporary failure'), '', 'Network error');
                } else {
                    callback(null, JSON.stringify({ title: 'Success', duration: 100, extractor: 'youtube' }), '');
                }
            });

            const response = await request(app)
                .post('/api/info')
                .send({ url: 'https://www.youtube.com/watch?v=test' });

            expect(response.status).toBe(200);
            expect(attempts).toBe(3);
        });

        test('should timeout after max retries', async () => {
            exec.mockImplementation((command, options, callback) => {
                callback(new Error('Persistent failure'), '', 'Service unavailable');
            });

            const response = await request(app)
                .post('/api/info')
                .send({ url: 'https://www.youtube.com/watch?v=test' });

            expect(response.status).toBe(400);
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete workflow: info -> stream', async () => {
            // Mock first call for info
            let callCount = 0;
            exec.mockImplementation((command, options, callback) => {
                callCount++;
                if (command.includes('-j')) {
                    // Info request
                    callback(null, JSON.stringify({
                        title: 'Test Video',
                        duration: 60,
                        extractor: 'youtube'
                    }), '');
                } else if (command.includes('-g')) {
                    // Stream request
                    callback(null, 'https://example.com/video.mp4', '');
                }
            });

            const infoResponse = await request(app)
                .post('/api/info')
                .send({ url: 'https://www.youtube.com/watch?v=test123' });

            expect(infoResponse.status).toBe(200);
            expect(infoResponse.body.title).toBe('Test Video');

            const streamResponse = await request(app)
                .post('/api/stream')
                .send({ url: 'https://www.youtube.com/watch?v=test123' });

            expect(streamResponse.status).toBe(200);
            expect(streamResponse.body.url).toBe('https://example.com/video.mp4');
        });

        test('should handle Shorts workflow', async () => {
            exec.mockImplementation((command, options, callback) => {
                if (command.includes('watch?v=RRNL4BCVIXo')) {
                    if (command.includes('-j')) {
                        callback(null, JSON.stringify({
                            title: 'Shorts Video',
                            duration: 20,
                            extractor: 'youtube'
                        }), '');
                    } else {
                        callback(null, 'https://example.com/short.mp4', '');
                    }
                } else {
                    callback(new Error('URL not normalized'), '', '');
                }
            });

            const response = await request(app)
                .post('/api/info')
                .send({
                    url: 'https://www.youtube.com/shorts/RRNL4BCVIXo?si=QyVIHYhCeSgpugCP'
                });

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Shorts Video');
        });
    });
});
