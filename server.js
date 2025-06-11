const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

// Check if yt-dlp is installed
function checkYtDlp() {
    return new Promise((resolve) => {
        exec('yt-dlp --version', (error) => {
            resolve(!error);
        });
    });
}

// Check if ffmpeg is installed
function checkFfmpeg() {
    return new Promise((resolve) => {
        exec('ffmpeg -version', (error) => {
            resolve(!error);
        });
    });
}

// Helper function to format seconds to time string for filename
function formatSecondsToTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h${minutes.toString().padStart(2, '0')}m${secs.toString().padStart(2, '0')}s`;
    } else {
        return `${minutes}m${secs.toString().padStart(2, '0')}s`;
    }
}

// Get video formats
app.post('/api/formats', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const ytDlpAvailable = await checkYtDlp();
        if (!ytDlpAvailable) {
            return res.status(500).json({ 
                error: 'yt-dlp not found. Please install it: pip install yt-dlp' 
            });
        }

        const ytDlp = spawn('yt-dlp', [
            '--list-formats',
            '--no-warnings',
            '--print', '%(format_id)s|%(ext)s|%(resolution)s|%(filesize)s|%(vcodec)s|%(acodec)s|%(format_note)s',
            url
        ]);

        let output = '';
        let error = '';

        ytDlp.stdout.on('data', (data) => {
            output += data.toString();
        });

        ytDlp.stderr.on('data', (data) => {
            error += data.toString();
        });

        ytDlp.on('close', (code) => {
            if (code !== 0) {
                return res.status(500).json({ error: `yt-dlp error: ${error}` });
            }

            const lines = output.trim().split('\n');
            const formats = lines
                .filter(line => line.includes('|'))
                .map(line => {
                    const parts = line.split('|');
                    return {
                        format_id: parts[0] || '',
                        ext: parts[1] || '',
                        resolution: parts[2] || 'N/A',
                        filesize: parts[3] || 'N/A',
                        vcodec: parts[4] || 'none',
                        acodec: parts[5] || 'none',
                        note: parts[6] || ''
                    };
                })
                .filter(format => format.format_id);

            // Get video title
            const titleProcess = spawn('yt-dlp', [
                '--get-title',
                '--no-warnings',
                url
            ]);

            let title = '';
            titleProcess.stdout.on('data', (data) => {
                title += data.toString();
            });

            titleProcess.on('close', () => {
                res.json({
                    title: title.trim() || 'Video',
                    formats: formats
                });
            });
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Download video
app.post('/api/download', async (req, res) => {
    const { url, format_id, title, start_time, end_time } = req.body;
    
    if (!url || !format_id) {
        return res.status(400).json({ error: 'URL and format_id are required' });
    }

    // Check if ffmpeg is required and available
    const isSegmentDownload = start_time !== undefined && end_time !== undefined;
    if (isSegmentDownload) {
        const ffmpegAvailable = await checkFfmpeg();
        if (!ffmpegAvailable) {
            return res.status(500).json({ 
                error: 'ffmpeg is required for segment downloads. Please install it: brew install ffmpeg' 
            });
        }
    }

    // Create filename with segment info if applicable
    let baseFilename = title || 'video';
    if (start_time && end_time) {
        const startStr = formatSecondsToTime(start_time);
        const endStr = formatSecondsToTime(end_time);
        baseFilename += `_${startStr}-${endStr}`;
    }
    const filename = `${baseFilename}_${format_id}.%(ext)s`;
    const outputPath = path.join(downloadsDir, filename);

    // Build yt-dlp arguments
    const ytDlpArgs = [
        '-f', format_id,
        '-o', outputPath,
        '--no-warnings'
    ];

    // Add download sections for time-based segments
    if (start_time !== undefined && end_time !== undefined) {
        const sectionString = `*${start_time}-${end_time}`;
        ytDlpArgs.push('--download-sections', sectionString);
    }

    ytDlpArgs.push(url);

    const ytDlp = spawn('yt-dlp', ytDlpArgs);

    let progress = '';
    
    ytDlp.stdout.on('data', (data) => {
        progress += data.toString();
        // Send progress updates
        const lines = progress.split('\n');
        const lastLine = lines[lines.length - 2] || '';
        if (lastLine.includes('%')) {
            // Extract progress percentage if available
            const match = lastLine.match(/(\d+\.?\d*)%/);
            if (match) {
                // You could implement WebSocket here for real-time progress
                console.log(`Progress: ${match[1]}%`);
            }
        }
    });

    ytDlp.stderr.on('data', (data) => {
        console.error(`yt-dlp stderr: ${data}`);
    });

    ytDlp.on('close', (code) => {
        if (code === 0) {
            // Find the downloaded file
            const files = fs.readdirSync(downloadsDir)
                .filter(file => file.includes(title || 'video'))
                .sort((a, b) => fs.statSync(path.join(downloadsDir, b)).mtime - fs.statSync(path.join(downloadsDir, a)).mtime);
            
            const downloadedFile = files[0];
            
            res.json({ 
                success: true, 
                message: 'Download completed',
                filename: downloadedFile,
                downloadPath: `/downloads/${downloadedFile}`
            });
        } else {
            res.status(500).json({ error: 'Download failed' });
        }
    });
});

// Serve downloaded files
app.use('/downloads', express.static(downloadsDir));

// List downloaded files
app.get('/api/downloads', (req, res) => {
    try {
        const files = fs.readdirSync(downloadsDir)
            .map(filename => ({
                filename,
                size: fs.statSync(path.join(downloadsDir, filename)).size,
                modified: fs.statSync(path.join(downloadsDir, filename)).mtime
            }))
            .sort((a, b) => b.modified - a.modified);
        
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 YouTube Downloader running on http://localhost:${PORT}`);
    console.log('Make sure yt-dlp is installed: pip install yt-dlp');
}); 