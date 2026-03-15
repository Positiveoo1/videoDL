const API_BASE_URL = window.location.origin;

class VideoDownloader {
    constructor() {
        this.videoUrl = document.getElementById('videoUrl');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.pasteBtn = document.getElementById('pasteBtn');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.errorMessage = document.getElementById('errorMessage');
        this.resultSection = document.getElementById('resultSection');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.videoSource = document.getElementById('videoSource');
        this.downloadVideoBtn = document.getElementById('downloadVideoBtn');
        this.copyLinkBtn = document.getElementById('copyLinkBtn');
        this.darkModeToggle = document.getElementById('darkModeToggle');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressPercent = document.getElementById('progressPercent');
        this.progressStatus = document.getElementById('progressStatus');
        this.historySection = document.getElementById('historySection');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.liveRegion = document.getElementById('liveRegion');
        this.progressRegion = document.getElementById('progressRegion');
        
        this.currentVideoData = null;
        this.downloadHistory = [];
        
        this.initTheme();
        this.loadHistory();
        this.initEventListeners();
        this.setupClipboardDetection();
    }

    initTheme() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            this.darkModeToggle.textContent = '☀️';
        }
    }

    initEventListeners() {
        this.downloadBtn.addEventListener('click', () => this.handleDownload());
        this.pasteBtn.addEventListener('click', () => this.pasteFromClipboard());
        this.videoUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleDownload();
            }
        });
        this.videoUrl.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideError();
            }
        });
        this.downloadVideoBtn.addEventListener('click', () => this.downloadVideo());
        this.copyLinkBtn.addEventListener('click', () => this.copyToClipboard());
        this.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
        this.clearHistoryBtn.addEventListener('click', () => this.clearDownloadHistory());
        
        // Keyboard shortcut for dark mode: Ctrl+Shift+D
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleDarkMode();
            }
        });
    }

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        this.darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
        this.announceToScreenReader(`${isDarkMode ? 'Dark' : 'Light'} mode enabled`);
    }

    setupClipboardDetection() {
        this.videoUrl.addEventListener('paste', (e) => {
            setTimeout(() => {
                const url = this.videoUrl.value.trim();
                if (url && this.isValidUrl(url)) {
                    this.announceToScreenReader(`Video URL pasted: ${url}`);
                }
            }, 0);
        });
    }

    async pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            if (this.isValidUrl(text)) {
                this.videoUrl.value = text;
                this.announceToScreenReader(`Pasted from clipboard: ${text}`);
                this.pasteBtn.textContent = '✓';
                setTimeout(() => {
                    this.pasteBtn.textContent = '📋';
                }, 1500);
            } else {
                this.showError('Clipboard content is not a valid URL');
            }
        } catch (err) {
            this.showError('Unable to read clipboard. Please paste manually.');
        }
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    announceToScreenReader(message) {
        this.liveRegion.textContent = message;
    }

    updateProgress(percent, status) {
        this.progressFill.style.width = percent + '%';
        this.progressPercent.textContent = percent + '%';
        this.progressStatus.textContent = status;
        this.progressRegion.textContent = `Download progress: ${percent}% - ${status}`;
    }

    async handleDownload() {
        const url = this.videoUrl.value.trim();
        
        if (!url) {
            this.showError('Please enter a valid URL', 'Paste the full video link from YouTube, Instagram, TikTok, or other platforms');
            return;
        }

        if (!this.isValidUrl(url)) {
            this.showError('Invalid URL format', 'Please make sure the URL starts with http:// or https://');
            return;
        }

        this.showLoading(true);
        this.hideError();
        this.showProgress(true);
        this.updateProgress(10, 'Analyzing video...');

        try {
            this.updateProgress(25, 'Fetching video information...');
            
            // Call backend to get video metadata using yt-dlp
            const infoResponse = await fetch(`${API_BASE_URL}/api/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!infoResponse.ok) {
                const errorData = await infoResponse.json();
                throw new Error(errorData.error || 'Failed to fetch video info');
            }

            const videoInfo = await infoResponse.json();
            this.updateProgress(75, 'Processing video information...');

            // Create video data object
            const videoData = {
                title: videoInfo.title,
                duration: videoInfo.duration,
                platform: videoInfo.platform,
                videoUrl: url,
                isEmbed: true,
                thumbnail: videoInfo.thumbnail,
                uploader: videoInfo.uploader,
                description: videoInfo.description
            };

            this.updateProgress(90, 'Preparing video player...');
            this.displayVideo(videoData);
            this.addToHistory(videoData);
            this.updateProgress(100, 'Ready to download!');
            setTimeout(() => this.showProgress(false), 500);

        } catch (error) {
            this.showProgress(false);
            console.error('Error:', error);
            const errorDetails = this.getErrorDetails(error);
            this.showError(errorDetails.title, errorDetails.message);
        } finally {
            this.showLoading(false);
        }
    }

    getErrorDetails(error) {
        const errorMessage = error.message || 'Unable to download video';
        
        if (errorMessage.includes('fetch video information') || errorMessage.includes('Unable to fetch')) {
            return {
                title: 'Video Not Found or Unavailable',
                message: 'The video URL may be invalid, private, deleted, or not supported. Make sure it\'s a valid URL and the video is publicly available.'
            };
        }
        if (errorMessage.includes('YouTube')) {
            return {
                title: 'YouTube Error',
                message: 'The YouTube video may be private, restricted, age-gated, or the channel may be unavailable'
            };
        }
        if (errorMessage.includes('TikTok')) {
            return {
                title: 'TikTok Error',
                message: 'The TikTok video may be private or from a restricted account'
            };
        }
        if (errorMessage.includes('Instagram')) {
            return {
                title: 'Instagram Error',
                message: 'The Instagram video may be private or from a restricted account'
            };
        }
        if (errorMessage.includes('Reddit')) {
            return {
                title: 'Reddit Error',
                message: 'The Reddit video may be private or restricted'
            };
        }
        if (errorMessage.includes('Dailymotion')) {
            return {
                title: 'Dailymotion Error',
                message: 'The Dailymotion video may be private or restricted'
            };
        }
        if (errorMessage.includes('Twitter') || errorMessage.includes('X')) {
            return {
                title: 'Twitter/X Error',
                message: 'The video may be private, deleted, or from a restricted account'
            };
        }
        if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
            return {
                title: 'Connection Timeout',
                message: 'The video took too long to process. Try again or use a shorter video'
            };
        }
        if (errorMessage.includes('CORS') || errorMessage.includes('blocked by CORS') || errorMessage.includes('Failed to fetch')) {
            return {
                title: 'Network Access Issue',
                message: 'There was a network error. Please check your internet connection and try again'
            };
        }
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            return {
                title: 'Network Error',
                message: 'Check your internet connection and try again'
            };
        }
        
        return {
            title: 'Error',
            message: errorMessage.replace(/^Error: /, '')
        };
    }

    detectPlatform(url) {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
        if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
        if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
        if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
        if (url.includes('vimeo.com')) return 'vimeo';
        if (url.includes('reddit.com')) return 'reddit';
        if (url.includes('dailymotion.com') || url.includes('dai.ly')) return 'dailymotion';
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
            // Try using TikTok oEmbed endpoint
            const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // Fall back to basic info if endpoint is blocked
                return {
                    title: 'TikTok Video',
                    videoUrl: url,
                    platform: 'TikTok',
                    isEmbed: true
                };
            }
            
            const data = await response.json();
            return {
                title: data.title || 'TikTok Video',
                videoUrl: url,
                platform: 'TikTok',
                isEmbed: true
            };
        } catch (error) {
            // If oEmbed fails, return basic data for backend processing
            return {
                title: 'TikTok Video',
                videoUrl: url,
                platform: 'TikTok',
                isEmbed: true
            };
        }
    }

    async getInstagramVideo(url) {
        try {
            // Instagram doesn't allow direct CORS requests
            // Just return the URL for backend processing
            const igUrl = url.includes('?') ? url.split('?')[0] : url;
            
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
            // Twitter/X oEmbed endpoint
            const response = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`);
            
            // Check if response is valid JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // If not JSON, the endpoint may be blocked or rate-limited
                // Fall back to basic data
                return {
                    title: 'Twitter/X Video',
                    videoUrl: url,
                    platform: 'Twitter/X',
                    isEmbed: true
                };
            }
            
            const data = await response.json();
            return {
                title: data.title || 'Twitter/X Video',
                videoUrl: url,
                platform: 'Twitter/X',
                isEmbed: true
            };
        } catch (error) {
            // If oEmbed fails, still return the URL for backend processing
            return {
                title: 'Twitter/X Video',
                videoUrl: url,
                platform: 'Twitter/X',
                isEmbed: true
            };
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

    async getRedditVideo(url) {
        try {
            // Extract video ID from Reddit URL
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            const postId = pathParts[pathParts.length - 2];
            const title = pathParts[pathParts.length - 1] || 'Reddit Video';
            
            return {
                title: title.replace(/-/g, ' '),
                videoUrl: url,
                platform: 'Reddit',
                isEmbed: true
            };
        } catch (error) {
            throw new Error('Reddit: ' + error.message);
        }
    }

    async getDailymotionVideo(url) {
        try {
            // Extract video ID from Dailymotion URL
            const videoIdMatch = url.match(/(?:\/video\/|dai\.ly\/)([a-z0-9]+)/i);
            const videoId = videoIdMatch ? videoIdMatch[1] : 'video';
            
            return {
                title: 'Dailymotion Video',
                videoUrl: url,
                videoId: videoId,
                platform: 'Dailymotion',
                isEmbed: true
            };
        } catch (error) {
            throw new Error('Dailymotion: ' + error.message);
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

        // Hide the video player for embedded content
        this.videoPlayer.style.display = 'none';
        
        // Create a message for embedded content
        const container = this.videoPlayer.parentElement;
        const existingNotice = container.querySelector('.embed-notice');
        if (existingNotice) {
            existingNotice.remove();
        }
        
        const notice = document.createElement('div');
        notice.className = 'embed-notice';
        
        notice.innerHTML = `
            <p>📱 Video loaded from <strong>${videoData.platform}</strong></p>
            <p>Click <strong>"Download Video"</strong> to download this video</p>
            <p style="margin-top: 15px; color: #999; font-size: 0.9em;">
                Video will be downloaded using your server backend
            </p>
        `;
        container.appendChild(notice);

        // Display metadata
        document.getElementById('videoTitle').textContent = videoData.title;
        document.getElementById('videoPlatform').textContent = videoData.platform;
        
        // Format duration
        const duration = this.formatDuration(videoData.duration);
        document.getElementById('videoDuration').textContent = duration;

        this.resultSection.style.display = 'block';
        this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.announceToScreenReader(`Video loaded: ${videoData.title} (${duration}) from ${videoData.platform}`);
    }

    async downloadVideo() {
        if (!this.currentVideoData) return;

        this.showLoading(true);
        this.showProgress(true);
        this.updateProgress(0, 'Starting download...');

        try {
            // Use backend server to download - bypasses all CORS restrictions
            await this.downloadViaServer();
        } catch (error) {
            this.showProgress(false);
            this.showError('Download Failed', error.message);
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
                    title: this.currentVideoData.title || 'video'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Download failed');
            }

            this.updateProgress(50, 'Downloading video...');

            // Download the file
            const blob = await response.blob();
            this.updateProgress(90, 'Saving file...');

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = this.sanitizeFileName(this.currentVideoData.title) + '.mp4';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            this.updateProgress(100, 'Download complete!');
            setTimeout(() => this.showProgress(false), 1000);
            
            this.showError('✅ Download Successful!', `Successfully downloaded: ${this.currentVideoData.title}`, 'success');
            this.announceToScreenReader('Video downloaded successfully');
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
            this.announceToScreenReader('Link copied to clipboard');
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

    loadHistory() {
        const stored = localStorage.getItem('downloadHistory');
        if (stored) {
            try {
                this.downloadHistory = JSON.parse(stored);
                this.updateHistoryDisplay();
            } catch (e) {
                console.error('Error loading history:', e);
                this.downloadHistory = [];
            }
        }
    }

    addToHistory(videoData) {
        const historyItem = {
            title: videoData.title,
            platform: videoData.platform,
            timestamp: new Date().getTime(),
            url: videoData.videoUrl
        };

        // Add to beginning of array (most recent first)
        this.downloadHistory.unshift(historyItem);

        // Keep only last 15 items
        if (this.downloadHistory.length > 15) {
            this.downloadHistory = this.downloadHistory.slice(0, 15);
        }

        localStorage.setItem('downloadHistory', JSON.stringify(this.downloadHistory));
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        if (this.downloadHistory.length === 0) {
            this.historySection.style.display = 'none';
            return;
        }

        this.historySection.style.display = 'block';
        this.historyList.innerHTML = '';

        this.downloadHistory.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            const time = new Date(item.timestamp).toLocaleString();
            
            historyItem.innerHTML = `
                <div class="history-item-info">
                    <div class="history-item-title">${this.escapeHtml(item.title)}</div>
                    <div class="history-item-time">${item.platform} • ${time}</div>
                </div>
                <button class="history-item-remove" aria-label="Remove from history" onclick="app.removeFromHistory(${index})">×</button>
            `;

            historyItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('history-item-remove')) {
                    this.videoUrl.value = item.url;
                    this.announceToScreenReader(`Loaded from history: ${item.title}`);
                    this.videoUrl.focus();
                }
            });

            this.historyList.appendChild(historyItem);
        });
    }

    removeFromHistory(index) {
        this.downloadHistory.splice(index, 1);
        localStorage.setItem('downloadHistory', JSON.stringify(this.downloadHistory));
        this.updateHistoryDisplay();
        this.announceToScreenReader('Item removed from history');
    }

    clearDownloadHistory() {
        if (confirm('Are you sure you want to clear all download history?')) {
            this.downloadHistory = [];
            localStorage.removeItem('downloadHistory');
            this.updateHistoryDisplay();
            this.announceToScreenReader('Download history cleared');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading(show) {
        this.loadingSpinner.style.display = show ? 'block' : 'none';
        this.downloadBtn.disabled = show;
    }

    showProgress(show) {
        this.progressContainer.style.display = show ? 'block' : 'none';
    }

    showError(message, details = '', type = 'error') {
        const errorText = document.getElementById('errorText');
        const errorDetails = document.getElementById('errorDetails');
        
        errorText.textContent = message;
        errorDetails.textContent = details;
        
        this.errorMessage.style.display = 'block';
        this.errorMessage.className = 'error-message ' + (type === 'success' ? 'success' : '');
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

    body.dark-mode .embed-notice {
        background: #1e3a5f;
        border-color: #4a9eff;
        color: #7bbef5;
    }

    .error-message.success {
        background: #d4edda;
        border-color: #28a745;
        color: #155724;
    }

    body.dark-mode .error-message.success {
        background: #2a3f2f;
        border-color: #5a8c5a;
        color: #90ee90;
    }
`;
document.head.appendChild(style);

// Global app reference for history removal
let app;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app = new VideoDownloader();
});
