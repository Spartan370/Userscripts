// ==UserScript==
// @name         Universal Game Autoclicker Ultimate
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Ultimate autoclicker with advanced features and optimizations
// @author       Connor M
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const state = {
        isActive: false,
        clickInterval: null,
        isCollapsed: false,
        selectedElement: null,
        clicksPerSecond: 20,
        mouseX: 0,
        mouseY: 0,
        currentTab: 'main',
        turboEnabled: false,
        maxTurboCPS: 300
    };

    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        .autoclicker-container {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            background: linear-gradient(145deg, #1a0f0f, #2d0a0a);
            border: 1px solid #400808;
            border-radius: 12px;
            color: #fff;
            font-family: 'Inter', sans-serif;
            z-index: 999999;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            transition: all 0.3s ease;
            user-select: none;
        }

        .tab-container {
            display: flex;
            background: rgba(0,0,0,0.2);
            border-radius: 12px 12px 0 0;
            padding: 8px;
            gap: 4px;
        }

        .tab {
            flex: 1;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            background: rgba(0,0,0,0.15);
            border-radius: 8px;
            transition: 0.2s;
            font-weight: 500;
            font-size: 13px;
        }

        .tab.active {
            background: #800000;
            color: white;
        }

        .tab:hover:not(.active) {
            background: rgba(128,0,0,0.15);
        }

        .autoclicker-header {
            padding: 16px;
            background: rgba(0,0,0,0.1);
            border-bottom: 1px solid rgba(128,0,0,0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        }

        .autoclicker-title {
            color: #fff;
            font-weight: 600;
            font-size: 15px;
            letter-spacing: 0.5px;
        }

        .header-controls {
            display: flex;
            gap: 12px;
        }

        .header-button {
            background: none;
            border: none;
            color: #fff;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
            transition: 0.2s;
            font-size: 14px;
        }

        .header-button:hover {
            background: rgba(128,0,0,0.3);
        }

        .tab-content {
            display: none;
            padding: 20px;
        }

        .tab-content.active {
            display: block;
        }

        .action-button {
            padding: 12px;
            background: #800000;
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            transition: 0.2s;
            font-weight: 600;
            font-size: 14px;
            width: 100%;
            margin-bottom: 12px;
            text-transform: none;
        }

        .action-button:hover {
            background: #600000;
            transform: translateY(-1px);
        }

        .action-button.active {
            background: #400000;
        }

        .slider-container {
            margin: 20px 0;
        }

        .slider-label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 500;
            color: #fff;
        }

        .cps-value {
            background: rgba(128,0,0,0.2);
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
        }

        .cps-slider {
            width: 100%;
            height: 6px;
            -webkit-appearance: none;
            background: rgba(128,0,0,0.2);
            border-radius: 3px;
            outline: none;
        }

        .cps-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #800000;
            cursor: pointer;
            border: 2px solid rgba(255,255,255,0.8);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: 0.2s;
        }

        .cps-slider::-webkit-slider-thumb:hover {
            background: #600000;
            transform: scale(1.1);
        }
    `;
    function simulateClick() {
        const clickEvent = document.createEvent('MouseEvents');
        clickEvent.initMouseEvent('mousedown', true, true, window, 0, 0, 0, state.mouseX, state.mouseY, false, false, false, false, 0, null);
        document.dispatchEvent(clickEvent);

        const clickEvent2 = document.createEvent('MouseEvents');
        clickEvent2.initMouseEvent('mouseup', true, true, window, 0, 0, 0, state.mouseX, state.mouseY, false, false, false, false, 0, null);
        document.dispatchEvent(clickEvent2);

        const clickEvent3 = document.createEvent('MouseEvents');
        clickEvent3.initMouseEvent('click', true, true, window, 0, 0, 0, state.mouseX, state.mouseY, false, false, false, false, 0, null);
        document.dispatchEvent(clickEvent3);
    }

    function startClicking(cps) {
        stopClicking();
        const interval = 1000 / cps;
        state.clickInterval = setInterval(simulateClick, interval);
    }

    function stopClicking() {
        if (state.clickInterval) {
            clearInterval(state.clickInterval);
            state.clickInterval = null;
        }
    }

    function toggleClicker() {
        state.isActive = !state.isActive;
        const toggleButton = document.querySelector('#toggle-clicker');

        if (state.isActive) {
            toggleButton.textContent = 'Stop';
            toggleButton.classList.add('active');
            startClicking(state.clicksPerSecond);
        } else {
            toggleButton.textContent = 'Start';
            toggleButton.classList.remove('active');
            stopClicking();
        }
    }

    function createUI() {
        const container = document.createElement('div');
        container.className = 'autoclicker-container';

        container.innerHTML = `
            <div class="tab-container">
                <div class="tab active" data-tab="main">Main</div>
                <div class="tab" data-tab="settings">Settings</div>
                <div class="tab" data-tab="extra">Extra</div>
            </div>
            <div class="autoclicker-header">
                <div class="autoclicker-title">Auto Clicker Ultimate</div>
                <div class="header-controls">
                    <button class="header-button" id="minimize-button">─</button>
                    <button class="header-button" id="close-button">✕</button>
                </div>
            </div>
            <div class="tab-content active" data-tab="main">
                <button class="action-button" id="toggle-clicker">Start</button>
                <div class="slider-container">
                    <div class="slider-label">
                        <span>Clicks Per Second</span>
                        <span class="cps-value" id="cps-value">${state.clicksPerSecond}</span>
                    </div>
                    <input type="range" class="cps-slider" min="1" max="300" value="${state.clicksPerSecond}" step="1">
                </div>
            </div>
            <div class="tab-content" data-tab="settings">
                <div class="settings-content">
                    Settings Panel
                </div>
            </div>
            <div class="tab-content" data-tab="extra">
                <div class="extra-content">
                    Extra Features
                </div>
            </div>
        `;

        document.body.appendChild(container);
        return container;
    }
    function setupEventListeners(container) {
        const header = container.querySelector('.autoclicker-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('header-button')) return;
            isDragging = true;
            initialX = e.clientX - container.offsetLeft;
            initialY = e.clientY - container.offsetTop;
            container.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            state.mouseX = e.clientX;
            state.mouseY = e.clientY;

            if (!isDragging) return;
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            currentX = Math.max(0, Math.min(currentX, window.innerWidth - container.offsetWidth));
            currentY = Math.max(0, Math.min(currentY, window.innerHeight - container.offsetHeight));
            container.style.left = `${currentX}px`;
            container.style.top = `${currentY}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            container.style.transition = 'all 0.3s ease';
        });

        container.querySelector('#toggle-clicker').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleClicker();
        });

        container.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                const tabContent = container.querySelector(`.tab-content[data-tab="${tab.dataset.tab}"]`);
                if (tabContent) {
                    tabContent.classList.add('active');
                    state.currentTab = tab.dataset.tab;
                }
            });
        });

        container.querySelector('.cps-slider').addEventListener('input', (e) => {
            e.stopPropagation();
            state.clicksPerSecond = parseInt(e.target.value);
            container.querySelector('#cps-value').textContent = state.clicksPerSecond;

            if (state.isActive) {
                stopClicking();
                startClicking(state.clicksPerSecond);
            }
        });

        container.querySelector('#close-button').addEventListener('click', (e) => {
            e.stopPropagation();
            stopClicking();
            container.remove();
        });

        container.querySelector('#minimize-button').addEventListener('click', (e) => {
            e.stopPropagation();
            const contents = container.querySelectorAll('.tab-content');
            state.isCollapsed = !state.isCollapsed;

            contents.forEach(content => {
                if (state.isCollapsed) {
                    content.style.display = 'none';
                } else {
                    content.style.display = content.dataset.tab === state.currentTab ? 'block' : 'none';
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isActive) {
                toggleClicker();
            }
        });

        window.addEventListener('resize', () => {
            const rect = container.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                container.style.left = `${window.innerWidth - rect.width - 20}px`;
            }
            if (rect.bottom > window.innerHeight) {
                container.style.top = `${window.innerHeight - rect.height - 20}px`;
            }
        });
    }
    function preventDefaultEvents() {
        document.addEventListener('mousedown', (e) => {
            if (e.target.closest('.autoclicker-container')) {
                e.preventDefault();
            }
        });

        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.autoclicker-container')) {
                e.preventDefault();
            }
        });

        document.addEventListener('selectstart', (e) => {
            if (e.target.closest('.autoclicker-container')) {
                e.preventDefault();
            }
        });

        document.addEventListener('dragstart', (e) => {
            if (e.target.closest('.autoclicker-container')) {
                e.preventDefault();
            }
        });
    }

    function cleanup() {
        stopClicking();
        const container = document.querySelector('.autoclicker-container');
        if (container) {
            container.remove();
        }
    }

    function init() {
        cleanup();

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);

        const container = createUI();
        setupEventListeners(container);
        preventDefaultEvents();

        container.style.position = 'fixed';
        container.style.left = '20px';
        container.style.top = '20px';

        window.addEventListener('unload', cleanup);
    }

    init();
})();
