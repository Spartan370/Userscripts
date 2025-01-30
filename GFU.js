// ==UserScript==
// @name         GFU Enhanced
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Unlocks Google Forms and provides quick ChatGPT access
// @author       Connor M
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-start
// @license      GPL-3.0
// ==/UserScript==

const CONFIG = {
    EXTENSION_ID: 'gndmhdcefbhlchkhipcnnbkcmicncehk',
    ERRORS: {
        USER_AGENT: '_useragenterror',
        UNKNOWN: '_unknown'
    },
    CSS_CLASSES: {
        FORM_CONTAINER: 'RGiwf',
        QUIZ_HEADER: 'mGzJpd'
    }
};

const state = {
    shouldSpoof: location.hash === '#gfu',
    fakeIsLocked: location.hash === '#gfu'
};

unsafeWindow.chrome = unsafeWindow.chrome || {};
unsafeWindow.chrome.runtime = unsafeWindow.chrome.runtime || {};
const originalSendMessage = unsafeWindow.chrome.runtime.sendMessage || function(extId, payload, callback) {
    chrome.runtime.lastError = 1;
    callback();
};

if (typeof GM_addStyle === 'undefined') {
    GM_addStyle = function(css) {
        const style = unsafeWindow.document.getElementById('GM_addStyleBy8626') || (() => {
            const style = unsafeWindow.document.createElement('style');
            style.type = 'text/css';
            style.id = 'GM_addStyleBy8626';
            unsafeWindow.document.head.appendChild(style);
            return style;
        })();
        const sheet = style.sheet;
        sheet.insertRule(css, (sheet.rules || sheet.cssRules || []).length);
    };
}

GM_addStyle(`
    .gfu-red {
        font-family: monospace;
        text-align: center;
        font-size: 11px;
        padding-top: 24px;
        color: red !important;
    }
    .EbMsme {
        transition: filter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        filter: blur(8px) !important;
    }
    .EbMsme:hover {
        filter: blur(0px) !important;
    }
    @keyframes slideIn {
        from { opacity: 0; transform: translateX(20px) rotate(-90deg); }
        to { opacity: 1; transform: translateX(0) rotate(-90deg); }
    }
    #pulloutContainer {
        position: fixed;
        right: -35px;
        top: 50%;
        z-index: 9999;
        animation: slideIn 0.5s ease forwards;
    }
    #pulloutTab {
        position: relative;
        transform: rotate(-90deg);
        background: linear-gradient(145deg, #800000, #600000);
        padding: 12px 25px;
        border-radius: 12px 12px 0 0;
        cursor: pointer;
        color: #fff;
        font-family: 'Arial', sans-serif;
        font-weight: 600;
        font-size: 14px;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 2px solid #600000;
        text-transform: uppercase;
        user-select: none;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    #pulloutTab:hover {
        background: linear-gradient(145deg, #600000, #400000);
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        transform: rotate(-90deg) scale(1.05);
    }
    #pulloutTab::before {
        content: '';
        display: inline-block;
        width: 8px;
        height: 8px;
        background: #fff;
        border-radius: 50%;
        margin-right: 5px;
        box-shadow: 0 0 10px rgba(255,255,255,0.5);
    }
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255,255,255,0.4);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
    }
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`);

function ButtonAction() {
    location.hash = "gfu";
    location.reload();
}

function MatchExtensionId(ExtensionId) {
    return ExtensionId === CONFIG.EXTENSION_ID;
}

function GetGoogleForm() {
    const containers = unsafeWindow.document.querySelectorAll(`div.${CONFIG.CSS_CLASSES.FORM_CONTAINER}`);
    for (const container of containers) {
        for (const child of container.childNodes) {
            if (child.nodeName === 'FORM') return child;
        }
    }
    return undefined;
}

function GetQuizHeader() {
    return unsafeWindow.document.querySelector(`div.${CONFIG.CSS_CLASSES.QUIZ_HEADER}`);
}

function PageIsErrored() {
    const QuizHeader = GetQuizHeader();
    if (QuizHeader === null) return false;
    const ChildNodes = QuizHeader.childNodes;
    if (ChildNodes[3].getAttribute("aria-live") === "assertive" && ChildNodes[4].getAttribute("aria-live") === "assertive") {
        return {title: ChildNodes[3].innerText, description: ChildNodes[4].innerText};
    }
    return false;
}

function MatchErrorType(error) {
    if (error.title === "You can't access this quiz." && error.description === "Locked mode is on. Only respondents using managed Chromebooks can open this quiz. Learn more") {
        return CONFIG.ERRORS.USER_AGENT;
    }
    return CONFIG.ERRORS.UNKNOWN;
}

function MakeButton(Text, Callback, Color) {
    const Form = GetGoogleForm();
    if (Form === undefined) return false;
    const ButtonHolder = Form.childNodes[2];
    const Button = unsafeWindow.document.createElement("div");
    Button.classList.value = "uArJ5e UQuaGc Y5sE8d TIHcue QvWxOd";
    Button.style.marginLeft = "10px";
    Button.style.backgroundColor = Color;
    Button.setAttribute("role", "button");
    Button.setAttribute("tabindex", ButtonHolder.childNodes.length);
    Button.setAttribute("mia-gfu-state", "custom-button");
    ButtonHolder.appendChild(Button);
    const Glow = unsafeWindow.document.createElement("div");
    Glow.classList.value = "Fvio9d MbhUzd";
    Glow.style.top = '21px';
    Glow.style.left = '9px';
    Glow.style.width = '110px';
    Glow.style.height = '110px';
    Button.appendChild(Glow);
    const TextContainer = unsafeWindow.document.createElement("span");
    TextContainer.classList.value = "l4V7wb Fxmcue";
    Button.appendChild(TextContainer);
    const TextSpan = unsafeWindow.document.createElement("span");
    TextSpan.classList.value = "NPEfkd RveJvd snByac";
    TextSpan.innerText = Text;
    TextContainer.appendChild(TextSpan);
    Button.addEventListener("click", Callback);
    return {destroy: function(){Button.remove()}};
}

async function IsOnChromebook() {
    return new Promise((resolve, _reject) => {
        originalSendMessage(CONFIG.EXTENSION_ID, {command: "isLocked"}, function(_response) {
            if (unsafeWindow.chrome.runtime.lastError) {
                resolve(false);
            }
            resolve(true);
        });
    });
}

async function Initialize() {
    const Errored = PageIsErrored();
    if (Errored !== false) {
        switch (MatchErrorType(Errored)) {
            case CONFIG.ERRORS.USER_AGENT:
                const QuizHeader = GetQuizHeader();
                const Error = unsafeWindow.document.createElement("div");
                Error.classList.value = "gfu-red";
                QuizHeader.appendChild(Error);
                const ErrorSpan = unsafeWindow.document.createElement("span");
                ErrorSpan.innerText = "Google Forms Unlocker - In order to continue, you need a User Agent Spoofer. ";
                Error.appendChild(ErrorSpan);
                const AnchorSpan = unsafeWindow.document.createElement("a");
                AnchorSpan.classList.value = "gfu-red";
                AnchorSpan.innerText = "Install one here.";
                AnchorSpan.target = "_blank";
                AnchorSpan.rel = "noopener";
                AnchorSpan.href = "https://github.com/xNasuni/google-forms-unlocker/blob/main/README.md#spoofing-your-user-agent";
                ErrorSpan.appendChild(AnchorSpan);
                break;
            default:
                alert(`Unhandled error type: ${JSON.stringify(Errored)}`);
        }
        return;
    }

    const Form = GetGoogleForm();
    if (Form === undefined) return false;

    const IsRealManagedChromebook = await IsOnChromebook();

    if (IsRealManagedChromebook === false) {
        const ButtonHolder = Form.childNodes[2];
        for (const Button of ButtonHolder.childNodes) {
            if (Button.getAttribute("mia-gfu-state") === "custom-button") continue;
            Button.style.backgroundColor = "#ccc";
            Button.setAttribute("jsaction", "");
        }
    }
    MakeButton("Bypass", ButtonAction, "#800000");
}

function InterceptCommand(Payload, Callback) {
    switch (Payload.command) {
        case "isLocked":
            Callback({locked: state.fakeIsLocked});
            return true;
        case "lock":
            if (state.shouldSpoof) return false;
            state.fakeIsLocked = false;
            Callback({locked: state.fakeIsLocked});
            return true;
        case "unlock":
            state.fakeIsLocked = false;
            Callback({locked: state.fakeIsLocked});
            return true;
    }
    return false;
}

const container = document.createElement('div');
container.id = 'pulloutContainer';
container.innerHTML = `
  <div id="pulloutTab">
    ChatGPT
  </div>
`;

document.body.appendChild(container);

const tab = document.getElementById('pulloutTab');

function createRipple(event) {
    const ripple = document.createElement('span');
    const rect = tab.getBoundingClientRect();
    
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size/2;
    const y = event.clientY - rect.top - size/2;
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = 'ripple';
    
    tab.appendChild(ripple);
    
    ripple.addEventListener('animationend', () => {
        ripple.remove();
    });
}

tab.addEventListener('click', (e) => {
    createRipple(e);
    setTimeout(() => {
        window.open('https://chat.openai.com', '_blank');
    }, 200);
});

let initialX;
let currentX;
let isDragging = false;

container.addEventListener('mousedown', (e) => {
    initialX = e.clientX - container.offsetLeft;
    isDragging = true;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    currentX = e.clientX - initialX;
    container.style.right = `${-currentX}px`;
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    if (currentX < -50) {
        container.style.right = '-35px';
    }
});

container.addEventListener('touchstart', (e) => {
    initialX = e.touches[0].clientX - container.offsetLeft;
    isDragging = true;
});

document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX - initialX;
    container.style.right = `${-currentX}px`;
});

document.addEventListener('touchend', () => {
    isDragging = false;
    if (currentX < -50) {
        container.style.right = '-35px';
    }
});

setInterval(() => {
    unsafeWindow.chrome.runtime.sendMessage = function() {
        const ExtensionId = arguments[0];
        const Payload = arguments[1];
        const Callback = arguments[2];

        if (MatchExtensionId(ExtensionId)) {
            const Intercepted = InterceptCommand(Payload, Callback);
            if (Intercepted) return null;
        }

        return originalSendMessage(ExtensionId, Payload, function() {
            if (unsafeWindow.chrome.runtime.lastError) {
                alert(`Google Forms Unlocker, please report this to the GitHub https://github.com/xNasuni/google-forms-unlocker/issues\nUnhandled error: ${JSON.stringify(chrome.runtime.lastError)}`);
                return;
            }
            Callback.apply(this, arguments);
        });
    };
});

unsafeWindow.document.addEventListener("DOMContentLoaded", () => {
    Initialize();
});

const visibilityProperties = ['hidden', 'visibilityState', 'webkitVisibilityState', 'mozVisibilityState', 'msVisibilityState'];
visibilityProperties.forEach(prop => {
    Object.defineProperty(unsafeWindow.document, prop, {
        value: prop === 'hidden' ? false : 'visible',
        writable: false
    });
});

const BlacklistedEvents = ['mozvisibilitychange', 'webkitvisibilitychange', 'msvisibilitychange', 'visibilitychange'];
const oldAddEventListener = unsafeWindow.document.addEventListener;
unsafeWindow.document.addEventListener = function() {
    const EventType = arguments[0];
    if (BlacklistedEvents.indexOf(EventType) !== -1) return;
    return oldAddEventListener.apply(this, arguments);
};
