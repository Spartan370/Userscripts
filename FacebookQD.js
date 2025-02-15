// ==UserScript==
// @name         Facebook Photo Downloader
// @namespace    https://github.com/spartan370
// @version      1.3
// @license      MIT
// @description  Press the ` key on Facebook pages to download images
// @author       Connor Morrissey
// @match        *://*.facebook.com/*
// @match        *://m.facebook.com/*
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
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
        GM_setValue('download_counter', 1); // Reset counter to 1
    }

    function findImage() {
        const img = document.querySelector('img[referrerpolicy]');
        return img ? img.src : null;
    }

    function downloadImage(url) {
        const count = getCounter();
        const filename = `facebook_image_${count}.jpg`;

        if (typeof GM_download === 'function') {
            GM_download(url, filename);
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
        if (e.key === '`' && !e.target.matches('input, textarea, [contenteditable]')) {
            const imgUrl = findImage();
            if (imgUrl) {
                downloadImage(imgUrl);
            } else {
                alert('No downloadable image found.');
            }
        }

        // Reset counter if you press 'r' key (you can change this key if needed)
        if (e.key === 'r' && !e.target.matches('input, textarea, [contenteditable]')) {
            resetCounter();
            alert('Download counter has been reset.');
        }
    });
})();
