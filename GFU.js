// ==UserScript==
// @name         GFU Enhanced
// @namespace    http://tampermonkey.net/
// @version      1.
// @description  Advanced Google Forms Unlocker with enhanced security and features
// @author       Connor M
// @match        *://docs.google.com/forms/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @updateURL    https://github.com/Spartan370/GFU/raw/main/GFU.js
// @downloadURL  https://github.com/Spartan370/GFU/raw/main/GFU.js
// ==/UserScript==

class GoogleFormsUnlocker {
    static CONFIG = {
        EXTENSION_ID: 'gndmhdcefbhlchkhipcnnbkcmicncehk',
        ERROR_TYPES: {
            USER_AGENT: '_useragenterror',
            UNKNOWN: '_unknown'
        }
    };

    constructor() {
        this.shouldSpoof = location.hash === '#gfu';
        this.fakeIsLocked = this.shouldSpoof;
        this.setupBrowserCompatibility();
        this.initializeStyles();
        this.setupEventListeners();
        this.preventVisibilityDetection();
    }

    setupBrowserCompatibility() {
        unsafeWindow.chrome = unsafeWindow.chrome || {};
        unsafeWindow.chrome.runtime = unsafeWindow.chrome.runtime || {};
        this.originalSendMessage = unsafeWindow.chrome.runtime.sendMessage || function(extId, payload, callback) {
            chrome.runtime.lastError = 1;
            callback();
        };
        unsafeWindow.chrome.runtime.sendMessage = this.interceptMessageProxy.bind(this);
    }

    initializeStyles() {
        GM_addStyle(`
            .gfu-button {
                background: #ff90bf;
                border-radius: 4px;
                transition: all 0.3s ease;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            .gfu-error {
                font-family: monospace;
                color: #ff4444;
                font-size: 12px;
                padding: 12px;
                text-align: center;
            }
            .gfu-blurred {
                transition: filter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                filter: blur(8px) !important;
            }
            .gfu-blurred:hover {
                filter: blur(0) !important;
            }
        `);
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') {
                this.bypassForm();
            }
        });
    }

    preventVisibilityDetection() {
        const visibilityProperties = ['hidden', 'visibilityState', 'webkitVisibilityState', 'mozVisibilityState', 'msVisibilityState'];
        visibilityProperties.forEach(prop => {
            Object.defineProperty(document, prop, {
                value: prop === 'hidden' ? false : 'visible',
                writable: false
            });
        });

        const oldAddEventListener = document.addEventListener;
        document.addEventListener = function(type, listener, options) {
            if (!['visibilitychange', 'webkitvisibilitychange', 'mozvisibilitychange', 'msvisibilitychange'].includes(type)) {
                oldAddEventListener.call(this, type, listener, options);
            }
        };
    }

    getGoogleForm() {
        const containers = document.querySelectorAll('div.RGiwf');
        for (const container of containers) {
            for (const child of container.childNodes) {
                if (child.nodeName === 'FORM') {
                    return child;
                }
            }
        }
        return null;
    }

    getQuizHeader() {
        return document.querySelector('div.mGzJpd');
    }

    checkForErrors() {
        const header = this.getQuizHeader();
        if (!header) return null;

        const errorNodes = header.querySelectorAll('[aria-live="assertive"]');
        if (errorNodes.length >= 2) {
            return {
                title: errorNodes[0].innerText,
                description: errorNodes[1].innerText
            };
        }
        return null;
    }

    async isOnChromebook() {
        return new Promise(resolve => {
            this.originalSendMessage(GoogleFormsUnlocker.CONFIG.EXTENSION_ID, {command: 'isLocked'}, response => {
                resolve(!chrome.runtime.lastError);
            });
        });
    }

    createButton(text, callback, color) {
        const form = this.getGoogleForm();
        if (!form) return null;

        const buttonHolder = form.childNodes[2];
        const button = document.createElement('div');
        
        button.className = 'uArJ5e UQuaGc Y5sE8d TIHcue QvWxOd gfu-button';
        button.style.marginLeft = '10px';
        button.style.backgroundColor = color;
        button.setAttribute('role', 'button');
        button.setAttribute('tabindex', buttonHolder.childNodes.length);
        button.setAttribute('data-gfu-button', 'true');

        const glow = document.createElement('div');
        glow.className = 'Fvio9d MbhUzd';
        button.appendChild(glow);

        const textContainer = document.createElement('span');
        textContainer.className = 'l4V7wb Fxmcue';
        const textSpan = document.createElement('span');
        textSpan.className = 'NPEfkd RveJvd snByac';
        textSpan.textContent = text;
        textContainer.appendChild(textSpan);
        button.appendChild(textContainer);

        button.addEventListener('click', callback);
        buttonHolder.appendChild(button);

        return button;
    }

    interceptMessageProxy(extensionId, payload, callback) {
        if (extensionId === GoogleFormsUnlocker.CONFIG.EXTENSION_ID) {
            switch (payload.command) {
                case 'isLocked':
                    callback({locked: this.fakeIsLocked});
                    return;
                case 'lock':
                    if (!this.shouldSpoof) return false;
                    this.fakeIsLocked = false;
                    callback({locked: this.fakeIsLocked});
                    return;
                case 'unlock':
                    this.fakeIsLocked = false;
                    callback({locked: this.fakeIsLocked});
                    return;
            }
        }
        
        this.originalSendMessage(extensionId, payload, (...args) => {
            if (chrome.runtime.lastError) {
                console.error('GFU Error:', chrome.runtime.lastError);
                return;
            }
            callback(...args);
        });
    }

    async bypassForm() {
        location.hash = 'gfu';
        location.reload();
    }

    handleError(error) {
        if (error.title === "You can't access this quiz." && 
            error.description === "Locked mode is on. Only respondents using managed Chromebooks can open this quiz. Learn more") {
            const header = this.getQuizHeader();
            const errorDiv = document.createElement('div');
            errorDiv.className = 'gfu-error';
            errorDiv.innerHTML = `
                Google Forms Unlocker - In order to continue, you need a User Agent Spoofer. 
                <a href="https://github.com/xNasuni/google-forms-unlocker/blob/main/README.md#spoofing-your-user-agent" 
                   target="_blank" rel="noopener" class="gfu-error">Install one here.</a>
            `;
            header.appendChild(errorDiv);
        } else {
            console.error('Unhandled GFU error:', error);
        }
    }

    async initialize() {
        const error = this.checkForErrors();
        if (error) {
            this.handleError(error);
            return;
        }

        const form = this.getGoogleForm();
        if (!form) return;

        const isChromebook = await this.isOnChromebook();
        if (!isChromebook) {
            const buttonHolder = form.childNodes[2];
            for (const button of buttonHolder.childNodes) {
                if (!button.getAttribute('data-gfu-button')) {
                    button.style.backgroundColor = '#ccc';
                    button.setAttribute('jsaction', '');
                }
            }
        }

        this.createButton('Bypass', () => this.bypassForm(), '#ff90bf');
    }
}

const unlocker = new GoogleFormsUnlocker();
document.addEventListener('DOMContentLoaded', () => unlocker.initialize());
setInterval(() => {
    unsafeWindow.chrome.runtime.sendMessage = function() {
        const ExtensionId = (arguments)[0];
        const Payload = (arguments)[1];
        const Callback = (arguments)[2];

        if (ExtensionId === GoogleFormsUnlocker.CONFIG.EXTENSION_ID) {
            const Intercepted = InterceptCommand(Payload, Callback);
            if (Intercepted) { return null; }
        }
        console.warn("Not intercepting", ExtensionId, Payload, Callback);

        return oldSendMessage(ExtensionId, Payload, function() {
            if (unsafeWindow.chrome.runtime.lastError) {
                alert(`Google Forms Unlocker, please report this to the GitHub https://github.com/xNasuni/google-forms-unlocker/issues\nUnhandled error: ${JSON.stringify(chrome.runtime.lastError)}`);
                return;
            }
            Callback.apply(this, arguments);
        });
    }
});

unsafeWindow.document.addEventListener("DOMContentLoaded", () => {
    unsafeWindow.console.log("Initialized");
    Initialize();
});

Object.defineProperty(unsafeWindow.document, 'hidden', {
    value: false,
    writable: false
});

Object.defineProperty(unsafeWindow.document, 'visibilityState', {
    value: "visible",
    writable: false
});

Object.defineProperty(unsafeWindow.document, 'webkitVisibilityState', {
    value: "visible",
    writable: false
});

Object.defineProperty(unsafeWindow.document, 'mozVisibilityState', {
    value: "visible",
    writable: false
});

Object.defineProperty(unsafeWindow.document, 'msVisibilityState', {
    value: "visible",
    writable: false
});

const BlacklistedEvents = ['mozvisibilitychange', 'webkitvisibilitychange', 'msvisibilitychange', 'visibilitychange'];
const oldAddEventListener = unsafeWindow.document.addEventListener;
unsafeWindow.document.addEventListener = function() {
    const EventType = (arguments)[0];
    const Method = (arguments)[1];
    const Options = (arguments)[2];

    if (BlacklistedEvents.indexOf(EventType) !== -1) {
        console.log(`type ${EventType} blocked from being registered with`, Method);
        return;
    }

    return oldAddEventListener.apply(this, arguments);
}
