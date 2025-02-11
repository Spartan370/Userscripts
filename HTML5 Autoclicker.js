// ==UserScript==
// @name         Universal Game Autoclicker Elite
// @namespace    http://tampermonkey.net/
// @version      3.4
// @description  Professional autoclicker with minimalist design
// @author       Connor M
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let isActive = false;
    let clickInterval;
    let isCollapsed = false;
    let selectedElement = null;
    let clicksPerSecond = 20;
    let gameContainer = document.querySelector('canvas') || document.body;
    let activeBatches = new Set();

    const styles = `
        .clicker-controls {
            position: fixed;
            background: linear-gradient(145deg, #2c3e50, #34495e);
            padding: 18px;
            border-radius: 12px;
            z-index: 999999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            user-select: none;
            min-width: 280px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .clicker-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .title-section {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .clicker-title {
            font-weight: 500;
            font-size: 14px;
        }
        .header-controls {
            display: flex;
            gap: 10px;
        }
        .header-button {
            background: none;
            border: none;
            color: #ffffff80;
            cursor: pointer;
            font-size: 16px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s ease;
        }
        .header-button:hover {
            color: white;
        }
        .clicker-content {
            transition: max-height 0.3s ease;
            overflow: hidden;
        }
        .button-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .toggle-button, .select-button {
            width: 100%;
            height: 40px;
            border: none;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.2s ease, background-color 0.2s ease;
        }
        .toggle-button {
            background: #2ecc71;
        }
        .select-button {
            background: #3498db;
        }
        .toggle-button:hover, .select-button:hover {
            transform: translateY(-1px);
        }
        .toggle-button.active {
            background: #e74c3c;
        }
        .select-button.active {
            background: #e67e22;
        }
        .cps-control {
            margin-top: 10px;
            padding: 10px 0;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .cps-label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
            font-size: 12px;
            color: #ffffff80;
        }
        .cps-slider {
            width: 100%;
            height: 4px;
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
            -webkit-appearance: none;
        }
        .cps-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #3498db;
            cursor: pointer;
            transition: background 0.2s ease;
        }
        .cps-slider::-webkit-slider-thumb:hover {
            background: #2980b9;
        }
        .batch-controls {
            display: flex;
            gap: 10px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .batch-toggle {
            background: rgba(255,255,255,0.1);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .batch-toggle:hover {
            background: rgba(255,255,255,0.15);
        }
        .batch-toggle.active {
            background: #3498db;
        }
        .batch-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255,255,255,0.5);
        }
        .batch-toggle.active .batch-indicator {
            background: #2ecc71;
        }
        .info-icon {
            color: #ffffff80;
            cursor: pointer;
            font-size: 14px;
            transition: color 0.2s ease;
            text-decoration: none;
        }
        .info-icon:hover {
            color: white;
        }
        .collapsed {
            max-height: 0;
            margin: 0;
            padding: 0;
        }
    `;

    function createControls() {
        const controls = document.createElement('div');
        controls.className = 'clicker-controls';
        controls.innerHTML = `
            <div class="clicker-header">
                <div class="title-section">
                    <div class="clicker-title">Auto Clicker Elite</div>
                    <a class="info-icon" href="https://github.com/Spartan370/Userscripts/tree/main" target="_blank" title="View Documentation">ⓘ</a>
                </div>
                <div class="header-controls">
                    <button class="header-button minimize">─</button>
                    <button class="header-button close">✕</button>
                </div>
            </div>
            <div class="clicker-content">
                <div class="button-container">
                    <button class="toggle-button">Start</button>
                    <button class="select-button">Select Element</button>
                </div>
                <div class="cps-control">
                    <div class="cps-label">
                        <span>Clicks per second</span>
                        <span class="cps-value">${clicksPerSecond}</span>
                    </div>
                    <input type="range" class="cps-slider" min="1" max="150" value="${clicksPerSecond}">
                </div>
                <div class="batch-controls">
                    <div class="batch-toggle" data-batch="1">
                        <div class="batch-indicator"></div>
                        Batch 1
                    </div>
                    <div class="batch-toggle" data-batch="2">
                        <div class="batch-indicator"></div>
                        Batch 2
                    </div>
                </div>
            </div>
        `;
        return controls;
    }

    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        element.querySelector('.clicker-header').onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            if (!e.target.classList.contains('header-button')) {
                e.preventDefault();
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
                element.style.transition = 'none';
            }
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            let newTop = element.offsetTop - pos2;
            let newLeft = element.offsetLeft - pos1;

            element.style.top = newTop + "px";
            element.style.left = newLeft + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            element.style.transition = 'all 0.3s ease';
        }
    }

    function setupControls(controls) {
        const toggleBtn = controls.querySelector('.toggle-button');
        const selectBtn = controls.querySelector('.select-button');
        const minimizeBtn = controls.querySelector('.minimize');
        const closeBtn = controls.querySelector('.close');
        const content = controls.querySelector('.clicker-content');
        const cpsSlider = controls.querySelector('.cps-slider');
        const cpsValue = controls.querySelector('.cps-value');
        const batchToggles = controls.querySelectorAll('.batch-toggle');

        toggleBtn.addEventListener('click', () => {
            isActive = !isActive;
            toggleBtn.textContent = isActive ? 'Stop' : 'Start';
            toggleBtn.classList.toggle('active');
            handleClicking();
        });

        selectBtn.addEventListener('click', () => {
            selectBtn.classList.toggle('active');
            startElementSelection(selectBtn);
        });

        minimizeBtn.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            content.classList.toggle('collapsed');
            minimizeBtn.textContent = isCollapsed ? '╋' : '─';
        });

        closeBtn.addEventListener('click', () => {
            controls.remove();
            if (isActive) handleClicking();
        });

        cpsSlider.addEventListener('input', (e) => {
            clicksPerSecond = parseInt(e.target.value);
            updateClickRate();
        });

        batchToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                const batchNum = parseInt(toggle.dataset.batch);
                if (toggle.classList.contains('active')) {
                    activeBatches.add(batchNum);
                } else {
                    activeBatches.delete(batchNum);
                }
                updateClickRate();
            });
        });

        function updateClickRate() {
            const totalBatches = activeBatches.size || 1;
            const effectiveCPS = clicksPerSecond * totalBatches;
            cpsValue.textContent = `${effectiveCPS} (${totalBatches}x)`;
            if (isActive) {
                handleClicking();
            }
        }
    }

    function startElementSelection(selectBtn) {
        const handleSelection = (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectedElement = e.target;
            selectBtn.classList.remove('active');
            selectBtn.textContent = 'Element Selected';
            document.removeEventListener('click', handleSelection, true);
        };

        document.addEventListener('click', handleSelection, true);
    }

    function handleClicking() {
        if (clickInterval) {
            clearInterval(clickInterval);
        }

        if (isActive) {
            const totalBatches = activeBatches.size || 1;
            const interval = 1000 / (clicksPerSecond * totalBatches);
            
            clickInterval = setInterval(() => {
                for (let i = 0; i < totalBatches; i++) {
                    if (selectedElement) {
                        const rect = selectedElement.getBoundingClientRect();
                        simulateClick(rect.left + rect.width/2, rect.top + rect.height/2, selectedElement);
                    } else {
                        simulateClick(mouseX, mouseY);
                    }
                }
            }, interval);
        }
    }

    function simulateClick(x, y, target) {
        const events = ['mousedown', 'mouseup', 'click'];
        const options = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            screenX: x,
            screenY: y,
            button: 0,
            buttons: 1
        };

        events.forEach(eventType => {
            const event = new MouseEvent(eventType, options);
            (target || document.elementFromPoint(x, y))?.dispatchEvent(event);
        });
    }

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function addStyles() {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    function init() {
        addStyles();
        const controls = createControls();
        document.body.appendChild(controls);
        makeDraggable(controls);
        setupControls(controls);
    }

    init();
})();
