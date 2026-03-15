const API_BASE_URL = window.location.origin;

class VideoDownloader {
    constructor() {
        this.videoUrl = document.getElementById('videoUrl');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.errorMessage = document.getElementById('errorMessage');
        this.resultSection = document.getElementById('resultSection');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.videoSource = document.getElementById('videoSource');
        this.downloadVideoBtn = document.getElementById('downloadVideoBtn');
        this.copyLinkBtn = document.getElementById('copyLinkBtn');
        
        this.currentVideoData = null;
        
        this.initEventListeners();
    }

    initEventListeners() {
        this.downloadBtn.addEventListener('click', () => this.handleDownload());
        this.videoUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleDownload();
        });
        this.downloadVideoBtn.addEventListener('click', () => this.downloadVideo());
        this.copyLinkBtn.addEventListener('click', () => this.copyToClipboard());
    }

    async handleDownload() {
        const url = this.videoUrl.value.trim();
        
        if (!url) {
            this.showError('Please enter a valid URL');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const platform = this.detectPlatform(url);
            let videoData = null;

            if (platform === 'youtube') {
                videoData = await this.getYouTubeVideo(url);
            } else if (platform === 'tiktok') {
                videoData = await this.getTikTokVideo(url);
            } else if (platform === 'instagram') {
                videoData = await this.getInstagramVideo(url);
            } else if (platform === 'twitter') {
                videoData = await this.getTwitterVideo(url);
            } else if (platform === 'facebook') {
                videoData = await this.getFacebookVideo(url);
            } else if (platform === 'vimeo') {
                videoData = await this.getVimeoVideo(url);
            } else {
                videoData = await this.getGenericVideo(url);
            }

            if (videoData) {
                this.displayVideo(videoData);
            } else {
                this.showError('Could not retrieve video. Make sure the URL is valid and public.');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error: ' + (error.message || 'Unable to download video. Try a different link.'));
        } finally {
            this.showLoading(false);
        }
    }

    detectPlatform(url) {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
        if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
        if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
        if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
        if (url.includes('vimeo.com')) return 'vimeo';
        if (url.includes('reddit.com')) return 'reddit';
        return 'generic';
    }

    async getYouTubeVideo(url) {
        try {
            // Extract video ID
            const videoId = this.extractYouTubeID(url);
            if (!videoId) throw new Error('Invalid YouTube URL');

            // Method 1: Try using a CORS proxy with youtube-dl API
            const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            const data = await response.json();

            // For actual video download, we'll use iframe embed as fallback
            // Note: Direct YouTube download is restricted by CORS
            return {
                title: data.title,
                videoUrl: `https://www.youtube.com/embed/${videoId}`,
                thumbnail: data.thumbnail_url,
                platform: 'YouTube',
                isEmbed: true,
                videoId: videoId
            };
        } catch (error) {
            throw new Error('YouTube: ' + error.message);
        }
    }

    async getTikTokVideo(url) {
        try {
            // Using TikTok oEmbed or scraping
            const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            return {
                title: data.title || 'TikTok Video',
                videoUrl: url,
                platform: 'TikTok',
                isEmbed: true
            };
        } catch (error) {
            throw new Error('TikTok: ' + error.message);
        }
    }

    async getInstagramVideo(url) {
        try {
            // Instagram doesn't allow direct CORS requests
            // Using a proxy approach
            const igUrl = url.includes('?') ? url.split('?')[0] : url;
            const jsonUrl = igUrl.endsWith('/') ? igUrl + 'oembed/?url=' + encodeURIComponent(igUrl) : igUrl + '/?__a=1';
            
            return {
                title: 'Instagram Video',
                videoUrl: igUrl,
                platform: 'Instagram',
                isEmbed: true
            };
        } catch (error) {
            throw new Error('Instagram: ' + error.message);
        }
    }

    async getTwitterVideo(url) {
        try {
            // Twitter/X oEmbed
            const response = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            return {
                title: 'Twitter Video',
                videoUrl: url,
                platform: 'Twitter/X',
                isEmbed: true
            };
        } catch (error) {
            throw new Error('Twitter: ' + error.message);
        }
    }

    async getFacebookVideo(url) {
        try {
            return {
                title: 'Facebook Video',
                videoUrl: url,
                platform: 'Facebook',
                isEmbed: true
            };
        } catch (error) {
            throw new Error('Facebook: ' + error.message);
        }
    }

    async getVimeoVideo(url) {
        try {
            const videoId = url.split('/').pop();
            const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            return {
                title: data.title || 'Vimeo Video',
                videoUrl: `https://vimeo.com/${videoId}`,
                thumbnail: data.thumbnail_url,
                platform: 'Vimeo',
                isEmbed: true
            };
        } catch (error) {
            throw new Error('Vimeo: ' + error.message);
        }
    }

    async getGenericVideo(url) {
        try {
            // Try to fetch directly if it's a direct video link
            const response = await fetch(url, { method: 'HEAD' });
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('video')) {
                return {
                    title: 'Video',
                    videoUrl: url,
                    platform: 'Direct Link',
                    isEmbed: false
                };
            }

            throw new Error('URL does not point to a video');
        } catch (error) {
            throw new Error('Could not process URL: ' + error.message);
        }
    }

    extractYouTubeID(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
            /youtube\.com\/embed\/([^&\n?#]+)/,
            /youtube\.com\/shorts\/([^&\n?#]+)/  // YouTube Shorts
        ];

        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    displayVideo(videoData) {
        this.currentVideoData = videoData;

        if (videoData.isEmbed) {
            // For embedded videos, we'll show an iframe or message
            this.videoPlayer.style.display = 'none';
            
            // Create a message for embedded content
            const container = this.videoPlayer.parentElement;
            if (!container.querySelector('.embed-notice')) {
                const notice = document.createElement('div');
                notice.className = 'embed-notice';
                notice.innerHTML = `
                    <p>📱 This is an embedded video from ${videoData.platform}.</p>
                    <p>Click the download button to get a link to the original video.</p>
                    <p style="margin-top: 15px; color: #999; font-size: 0.9em;">
                        Note: Direct downloads from ${videoData.platform} may be restricted by platform policies.
                    </p>
                `;
                container.appendChild(notice);
            }
        } else {
            // For direct video links
            this.videoPlayer.style.display = 'block';
            this.videoSource.src = videoData.videoUrl;
            this.videoPlayer.load();
        }

        document.getElementById('videoTitle').textContent = videoData.title;
        document.getElementById('videoPlatform').textContent = videoData.platform;
        document.getElementById('videoDuration').textContent = 'Fetching...';

        if (!videoData.isEmbed) {
            this.videoPlayer.addEventListener('loadedmetadata', () => {
                const duration = this.formatDuration(this.videoPlayer.duration);
                document.getElementById('videoDuration').textContent = duration;
            }, { once: true });
        }

        this.resultSection.style.display = 'block';
        this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async downloadVideo() {
        if (!this.currentVideoData) return;

        this.showLoading(true);

        try {
            // Use backend server to download - bypasses all CORS restrictions
            await this.downloadViaServer();
        } catch (error) {
            this.showError('❌ ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async downloadViaServer() {
        try {
            // Check if server is running
            const healthCheck = await fetch(`${API_BASE_URL}/api/health`).catch(() => null);
            if (!healthCheck) {
                throw new Error('Server not running. Please start the server first (see README for setup)');
            }

            const response = await fetch(`${API_BASE_URL}/api/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: this.videoUrl.value,
                    title: this.currentVideoData.title
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Download failed');
            }

            // Download the file
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = this.sanitizeFileName(this.currentVideoData.title) + '.mp4';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            this.showError('✅ Video downloaded successfully!');
            setTimeout(() => this.hideError(), 3000);
        } catch (error) {
            throw error;
        }
    }

    sanitizeFileName(fileName) {
        return fileName.replace(/[<>:"/\\|?*]+/g, '_').substring(0, 255);
    }

    copyToClipboard() {
        const url = this.currentVideoData.videoUrl;
        navigator.clipboard.writeText(url).then(() => {
            const originalText = this.copyLinkBtn.textContent;
            this.copyLinkBtn.textContent = '✓ Copied!';
            setTimeout(() => {
                this.copyLinkBtn.textContent = originalText;
            }, 2000);
        });
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return 'Unknown';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    showLoading(show) {
        this.loadingSpinner.style.display = show ? 'block' : 'none';
        this.downloadBtn.disabled = show;
    }

    showError(message) {
        this.errorMessage.textContent = '⚠️ ' + message;
        this.errorMessage.style.display = 'block';
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }
}

// Add embed notice styles dynamically
const style = document.createElement('style');
style.textContent = `
    .embed-notice {
        background: #e3f2fd;
        border: 2px solid #2196f3;
        border-radius: 10px;
        padding: 20px;
        text-align: center;
        color: #1976d2;
        font-weight: 500;
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new VideoDownloader();
});
