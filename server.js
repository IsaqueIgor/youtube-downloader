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
app.post('/api/download', (req, res) => {
    const { url, format_id, title } = req.body;
    
    if (!url || !format_id) {
        return res.status(400).json({ error: 'URL and format_id are required' });
    }

    const filename = `${title || 'video'}_${format_id}.%(ext)s`;
    const outputPath = path.join(downloadsDir, filename);

    const ytDlp = spawn('yt-dlp', [
        '-f', format_id,
        '-o', outputPath,
        '--no-warnings',
        url
    ]);

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