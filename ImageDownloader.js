// ==UserScript==
// @name         Universal Image Downloader
// @namespace    https://github.com/sourcegraph
// @version      1.0
// @license      MIT
// @description  Press the ` key on any website to download images. Use 'r' to reset counter.
// @author       Connor M
// @match        *://*/*
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    function getCounter() {
        return GM_getValue('download_counter', 1);
    }

    function incrementCounter() {
        const counter = getCounter() + 1;
        GM_setValue('download_counter', counter);
        return counter;
    }

    function resetCounter() {
        GM_setValue('download_counter', 1);
    }

    function findImages() {
        // Get all visible images on the page
        const images = Array.from(document.querySelectorAll('img')).filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.width > 50 && rect.height > 50 && img.src;
        });

        // Sort images by size (largest first)
        return images.sort((a, b) => {
            const areaA = a.width * a.height;
            const areaB = b.width * b.height;
            return areaB - areaA;
        });
    }

    function showImageSelector(images) {
        const existingSelector = document.getElementById('image-selector');
        if (existingSelector) {
            existingSelector.remove();
        }

        // Create image selector overlay
        const selector = document.createElement('div');
        selector.id = 'image-selector';
        selector.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            padding: 20px;
            border-radius: 10px;
            z-index: 999999;
            max-width: 80vw;
            max-height: 80vh;
            overflow: auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
        `;

        images.forEach((img, index) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                cursor: pointer;
                border: 2px solid transparent;
                padding: 5px;
                text-align: center;
            `;

            const preview = document.createElement('img');
            preview.src = img.src;
            preview.style.cssText = `
                max-width: 100%;
                max-height: 150px;
                object-fit: contain;
            `;

            wrapper.appendChild(preview);
            wrapper.onclick = () => {
                downloadImage(img.src);
                selector.remove();
            };

            wrapper.onmouseover = () => {
                wrapper.style.border = '2px solid #3498db';
            };

            wrapper.onmouseout = () => {
                wrapper.style.border = '2px solid transparent';
            };

            selector.appendChild(wrapper);
        });

        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
        `;
        closeButton.onclick = () => selector.remove();
        selector.appendChild(closeButton);

        document.body.appendChild(selector);
    }

    function downloadImage(url) {
        const count = getCounter();
        const filename = `image_${count}.jpg`;

        if (typeof GM_download === 'function') {
            GM_download({
                url: url,
                name: filename,
                onload: () => {
                    GM_notification({
                        text: `Downloaded: ${filename}`,
                        timeout: 3000
                    });
                }
            });
        } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        incrementCounter();
    }

    document.addEventListener('keydown', function(e) {
        if (e.target.matches('input, textarea, [contenteditable]')) return;

        if (e.key === '`') {
            const images = findImages();
            if (images.length > 0) {
                showImageSelector(images);
            } else {
                GM_notification({
                    text: 'No suitable images found on this page.',
                    timeout: 3000
                });
            }
        }

        if (e.key === 'r') {
            resetCounter();
            GM_notification({
                text: 'Download counter has been reset.',
                timeout: 3000
            });
        }
    });

    // Add style for hover effect
    const style = document.createElement('style');
    style.textContent = `
        #image-selector::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }
        #image-selector::-webkit-scrollbar-thumb {
            background: #666;
            border-radius: 5px;
        }
        #image-selector::-webkit-scrollbar-track {
            background: #333;
            border-radius: 5px;
        }
    `;
    document.head.appendChild(style);
})();
