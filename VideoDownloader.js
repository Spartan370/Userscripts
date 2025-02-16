// ==UserScript==
// @name         Universal Video Downloader
// @namespace    https://github.com/spartan370
// @version      5.0
// @description  Downloads videos from any website including embedded and streaming sources
// @author       Your Name
// @match        *://*/*
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @connect      *
// @require      https://cdn.jsdelivr.net/npm/hls.js@latest
// @require      https://cdn.jsdelivr.net/npm/dash.js@latest
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const SUPPORTED_FORMATS = {
        DIRECT: ['mp4', 'webm', 'mov', 'avi'],
        STREAMING: ['m3u8', 'mpd'],
        EMBEDDED: ['iframe', 'embed']
    };

    let downloadQueue = [];
    let isDownloading = false;

    GM_addStyle(`
        #video-download-ui {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(to bottom, #1a1a1a, #000000);
            color: white;
            padding: 15px;
            border-radius: 10px;
            border: 1px solid #800000;
            box-shadow: 0 4px 20px rgba(128, 0, 0, 0.3);
            z-index: 999999;
            font-family: Arial, sans-serif;
            min-width: 300px;
            display: none;
        }

        .download-progress {
            width: 100%;
            height: 4px;
            background: #333;
            border-radius: 2px;
            margin-top: 10px;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(to right, #800000, #ff0000);
            border-radius: 2px;
            width: 0%;
            transition: width 0.3s ease;
        }

        .download-status {
            margin-top: 5px;
            font-size: 12px;
            color: #ccc;
        }

        .quality-selector {
            margin-top: 10px;
            width: 100%;
            padding: 5px;
            background: #333;
            border: 1px solid #800000;
            color: white;
            border-radius: 4px;
        }

        .download-button {
            background: linear-gradient(to bottom, #800000, #660000);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
            width: 100%;
            transition: background 0.2s;
        }

        .download-button:hover {
            background: linear-gradient(to bottom, #990000, #800000);
        }
    `);

    class VideoDetector {
        constructor() {
            this.videoSources = new Set();
            this.currentFormats = new Set();
        }

        async findAllVideoSources() {
            this.videoSources.clear();
            this.currentFormats.clear();

            // Direct video elements
            this.scanVideoElements();

            // Embedded videos
            this.scanEmbeddedVideos();

            // Stream sources
            await this.scanStreamSources();

            // Deep HTML scan
            this.deepScan();

            return Array.from(this.videoSources);
        }

        scanVideoElements() {
            const videoElements = document.querySelectorAll('video');
            videoElements.forEach(video => {
                if (video.src) {
                    this.addVideoSource(video.src, 'direct');
                }
                const sources = video.querySelectorAll('source');
                sources.forEach(source => {
                    if (source.src) {
                        this.addVideoSource(source.src, 'direct');
                    }
                });
            });
        }

        scanEmbeddedVideos() {
            const iframes = document.querySelectorAll('iframe[src*="video"], iframe[src*="player"]');
            iframes.forEach(iframe => {
                const src = iframe.src;
                if (src.includes('channel1450.com')) {
                    this.handleChannel1450(iframe);
                } else if (src.includes('youtube.com')) {
                    this.handleYouTube(iframe);
                } else {
                    this.addVideoSource(src, 'embedded');
                }
            });
        }

        async scanStreamSources() {
            const manifestPatterns = [
                /\.m3u8(\?[^"']*)?["']/g,
                /\.mpd(\?[^"']*)?["']/g
            ];

            const pageContent = document.documentElement.innerHTML;
            for (const pattern of manifestPatterns) {
                const matches = pageContent.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        const url = match.slice(0, -1);
                        await this.validateStreamUrl(url);
                    }
                }
            }
        }

        async validateStreamUrl(url) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const content = await response.text();
                    if (content.includes('#EXTM3U') || content.includes('<MPD')) {
                        this.addVideoSource(url, 'streaming');
                    }
                }
            } catch (error) {
                console.warn('Stream validation failed:', error);
            }
        }

        deepScan() {
            const patterns = [
                /https?:\/\/[^"'\s]*?\.(?:mp4|webm|mov|m3u8|mpd)(?:\?[^"'\s]*)?/gi
            ];

            const pageContent = document.documentElement.innerHTML;
            patterns.forEach(pattern => {
                const matches = pageContent.match(pattern);
                if (matches) {
                    matches.forEach(url => this.addVideoSource(url, 'direct'));
                }
            });
        }

        addVideoSource(url, type) {
            if (!url) return;
            url = new URL(url, window.location.href).href;
            this.videoSources.add({
                url,
                type,
                quality: 'unknown',
                size: 'unknown'
            });
            this.currentFormats.add(type);
        }

        async handleChannel1450(iframe) {
            const videoId = new URLSearchParams(iframe.src.split('?')[1]).get('id');
            if (videoId) {
                try {
                    const response = await fetch(`https://www.channel1450.com/wp-json/wpb-video/v1/video-data/${videoId}`);
                    const data = await response.json();
                    if (data && data.video_url) {
                        this.addVideoSource(data.video_url, 'direct');
                    }
                } catch (error) {
                    console.warn('Channel1450 video fetch failed:', error);
                }
            }
        }
    }
    class VideoDownloader {
        constructor() {
            this.detector = new VideoDetector();
            this.ui = new DownloaderUI();
            this.currentVideo = null;
        }

        async initialize() {
            document.addEventListener('keydown', this.handleKeyPress.bind(this));
            this.setupStreamHandlers();
        }

        setupStreamHandlers() {
            this.hlsHandler = new Hls({
                debug: false,
                enableWorker: true
            });

            this.dashHandler = dashjs.MediaPlayer().create();
        }

        async handleKeyPress(e) {
            if (e.key === '`' && !e.target.matches('input, textarea, [contenteditable]')) {
                e.preventDefault();
                this.ui.showMessage('Scanning for videos...');

                const sources = await this.detector.findAllVideoSources();
                if (sources.length > 0) {
                    this.currentVideo = await this.getBestSource(sources);
                    if (this.currentVideo) {
                        this.startDownload(this.currentVideo);
                    }
                } else {
                    this.ui.showMessage('No videos found');
                }
            }
        }

        async getBestSource(sources) {
            let bestSource = null;
            let maxQuality = 0;

            for (const source of sources) {
                const quality = await this.getVideoQuality(source.url);
                if (quality > maxQuality) {
                    maxQuality = quality;
                    bestSource = source;
                }
            }

            return bestSource;
        }

        async getVideoQuality(url) {
            if (url.includes('m3u8')) {
                return await this.getHLSQuality(url);
            } else if (url.includes('mpd')) {
                return await this.getDASHQuality(url);
            } else {
                return await this.getDirectVideoQuality(url);
            }
        }

        async startDownload(video) {
            this.ui.showDownloadProgress();

            switch(video.type) {
                case 'direct':
                    await this.downloadDirectVideo(video.url);
                    break;
                case 'streaming':
                    if (video.url.includes('m3u8')) {
                        await this.downloadHLSStream(video.url);
                    } else if (video.url.includes('mpd')) {
                        await this.downloadDASHStream(video.url);
                    }
                    break;
                case 'embedded':
                    await this.handleEmbeddedVideo(video.url);
                    break;
            }
        }

        async downloadDirectVideo(url) {
            const filename = this.generateFilename(url);

            try {
                const response = await fetch(url);
                const total = parseInt(response.headers.get('content-length'), 10);
                let loaded = 0;

                const reader = response.body.getReader();
                const chunks = [];

                while(true) {
                    const {done, value} = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    loaded += value.length;
                    this.ui.updateProgress((loaded / total) * 100);
                }

                const blob = new Blob(chunks, {type: 'video/mp4'});
                this.saveVideo(blob, filename);
                this.ui.showMessage('Download complete!');
            } catch (error) {
                this.ui.showMessage('Download failed. Trying alternate method...');
                this.fallbackDownload(url, filename);
            }
        }

        async downloadHLSStream(url) {
            try {
                const segments = await this.getHLSSegments(url);
                const chunks = [];
                let loaded = 0;

                for (let i = 0; i < segments.length; i++) {
                    const response = await fetch(segments[i]);
                    const chunk = await response.arrayBuffer();
                    chunks.push(chunk);
                    loaded++;
                    this.ui.updateProgress((loaded / segments.length) * 100);
                }

                const blob = new Blob(chunks, {type: 'video/mp4'});
                this.saveVideo(blob, this.generateFilename(url));
                this.ui.showMessage('Download complete!');
            } catch (error) {
                this.ui.showMessage('HLS download failed');
                console.error('HLS download error:', error);
            }
        }

        async downloadDASHStream(url) {
            try {
                const manifest = await this.dashHandler.retrieveManifest(url);
                const videoAdaptationSet = manifest.Period[0].AdaptationSet.find(set => set.contentType === 'video');
                const bestQuality = videoAdaptationSet.Representation.reduce((prev, current) =>
                    (current.bandwidth > prev.bandwidth) ? current : prev
                );

                const segments = await this.getDASHSegments(bestQuality);
                // Similar to HLS download process
                // Implementation continues...
            } catch (error) {
                this.ui.showMessage('DASH download failed');
                console.error('DASH download error:', error);
            }
        }

        generateFilename(url) {
            const urlParts = new URL(url);
            const baseName = urlParts.pathname.split('/').pop() || 'video';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            return `${baseName}_${timestamp}.mp4`;
        }

        saveVideo(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        fallbackDownload(url, filename) {
            GM_download({
                url: url,
                name: filename,
                onload: () => this.ui.showMessage('Download complete!'),
                onerror: () => this.ui.showMessage('Download failed')
            });
        }
    }
    class DownloaderUI {
        constructor() {
            this.createUI();
        }

        createUI() {
            this.container = document.createElement('div');
            this.container.id = 'video-download-ui';

            this.statusElement = document.createElement('div');
            this.statusElement.className = 'download-status';

            this.progressContainer = document.createElement('div');
            this.progressContainer.className = 'download-progress';

            this.progressBar = document.createElement('div');
            this.progressBar.className = 'progress-bar';

            this.progressContainer.appendChild(this.progressBar);
            this.container.appendChild(this.statusElement);
            this.container.appendChild(this.progressContainer);

            document.body.appendChild(this.container);
        }

        showMessage(message) {
            this.container.style.display = 'block';
            this.statusElement.textContent = message;

            if (!message.includes('progress')) {
                setTimeout(() => {
                    this.container.style.display = 'none';
                }, 3000);
            }
        }

        showDownloadProgress() {
            this.container.style.display = 'block';
            this.progressBar.style.width = '0%';
        }

        updateProgress(percent) {
            this.progressBar.style.width = `${percent}%`;
            this.statusElement.textContent = `Downloading: ${Math.round(percent)}%`;
        }

        hideUI() {
            this.container.style.display = 'none';
        }
    }

    // Stream handling utilities
    class StreamUtils {
        static async fetchManifest(url) {
            try {
                const response = await fetch(url);
                return await response.text();
            } catch (error) {
                console.error('Manifest fetch error:', error);
                return null;
            }
        }

        static parseM3U8(content) {
            const lines = content.split('\n');
            const segments = [];

            lines.forEach(line => {
                if (line.startsWith('http') || line.endsWith('.ts')) {
                    segments.push(line.trim());
                }
            });

            return segments;
        }

        static async getStreamMetadata(url) {
            const manifest = await this.fetchManifest(url);
            if (!manifest) return null;

            return {
                type: url.includes('m3u8') ? 'HLS' : 'DASH',
                segments: url.includes('m3u8') ? this.parseM3U8(manifest) : [],
                rawManifest: manifest
            };
        }
    }

    // Initialize the downloader
    const videoDownloader = new VideoDownloader();
    videoDownloader.initialize().then(() => {
        console.log('Video downloader initialized');
    }).catch(error => {
        console.error('Initialization failed:', error);
    });

    // Utility functions
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function sanitizeFilename(name) {
        return name.replace(/[/\\?%*:|"<>]/g, '-');
    }

    // Error handling
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
    });
})();
