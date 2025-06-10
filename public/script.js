class YouTubeDownloader {
    constructor() {
        this.currentVideo = null;
        this.currentFormats = [];
        this.initializeElements();
        this.attachEventListeners();
        this.loadDownloads();
    }

    initializeElements() {
        this.urlInput = document.getElementById('urlInput');
        this.fetchButton = document.getElementById('fetchFormats');
        this.loading = document.getElementById('loading');
        this.videoInfo = document.getElementById('videoInfo');
        this.videoTitle = document.getElementById('videoTitle');
        this.formatsList = document.getElementById('formatsList');
        this.downloadsList = document.getElementById('downloadsList');
        this.notification = document.getElementById('notification');
        this.filterButtons = document.querySelectorAll('.filter-btn');
    }

    attachEventListeners() {
        this.fetchButton.addEventListener('click', () => this.fetchFormats());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchFormats();
        });

        // Format filters
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterFormats(e.target.dataset.filter);
            });
        });
    }

    async fetchFormats() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.showNotification('Please enter a YouTube URL', 'error');
            return;
        }

        if (!this.isValidYouTubeUrl(url)) {
            this.showNotification('Please enter a valid YouTube URL', 'error');
            return;
        }

        this.showLoading(true);
        this.fetchButton.disabled = true;

        try {
            const response = await fetch('/api/formats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch formats');
            }

            this.currentVideo = { url, title: data.title };
            this.currentFormats = data.formats;
            this.displayVideoInfo(data);
            this.showNotification('Formats loaded successfully!');

        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Error fetching formats:', error);
        } finally {
            this.showLoading(false);
            this.fetchButton.disabled = false;
        }
    }

    displayVideoInfo(data) {
        this.videoTitle.textContent = data.title;
        this.videoInfo.classList.remove('hidden');
        this.displayFormats(data.formats);
    }

    displayFormats(formats) {
        // Sort formats by quality and type
        const sortedFormats = formats.sort((a, b) => {
            // Prioritize video+audio formats
            const aHasBoth = a.vcodec !== 'none' && a.acodec !== 'none';
            const bHasBoth = b.vcodec !== 'none' && b.acodec !== 'none';
            
            if (aHasBoth && !bHasBoth) return -1;
            if (!aHasBoth && bHasBoth) return 1;

            // Then sort by resolution
            const aRes = this.parseResolution(a.resolution);
            const bRes = this.parseResolution(b.resolution);
            return bRes - aRes;
        });

        this.formatsList.innerHTML = sortedFormats.map(format => 
            this.createFormatItem(format)
        ).join('');
    }

    createFormatItem(format) {
        const hasVideo = format.vcodec !== 'none';
        const hasAudio = format.acodec !== 'none';
        const fileSize = format.filesize !== 'N/A' ? this.formatFileSize(format.filesize) : 'Unknown';
        
        let typeLabel = '';
        if (hasVideo && hasAudio) typeLabel = 'Video + Audio';
        else if (hasVideo) typeLabel = 'Video Only';
        else if (hasAudio) typeLabel = 'Audio Only';

        let qualityLabel = format.resolution;
        if (format.note && format.note !== 'N/A') {
            qualityLabel += ` (${format.note})`;
        }

        return `
            <div class="format-item" data-type="${typeLabel.toLowerCase().replace(' ', '-')}">
                <div class="format-info">
                    <div class="format-quality">${qualityLabel}</div>
                    <div class="format-details">
                        ${typeLabel} • ${format.ext.toUpperCase()} • ${fileSize}
                        ${hasVideo ? ` • Video: ${format.vcodec}` : ''}
                        ${hasAudio ? ` • Audio: ${format.acodec}` : ''}
                    </div>
                </div>
                <button class="download-btn" onclick="downloader.downloadFormat('${format.format_id}')">
                    Download
                </button>
            </div>
        `;
    }

    filterFormats(filter) {
        const items = document.querySelectorAll('.format-item');
        items.forEach(item => {
            const type = item.dataset.type;
            let show = false;

            switch (filter) {
                case 'all':
                    show = true;
                    break;
                case 'video':
                    show = type === 'video-+-audio';
                    break;
                case 'video-only':
                    show = type === 'video-only';
                    break;
                case 'audio-only':
                    show = type === 'audio-only';
                    break;
            }

            item.style.display = show ? 'flex' : 'none';
        });
    }

    async downloadFormat(formatId) {
        if (!this.currentVideo) return;

        this.showNotification('Starting download...');

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: this.currentVideo.url,
                    format_id: formatId,
                    title: this.currentVideo.title
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Download failed');
            }

            this.showNotification('Download completed!');
            this.loadDownloads(); // Refresh downloads list

        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Error downloading:', error);
        }
    }

    async loadDownloads() {
        try {
            const response = await fetch('/api/downloads');
            const downloads = await response.json();

            if (downloads.length === 0) {
                this.downloadsList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No downloads yet</p>';
                return;
            }

            this.downloadsList.innerHTML = downloads.map(download => `
                <div class="download-item">
                    <div class="download-info">
                        <div class="download-name">${download.filename}</div>
                        <div class="download-meta">
                            ${this.formatFileSize(download.size)} • ${new Date(download.modified).toLocaleString()}
                        </div>
                    </div>
                    <a href="/downloads/${download.filename}" class="download-link" download>
                        Download
                    </a>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading downloads:', error);
        }
    }

    showLoading(show) {
        this.loading.classList.toggle('hidden', !show);
    }

    showNotification(message, type = 'success') {
        this.notification.textContent = message;
        this.notification.className = `notification ${type}`;
        this.notification.classList.remove('hidden');

        setTimeout(() => {
            this.notification.classList.add('hidden');
        }, 4000);
    }

    isValidYouTubeUrl(url) {
        const patterns = [
            /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/,
            /^https?:\/\/(www\.)?youtube\.com\/watch\?v=.+/,
            /^https?:\/\/youtu\.be\/.+/
        ];
        return patterns.some(pattern => pattern.test(url));
    }

    parseResolution(resolution) {
        if (resolution === 'N/A' || !resolution) return 0;
        const match = resolution.match(/(\d+)p?/);
        return match ? parseInt(match[1]) : 0;
    }

    formatFileSize(bytes) {
        if (!bytes || bytes === 'N/A') return 'Unknown';
        
        const num = parseInt(bytes);
        if (isNaN(num)) return 'Unknown';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (num === 0) return '0 B';
        
        const i = Math.floor(Math.log(num) / Math.log(1024));
        return Math.round(num / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Initialize the downloader when the page loads
const downloader = new YouTubeDownloader(); 