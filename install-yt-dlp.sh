#!/bin/bash

echo "🎥 YouTube Downloader - Installing yt-dlp"
echo "=========================================="

# Check if yt-dlp is already installed
if command -v yt-dlp &> /dev/null; then
    echo "✅ yt-dlp is already installed!"
    yt-dlp --version
    exit 0
fi

echo "yt-dlp not found. Installing..."

# Try to install with pip first (most common)
if command -v pip &> /dev/null; then
    echo "📦 Installing yt-dlp with pip..."
    pip install yt-dlp
elif command -v pip3 &> /dev/null; then
    echo "📦 Installing yt-dlp with pip3..."
    pip3 install yt-dlp
elif command -v brew &> /dev/null; then
    echo "🍺 Installing yt-dlp with Homebrew..."
    brew install yt-dlp
else
    echo "❌ Could not find pip or brew to install yt-dlp"
    echo ""
    echo "Please install yt-dlp manually:"
    echo "1. With pip: pip install yt-dlp"
    echo "2. With Homebrew: brew install yt-dlp"
    echo "3. Download from: https://github.com/yt-dlp/yt-dlp"
    exit 1
fi

# Verify installation
if command -v yt-dlp &> /dev/null; then
    echo "✅ yt-dlp installed successfully!"
    yt-dlp --version
else
    echo "❌ Installation failed. Please install manually."
    exit 1
fi 