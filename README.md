# YouTube Downloader

A local YouTube video downloader tool built with Node.js, Express, and yt-dlp. Download videos in various formats and qualities for personal use.

## Features

- 🎯 Simple URL input interface
- 📊 Fetch all available video/audio formats
- ✂️ **Download video segments** - Choose specific time ranges (e.g., 1:04 to 1:45)
- 🎨 Filter formats by type (Video+Audio, Video Only, Audio Only)
- 📱 Responsive modern UI
- 💾 Local downloads management
- ⚡ Fast downloads using yt-dlp
- 🔒 100% local - no data sent to external servers

## Prerequisites

1. **Node.js** (v14 or higher)
2. **yt-dlp** - Install using:
   ```bash
   pip install yt-dlp
   ```
   Or on macOS with Homebrew:
   ```bash
   brew install yt-dlp
   ```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to `http://localhost:3000`

## Usage

1. **Paste YouTube URL** - Any valid YouTube URL (youtube.com or youtu.be)
2. **Get Formats** - Click to fetch all available download formats
3. **Choose Download Mode**:
   - **Download full video** - Get the complete video
   - **Download specific segment** - Select start and end times (e.g., 1:04 to 1:45)
4. **Set Time Range** (if downloading segment):
   - **Start Time**: Enter in format `1:04` or `64` (seconds)
   - **End Time**: Enter in format `1:45` or `105` (seconds)
5. **Choose Quality** - Use filters to find your preferred format:
   - **All** - Shows all available formats
   - **Video + Audio** - Complete video files with audio
   - **Video Only** - Video without audio (useful for specific quality needs)
   - **Audio Only** - Audio-only files (MP3, M4A, etc.)
6. **Download** - Click download on your chosen format
7. **Access Files** - Downloaded files appear in the "Recent Downloads" section

## API Endpoints

- `POST /api/formats` - Get available formats for a YouTube URL
- `POST /api/download` - Download a specific format
  - **Parameters**: `url`, `format_id`, `title`, `start_time` (optional), `end_time` (optional)
  - **Segment Download**: Include `start_time` and `end_time` in seconds for partial downloads
- `GET /api/downloads` - List downloaded files  
- `GET /downloads/:filename` - Serve downloaded files

## File Structure

```
youtube-downloader/
├── server.js          # Express server with yt-dlp integration
├── package.json       # Node.js dependencies
├── public/           # Frontend files
│   ├── index.html    # Main interface
│   ├── style.css     # Modern CSS styling
│   └── script.js     # Frontend JavaScript
├── downloads/        # Downloaded files (created automatically)
└── README.md         # This file
```

## Supported Formats

The tool supports all formats that yt-dlp can handle, including:
- **Video**: MP4, WebM, MKV, AVI, etc.
- **Audio**: MP3, M4A, OGG, WebM, etc.
- **Quality**: 4K, 1080p, 720p, 480p, 360p, and more
- **Codecs**: H.264, VP9, AV1, AAC, Opus, etc.

## Technical Details

- **Backend**: Node.js with Express
- **Video Processing**: yt-dlp (Python-based YouTube downloader)
- **Frontend**: Vanilla JavaScript with modern CSS
- **Download Location**: `./downloads/` directory
- **File Serving**: Static file serving for downloaded content

## Troubleshooting

**yt-dlp not found error:**
- Make sure yt-dlp is installed: `pip install yt-dlp`
- Check if it's in your PATH: `yt-dlp --version`

**Permission errors:**
- Ensure the downloads directory is writable
- On Unix systems, you might need: `chmod 755 downloads/`

**Network errors:**
- Check your internet connection
- Some videos might be region-restricted
- Age-restricted videos may require additional authentication

## Legal Notice

This tool is for personal use only. Please respect copyright laws and YouTube's Terms of Service. Only download content that you have the right to download.

## License

MIT License - feel free to modify and use for personal projects. 