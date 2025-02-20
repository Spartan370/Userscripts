// ==UserScript==
// @name         M1K
// @namespace    http://tampermonkey.net/
// @version      3.7
// @description  Ultimate autoclicker with unlimited CPS
// @author       Connor M
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let isActive = false;
    let isSupercharged = false;
    let isUltraMode = false;
    let selectedElement = null;
    let clicksPerSecond = 20;
    let mouseX = 0, mouseY = 0;
    let activeBatches = new Set();
    let clickMultiplier = 1;
    let batchWorkers = new Map();
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let menuScale = 1.0;

    const styles = `
        .clicker-controls {
            position: fixed;
            top: 20px;
            left: 20px;
            background: linear-gradient(145deg, #400000, #200000);
            padding: 15px;
            border-radius: 12px;
            z-index: 999999;
            font-family: 'Segoe UI', sans-serif;
            color: white;
            user-select: none;
            min-width: 320px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(8px);
            transform: scale(var(--menu-scale, 1));
            transform-origin: top left;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .clicker-controls.minimizing {
            transform: scale(0.95);
            opacity: 0.8;
        }
        .clicker-controls.closing {
            transform: scale(0.9);
            opacity: 0;
        }
        .clicker-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(255,255,255,0.1);
        }
        .title-section {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            font-size: 15px;
            color: #ff9999;
            text-shadow: 0 0 10px rgba(255,0,0,0.3);
        }
        .coordinates-section {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .coordinates {
            background: rgba(0,0,0,0.3);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-family: 'Consolas', monospace;
            color: #ff6666;
            border: 1px solid rgba(255,102,102,0.2);
        }
        .size-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: #ff9999;
            width: 20px;
            height: 20px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .size-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: scale(1.1);
        }`;

    const styles2 = `
        .header-controls {
            display: flex;
            gap: 8px;
        }
        .header-button {
            background: rgba(255,255,255,0.05);
            border: none;
            color: #ff9999;
            cursor: pointer;
            font-size: 16px;
            padding: 4px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .header-button:hover {
            background: rgba(255,255,255,0.1);
            color: white;
            transform: scale(1.1);
        }
        .control-button {
            width: 100%;
            padding: 12px;
            margin-bottom: 10px;
            border: none;
            border-radius: 8px;
            background: linear-gradient(145deg, #600000, #400000);
            color: white;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
            letter-spacing: 0.5px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .control-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            background: linear-gradient(145deg, #700000, #500000);
        }
        .control-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .control-button.active {
            background: linear-gradient(145deg, #800000, #600000);
            animation: pulse 2s infinite;
            box-shadow: 0 0 20px rgba(255,0,0,0.2);
        }
        .batch-controls {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 15px;
            padding: 10px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .batch-toggle {
            padding: 12px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid rgba(255,255,255,0.05);
        }`;

    const styles3 = `
        .batch-toggle:hover {
            background: rgba(0,0,0,0.3);
            transform: translateY(-1px);
        }
        .batch-toggle.active {
            background: rgba(128,0,0,0.3);
            border-color: rgba(255,68,68,0.3);
        }
        .batch-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            transition: all 0.3s ease;
            box-shadow: 0 0 5px rgba(0,0,0,0.2);
        }
        .batch-toggle.active .batch-indicator {
            background: #ff4444;
            box-shadow: 0 0 10px #ff4444;
            animation: glow 1.5s infinite;
        }
        .cps-control {
            background: rgba(0,0,0,0.2);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .cps-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            color: #ff9999;
            font-size: 14px;
            font-weight: 500;
        }
        .cps-value {
            font-family: 'Consolas', monospace;
            color: white;
            background: rgba(0,0,0,0.2);
            padding: 2px 8px;
            border-radius: 4px;
            min-width: 60px;
            text-align: center;
        }
        .cps-slider {
            width: 100%;
            height: 6px;
            -webkit-appearance: none;
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
            outline: none;
            transition: all 0.2s ease;
        }
        .cps-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ff4444;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 0 10px rgba(255,0,0,0.3);
        }
        .cps-slider::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            background: #ff6666;
        }
        @keyframes glow {
            0% { box-shadow: 0 0 5px #ff4444; }
            50% { box-shadow: 0 0 20px #ff4444; }
            100% { box-shadow: 0 0 5px #ff4444; }
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(0.98); }
            100% { transform: scale(1); }
        }`;

    function simulateClick(x, y, target = null) {
        const clickEvents = [
            new MouseEvent('mouseover', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: x,
                clientY: y
            }),
            new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: x,
                clientY: y,
                buttons: 1
            }),
            new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: x,
                clientY: y
            }),
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: x,
                clientY: y
            })
        ];

        if (target) {
            clickEvents.forEach(event => target.dispatchEvent(event));
        } else {
            const elementAtPoint = document.elementFromPoint(x, y);
            if (elementAtPoint) {
                clickEvents.forEach(event => elementAtPoint.dispatchEvent(event));
            }
        }
    }

    function calculateBatchOffset(batchNum, totalBatches) {
        const radius = 10;
        const angle = (batchNum / totalBatches) * 2 * Math.PI;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        };
    }

    function performClick() {
        const totalBatches = activeBatches.size || 1;

        if (selectedElement) {
            const rect = selectedElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            if (activeBatches.size === 0) {
                simulateClick(centerX, centerY, selectedElement);
            } else {
                activeBatches.forEach(batchNum => {
                    const offset = calculateBatchOffset(batchNum, totalBatches);
                    simulateClick(centerX + offset.x, centerY + offset.y, selectedElement);
                });
            }
        } else {
            if (activeBatches.size === 0) {
                simulateClick(mouseX, mouseY);
            } else {
                activeBatches.forEach(batchNum => {
                    const offset = calculateBatchOffset(batchNum, totalBatches);
                    simulateClick(mouseX + offset.x, mouseY + offset.y);
                });
            }
        }
    }

    function startAutoClicker() {
        const baseInterval = 1000 / clicksPerSecond;
        const turboMultiplier = isUltraMode ? 2 : 1;
        const superchargeMultiplier = isSupercharged ? 10 : 1;
        return setInterval(performClick, baseInterval / (turboMultiplier * superchargeMultiplier));
    }
    function createMenu() {
        const menu = document.createElement('div');
        menu.className = 'clicker-controls';
        menu.style.setProperty('--menu-scale', menuScale);

        menu.innerHTML = `
            <div class="clicker-header">
                <div class="title-section">
                    <span>M1K</span>
                    <div class="coordinates-section">
                        <div class="coordinates" id="mouseCoords">X: 0 Y: 0</div>
                        <button class="size-btn" id="decreaseSize">-</button>
                        <button class="size-btn" id="increaseSize">+</button>
                    </div>
                </div>
                <div class="header-controls">
                    <button class="header-button minimize">−</button>
                    <button class="header-button close">×</button>
                </div>
            </div>
            <div class="clicker-content" style="display: none;">
                <button class="control-button" id="toggleClicker">Start</button>
                <button class="control-button" id="selectTarget">Select Target</button>
                <div class="cps-control">
                    <div class="cps-label">
                        <span>Click Speed</span>
                        <span class="cps-value">${clicksPerSecond} CPS</span>
                    </div>
                    <input type="range" class="cps-slider" min="1" max="300" value="${clicksPerSecond}">
                </div>
                <button class="control-button" id="ultraMode">Turbo Mode (2x)</button>
                <button class="control-button supercharge-button">Supercharge (10x)</button>
                <div class="batch-controls">
                    ${Array.from({length: 6}, (_, i) => `
                        <div class="batch-toggle" data-batch="${i + 1}">
                            <div class="batch-indicator"></div>
                            <span>Batch ${i + 1}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        return menu;
    }

    function makeDraggable(menu) {
        const header = menu.querySelector('.clicker-header');
        let dragStartTime = 0;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.header-controls') || e.target.closest('.size-btn')) return;
            isDragging = true;
            dragStartTime = Date.now();
            const rect = menu.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            menu.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const timeSinceDrag = Date.now() - dragStartTime;
            if (timeSinceDrag > 50) {
                menu.style.left = `${e.clientX - dragOffset.x}px`;
                menu.style.top = `${e.clientY - dragOffset.y}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            menu.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    }
    function setupEventListeners(menu) {
        let clickInterval = null;
        const toggleBtn = menu.querySelector('#toggleClicker');
        const selectBtn = menu.querySelector('#selectTarget');
        const ultraBtn = menu.querySelector('#ultraMode');
        const superchargeBtn = menu.querySelector('.supercharge-button');
        const cpsSlider = menu.querySelector('.cps-slider');
        const cpsValue = menu.querySelector('.cps-value');
        const batchToggles = menu.querySelectorAll('.batch-toggle');
        const coordsDisplay = menu.querySelector('#mouseCoords');
        const closeBtn = menu.querySelector('.close');
        const minimizeBtn = menu.querySelector('.minimize');
        const content = menu.querySelector('.clicker-content');
        const decreaseBtn = menu.querySelector('#decreaseSize');
        const increaseBtn = menu.querySelector('#increaseSize');

        document.addEventListener('mousemove', (e) => {
            if (!e.target.closest('.clicker-controls')) {
                mouseX = e.clientX;
                mouseY = e.clientY;
                coordsDisplay.textContent = `X: ${mouseX} Y: ${mouseY}`;
            }
        });

        selectBtn.addEventListener('click', () => {
            document.body.style.cursor = 'crosshair';
            const oldClick = document.onclick;
            document.onclick = (e) => {
                if (!e.target.closest('.clicker-controls')) {
                    e.preventDefault();
                    e.stopPropagation();
                    selectedElement = e.target;
                    document.body.style.cursor = 'default';
                    document.onclick = oldClick;
                    selectBtn.classList.remove('active');
                }
            };
            selectBtn.classList.add('active');
        });

        cpsSlider.addEventListener('input', (e) => {
            clicksPerSecond = parseInt(e.target.value);
            cpsValue.textContent = `${clicksPerSecond} CPS`;
            if (isActive) {
                clearInterval(clickInterval);
                clickInterval = startAutoClicker();
            }
        });

        toggleBtn.addEventListener('click', () => {
            isActive = !isActive;
            toggleBtn.textContent = isActive ? 'Stop' : 'Start';
            toggleBtn.classList.toggle('active');

            if (isActive) {
                clickInterval = startAutoClicker();
            } else {
                clearInterval(clickInterval);
            }
        });

        batchToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const batchNum = parseInt(toggle.dataset.batch);
                toggle.classList.toggle('active');
                if (toggle.classList.contains('active')) {
                    activeBatches.add(batchNum);
                } else {
                    activeBatches.delete(batchNum);
                }
            });
        });

        ultraBtn.addEventListener('click', () => {
            isUltraMode = !isUltraMode;
            ultraBtn.classList.toggle('active');
            if (isActive) {
                clearInterval(clickInterval);
                clickInterval = startAutoClicker();
            }
        });

        superchargeBtn.addEventListener('click', () => {
            isSupercharged = !isSupercharged;
            superchargeBtn.classList.toggle('active');
            if (isActive) {
                clearInterval(clickInterval);
                clickInterval = startAutoClicker();
            }
        });

        minimizeBtn.addEventListener('click', () => {
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
            menu.classList.add('minimizing');
            setTimeout(() => menu.classList.remove('minimizing'), 300);
        });

        closeBtn.addEventListener('click', () => {
            menu.classList.add('closing');
            setTimeout(() => {
                if (isActive) clearInterval(clickInterval);
                menu.remove();
            }, 300);
        });

        decreaseBtn.addEventListener('click', () => {
            if (menuScale > 0.5) {
                menuScale -= 0.1;
                menu.style.setProperty('--menu-scale', menuScale);
            }
        });

        increaseBtn.addEventListener('click', () => {
            if (menuScale < 2.0) {
                menuScale += 0.1;
                menu.style.setProperty('--menu-scale', menuScale);
            }
        });
    }

    function init() {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles + styles2 + styles3;
        document.head.appendChild(styleSheet);

        const menu = createMenu();
        document.body.appendChild(menu);
        makeDraggable(menu);
        setupEventListeners(menu);
    }

    init();
})();
