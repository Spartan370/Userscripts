javascript:(function() {
    /*
     * === How to Install & Use This Bookmarklet ===
     * 1. Copy this entire code.
     * 2. Open your browser's bookmarks manager.
     * 3. Create a new bookmark.
     * 4. Paste this code into the "URL" section.
     * 5. Name it something like "Install Userscripts".
     * 6. Save the bookmark.
     * 7. Click the bookmark, and it will open all script links for easy installation in Tampermonkey.
     */

    let scripts = [
        "https://raw.githubusercontent.com/Spartan370/Userscripts/refs/heads/main/AutoTyper.js",
        "https://raw.githubusercontent.com/Spartan370/Userscripts/refs/heads/main/Blooket.js",
        "https://raw.githubusercontent.com/Spartan370/Userscripts/refs/heads/main/FacebookQD.js",
        "https://raw.githubusercontent.com/Spartan370/Userscripts/refs/heads/main/GFU.js",
        "https://raw.githubusercontent.com/Spartan370/Userscripts/refs/heads/main/HTML5%20Autoclicker.js",
        "https://raw.githubusercontent.com/Spartan370/Userscripts/refs/heads/main/ImageDownloader.js",
        "https://raw.githubusercontent.com/Spartan370/Userscripts/refs/heads/main/VideoDownloader.js"
    ];
    
    scripts.forEach(url => window.open(url, "_blank"));
})();


