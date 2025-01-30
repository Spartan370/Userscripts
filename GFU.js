// ==UserScript==
// @name         GFU
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Unlocks locked google forms, the user is responsible for all actions that is made by this script
// @author       Connor M
// @match        *://docs.google.com/forms/*
// @grant        GM_addStyle
// @run-at       document-start
// @license      GPL-3.0
// @updateURL    https://github.com/Spartan370/GFU/raw/main/GFU.js
// @downloadURL  https://github.com/Spartan370/GFU/raw/main/GFU.js
// ==/UserScript==

GM_addStyle(`
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

GM_addStyle(`
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
