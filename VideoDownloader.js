// ==UserScript==
// @name         Ultimate Video Downloader - Channel1450
// @namespace    https://github.com/spartan370
// @version      4.1
// @description  Press ` to download videos from Channel1450 and other sites
// @author       Your Name
// @match        *://*/*
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        #download-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(to bottom, #800000, #4d0000);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none;
            animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `);

    function extractVideoFromChannel1450() {
        return new Promise((resolve) => {
            const iframes = document.querySelectorAll('iframe');
            let videoUrl = null;

            iframes.forEach(iframe => {
                if (iframe.src.includes('wpb-video-embed')) {
                    const videoId = new URLSearchParams(iframe.src.split('?')[1]).get('id');
                    if (videoId) {
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: `https://www.channel1450.com/wp-json/wpb-video/v1/video-data/${videoId}`,
                            onload: function(response) {
                                try {
                                    const data = JSON.parse(response.responseText);
                                    if (data && data.video_url) {
                                        videoUrl = data.video_url;
                                        resolve(videoUrl);
                                    }
                                } catch (e) {
                                    resolve(null);
                                }
                            },
                            onerror: function() {
                                resolve(null);
                            }
                        });
                    }
                }
            });

            // If no video found within 5 seconds, resolve null
            setTimeout(() => resolve(null), 5000);
        });
    }

    function findMainVideo() {
        return new Promise(async (resolve) => {
            // Try Channel1450 specific method first
            const channel1450Video = await extractVideoFromChannel1450();
            if (channel1450Video) {
                resolve(channel1450Video);
                return;
            }

            // Fallback to other methods
            const sources = [
                Array.from(document.querySelectorAll('video')).find(v => !v.paused),
                Array.from(document.querySelectorAll('video')).sort((a, b) => 
                    (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight)
                )[0],
                document.querySelector('source[type="video/mp4"]'),
                document.querySelector('meta[property="og:video"]'),
                document.querySelector('meta[property="og:video:url"]')
            ];

            for (let source of sources) {
                if (source) {
                    const videoUrl = getVideoUrl(source);
                    if (videoUrl) {
                        resolve(videoUrl);
                        return;
                    }
                }
            }

            // Deep scan as last resort
            const deepScanUrl = scanForVideoUrls();
            resolve(deepScanUrl);
        });
    }

    function getVideoUrl(element) {
        if (element instanceof HTMLVideoElement) {
            return element.src || element.currentSrc;
        } else if (element instanceof HTMLSourceElement) {
            return element.src;
        } else if (element instanceof HTMLMetaElement) {
            return element.content;
        }
        return null;
    }

    function scanForVideoUrls() {
        const htmlContent = document.documentElement.innerHTML;
        const videoPatterns = [
            /https?:\/\/[^"\s<>]*?\.mp4[^"\s<>]*/ig,
            /https?:\/\/[^"\s<>]*?\/video[^"\s<>]*/ig,
            /https?:\/\/[^"\s<>]*?\/media[^"\s<>]*\.mp4[^"\s<>]*/ig
        ];

        for (let pattern of videoPatterns) {
            const matches = htmlContent.match(pattern);
            if (matches && matches.length > 0) {
                return matches[0];
            }
        }
        return null;
    }

    function getVideoTitle() {
        const titleSources = [
            document.querySelector('meta[property="og:title"]')?.content,
            document.querySelector('h1')?.textContent,
            document.title,
            'video_' + Date.now()
        ];

        for (let title of titleSources) {
            if (title) {
                return title.trim()
                    .replace(/[/\\?%*:|"<>]/g, '-')
                    .replace(/\s+/g, '_')
                    .substring(0, 100);
            }
        }
    }

    function showNotification(message) {
        let notification = document.getElementById('download-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'download-notification';
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    function downloadVideo(url) {
        const filename = `${getVideoTitle()}.mp4`;
        
        showNotification('Starting download...');

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            responseType: 'blob',
            onload: function(response) {
                const blob = new Blob([response.response], { type: 'video/mp4' });
                const blobUrl = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
                
                showNotification('Download complete!');
            },
            onerror: function() {
                showNotification('Download failed. Trying alternate method...');
                window.open(url, '_blank');
            }
        });
    }

    async function handleKeyPress(e) {
        if (e.key === '`' && !e.target.matches('input, textarea, [contenteditable]')) {
            e.preventDefault();
            showNotification('Searching for video...');
            
            const videoUrl = await findMainVideo();
            if (videoUrl) {
                downloadVideo(videoUrl);
            } else {
                showNotification('No video found on this page');
            }
        }
    }

    document.addEventListener('keydown', handleKeyPress);
})();
