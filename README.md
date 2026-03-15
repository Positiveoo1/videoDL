# Video Downloader

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-v14+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.22+-blue?style=flat-square&logo=express)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/badge/Stars-%E2%AD%90-yellow?style=flat-square)](#)

**Download videos from 1000+ platforms with a simple, beautiful interface** ✨

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Supported Platforms](#-supported-platforms) • [Troubleshooting](#-troubleshooting)

</div>

---

## Features

- **1000+ Platform Support** - YouTube, Instagram, TikTok, Facebook, Twitter/X, and more
- **High Quality Downloads** - Best quality available for each video
- **CORS Bypass** - Backend server handles all requests securely
- **One-Click Downloads** - Direct MP4 downloads to your computer
- **Beautiful UI** - Clean, responsive, modern interface
- **Fast & Reliable** - Lightning-quick downloads with auto-cleanup
- **Works Everywhere** - macOS, Windows, Linux support

---

## Installation

### Prerequisites

- **Node.js** (v14 or higher)
- **yt-dlp** - The powerful video downloader backend

### Step 1: Install Prerequisites

#### macOS
```bash
brew install yt-dlp node
```

#### Windows
```bash
# Option 1: Using pip (requires Python)
pip install yt-dlp

# Option 2: Download from https://nodejs.org/
# Then download yt-dlp from https://github.com/yt-dlp/yt-dlp/releases
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install python3 python3-pip nodejs npm

pip3 install yt-dlp
```

### Step 2: Clone & Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/video-downloader.git
cd video-downloader

# Install Node dependencies
npm install
```

### Step 3: Start the Server

```bash
npm start
```

You'll see:
```
Video Downloader Server Running
Open: http://localhost:3000

Features: YouTube, Instagram, Facebook, TikTok, Twitter, and 1000+ more platforms
```

### Step 4: Open in Browser

Visit: **[http://localhost:3000](http://localhost:3000)**

---

## How to Use

1. **Paste URL** - Copy a video link from any supported platform
2. **Enter Title** - Give your video a custom name (optional)
3. **Click "Get Video"** - App fetches video information and preview
4. **Review Details** - Check video quality and duration
5. **Download** - Click "Download Video" and enjoy!

---

## Supported Platforms

| YouTube | Status |
|----------|--------| ✅ |
| Instagram |  |
| TikTok |  |
| Facebook |  |
| Twitter / X |  |
| Vimeo |  |
| Reddit |  |
| Snapchat |  |
| Twitch |  |
| LinkedIn |  |
| Telegram |  |
| Pinterest |  |
| Dailymotion |  |
| **+ 1000+ more** |  |

---

## Download Location

Videos are automatically saved to your default **Downloads** folder. You can change this in your browser settings if needed.

---

## Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Video Engine**: yt-dlp
- **Architecture**: Client-Server

---

## Project Structure

```
video-downloader/
├── server.js          # Express server & API endpoints
├── script.js          # Frontend JavaScript
├── styles.css         # UI styling
├── index.html         # Main HTML file
├── package.json       # Dependencies
└── README.md          # This file
```

---

## Troubleshooting

### "yt-dlp not found" or Command failed with code 127

**Solution**: yt-dlp is not installed or not in your PATH
```bash
# macOS
brew install yt-dlp

# Windows (using pip)
pip install yt-dlp

# Linux
pip3 install yt-dlp
```

### "Server not running"

- Ensure you've run `npm start`
- Check that you're visiting `http://localhost:3000` (not `https://`)
- Verify port 3000 is not in use by another application

### Download fails or video not found

- Verify the URL is correct and public
- Check that the platform is supported by yt-dlp
- Try the video URL in a browser first to confirm it works

### "Cannot find module: express"

```bash
npm install
```

---

## Development

For development with auto-reload:

```bash
npm run dev
```

---

## License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## Legal Notice

This tool is designed for **personal, non-commercial use only**. Respect copyright laws and the terms of service of the platforms you download from. Always ensure you have permission to download and use the content.

---

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](#).

### Steps to contribute:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">

Made with love by [Your Name](https://github.com/yourusername)

If you found this helpful, please star the repository!

</div>

### "yt-dlp not found" error
- Install yt-dlp: `pip install yt-dlp` or `brew install yt-dlp`
- Restart the server after installing

### Download fails for certain video
- Make sure the URL is correct and the video is public
- Try a different video to confirm it works
- Some platforms have additional restrictions

### "server.js:1 Failed to load module" 
- Run `npm install` in the project folder
- Make sure Node.js is installed

## 🎯 File Structure

```
videoDl/
├── index.html       # Main web interface
├── styles.css       # Styling
├── script.js        # Frontend JavaScript
├── server.js        # Node.js backend server
├── package.json     # Node dependencies
└── README.md        # This file
```

## 🔒 Privacy & Legal

- Downloaded videos are for **personal use only**
- Always respect creators' copyright and platform Terms of Service
- This tool is for educational purposes
- Don't download copyrighted content without permission

## 💡 Tips

- Use the browser's developer tools (F12) to see download progress
- For YouTube, try video titles with special characters - they'll be cleaned up automatically
- The app cleans up old files automatically to save space
- Downloads are saved in MP4 format by default

## 🛠️ Advanced Usage

### Run with Auto-Reload (Development)
```bash
npm run dev
```

### Check if Setup is Complete
Visit: `http://localhost:3000/api/check-setup`

## 📞 Support

If videos don't download:
1. Check that the URL is valid and public
2. Try with a different video
3. Restart the server
4. Make sure yt-dlp is up to date: `yt-dlp -U`

## ⚡ Performance

- Downloads use efficient streaming
- Server automatically cleans up old files (after 1 hour)
- Supports simultaneous downloads
- Works with videos up to several GB

---

**Enjoy downloading videos! 🎉**
