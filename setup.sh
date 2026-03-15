#!/bin/bash

# Video Downloader Setup Script for macOS

echo "🎥 Video Downloader - Setup Script"
echo "===================================="
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    brew install node
else
    echo "✅ Node.js is installed"
fi

# Install yt-dlp
if ! command -v yt-dlp &> /dev/null; then
    echo "📦 Installing yt-dlp..."
    brew install yt-dlp
else
    echo "✅ yt-dlp is installed"
fi

# Install npm dependencies
echo ""
echo "📦 Installing npm dependencies..."
npm install

# Done
echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server, run:"
echo "  npm start"
echo ""
echo "Then open: http://localhost:3000"
echo ""
