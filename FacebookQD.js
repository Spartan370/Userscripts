// ==UserScript==
// @name         Advanced Facebook Photo Sequential Downloader
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Advanced Facebook photo downloader with sequential naming
// @author       Cody
// @match        https://*.facebook.com/*
// @match        https://*.facebook.com
// @match        https://www.facebook.com/photo/
// @grant        GM_download
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @connect      fbcdn.net
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        DOWNLOAD_DELAY: 500,
        NOTIFICATION_DURATION: 3000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        IMAGE_QUALITY: 'original',
        COUNTER_POSITION: {
            bottom: '20px',
            right: '20px'
        }
    };

    class FacebookPhotoDownloader {
        constructor() {
            this.downloadQueue = [];
            this.isProcessing = false;
            this.initializeCounter();
            this.setupUI();
            this.bindEvents();
        }

        initializeCounter() {
            if (!GM_getValue('downloadCounter')) {
                GM_setValue('downloadCounter', 1);
            }
            this.currentCounter = GM_getValue('downloadCounter');
        }

        setupUI() {
            const styles = `
                .fb-photo-downloader {
                    position: fixed;
                    bottom: ${CONFIG.COUNTER_POSITION.bottom};
                    right: ${CONFIG.COUNTER_POSITION.right};
                    background: rgba(24, 119, 242, 0.9);
                    color: white;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    z-index: 9999;
                    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    transition: all 0.3s ease;
                }
                .fb-photo-downloader:hover {
                    background: rgba(24, 119, 242, 1);
                }
                .fb-photo-downloader button {
                    background: white;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 4px;
                    color: #1877f2;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.2s ease;
                }
                .fb-photo-downloader button:hover {
                    background: #f0f2f5;
                    transform: translateY(-1px);
                }
                .download-progress {
                    height: 3px;
                    background: #e4e6eb;
                    border-radius: 2px;
                    overflow: hidden;
                }
                .progress-bar {
                    height: 100%;
                    background: #ffffff;
                    width: 0%;
                    transition: width 0.3s ease;
                }
            `;

            const styleElement = document.createElement('style');
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);

            this.container = document.createElement('div');
            this.container.className = 'fb-photo-downloader';
            this.container.innerHTML = `
                <div class="counter-display">Next download: #${this.currentCounter}</div>
                <div class="download-progress">
                    <div class="progress-bar"></div>
                </div>
                <button class="reset-button">Reset Counter</button>
            `;

            document.body.appendChild(this.container);
        }

        bindEvents() {
            document.addEventListener('keypress', this.handleKeyPress.bind(this));
            this.container.querySelector('.reset-button').addEventListener('click', () => this.resetCounter());

            new MutationObserver(() => this.updateUI())
                .observe(document.body, { childList: true, subtree: true });
        }

        async handleKeyPress(event) {
            if (event.key !== '`') return;

            const photoContainer = this.findPhotoContainer();
            if (!photoContainer) {
                this.showNotification('No photo found on this page!', 'error');
                return;
            }

            try {
                const imageUrl = await this.extractHighestQualityImageUrl(photoContainer);
                if (!imageUrl) {
                    this.showNotification('Could not find image URL!', 'error');
                    return;
                }

                await this.queueDownload(imageUrl);
            } catch (error) {
                this.showNotification(`Error: ${error.message}`, 'error');
                console.error('Download error:', error);
            }
        }

        findPhotoContainer() {
            return document.querySelector('img[data-visualcompletion="media-vc-image"]') ||
                   document.querySelector('img[data-visualcompletion="media-vc-image"][src*="scontent"]');
        }

        async extractHighestQualityImageUrl(container) {
            const baseUrl = container.src.split('?')[0];
            return `${baseUrl}?quality=${CONFIG.IMAGE_QUALITY}&width=4096`;
        }

        async queueDownload(url) {
            this.downloadQueue.push(url);
            if (!this.isProcessing) {
                this.processQueue();
            }
        }

        async processQueue() {
            if (this.downloadQueue.length === 0) {
                this.isProcessing = false;
                return;
            }

            this.isProcessing = true;
            const url = this.downloadQueue.shift();
            const fileName = `${this.currentCounter}.jpg`;

            try {
                await this.downloadWithRetry(url, fileName);
                this.incrementCounter();
                this.updateUI();
                this.showNotification('Download completed!', 'success');

                setTimeout(() => this.processQueue(), CONFIG.DOWNLOAD_DELAY);
            } catch (error) {
                this.showNotification(`Download failed: ${error.message}`, 'error');
                this.isProcessing = false;
            }
        }

        async downloadWithRetry(url, fileName, attempts = 0) {
            try {
                await new Promise((resolve, reject) => {
                    GM_download({
                        url: url,
                        name: fileName,
                        onload: resolve,
                        onerror: reject
                    });
                });
            } catch (error) {
                if (attempts < CONFIG.RETRY_ATTEMPTS) {
                    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                    return this.downloadWithRetry(url, fileName, attempts + 1);
                }
                throw error;
            }
        }

        incrementCounter() {
            this.currentCounter++;
            GM_setValue('downloadCounter', this.currentCounter);
        }

        resetCounter() {
            this.currentCounter = 1;
            GM_setValue('downloadCounter', 1);
            this.updateUI();
            this.showNotification('Counter reset to 1', 'info');
        }

        updateUI() {
            const counterDisplay = this.container.querySelector('.counter-display');
            if (counterDisplay) {
                counterDisplay.textContent = `Next download: #${this.currentCounter}`;
            }
        }

        showNotification(message, type) {
            GM_notification({
                text: message,
                title: 'FB Photo Downloader',
                timeout: CONFIG.NOTIFICATION_DURATION,
                image: type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'
            });
        }
    }

    new FacebookPhotoDownloader();
})();
