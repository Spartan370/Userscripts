// ==UserScript==
// @name         Auto Typer Elite Professional
// @namespace    http://tampermonkey.net/
// @version      8.0
// @description  Enterprise-grade typing automation with advanced security and optimization
// @author       You
// @match        *://*/*
// @match        *://docs.google.com/*
// @match        *://slides.google.com/*
// @match        *://sheets.google.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const TYPING_SPEEDS = Object.freeze({
        SLOW: 1,
        NORMAL: 5,
        FAST: 10
    });

    const MAX_RETRY_ATTEMPTS = 3;
    const TYPING_TIMEOUT = 30000;
    const MIN_DELAY = 30;
    const MAX_DELAY = 300;

    let isTyping = false;
    let selectedElement = null;
    let isSelectorMode = false;
    let typingTimeout = null;
    let retryCount = 0;

    const safeCreateElement = (tag, attributes = {}) => {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (typeof value === 'function') {
                element.addEventListener(key.replace('on', ''), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        return element;
    };

    const settings = new Proxy(GM_getValue('typerSettings', {
        speed: TYPING_SPEEDS.NORMAL,
        humanize: true,
        mistakes: true,
        mistakeRate: 0.03,
        autoCorrect: true,
        soundEffects: false,
        customPatterns: true,
        maxRetries: MAX_RETRY_ATTEMPTS,
        timeout: TYPING_TIMEOUT
    }), {
        set(target, key, value) {
            target[key] = value;
            GM_setValue('typerSettings', target);
            return true;
        }
    });

    const typingPatterns = new Map([
        ['standard', {delays: [50, 100, 150], variance: 0.2}],
        ['professional', {delays: [40, 80, 120], variance: 0.15}],
        ['expert', {delays: [30, 60, 90], variance: 0.1}]
    ]);

    const elementValidator = {
        isValidInput(element) {
            if (!element) return false;
            return (
                element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element.isContentEditable ||
                this.isValidIframe(element)
            );
        },

        isValidIframe(element) {
            try {
                return element.tagName === 'IFRAME' &&
                       element.contentDocument &&
                       element.contentDocument.body.isContentEditable;
            } catch {
                return false;
            }
        }
    };

    class TypingManager {
        constructor() {
            this.queue = [];
            this.isProcessing = false;
            this.abortController = new AbortController();
        }

        async type(text, element) {
            if (!elementValidator.isValidInput(element)) {
                throw new Error('Invalid target element');
            }

            const pattern = this.generateTypingPattern(text);
            await this.executeTypingSequence(pattern, element);
        }

        generateTypingPattern(text) {
            const pattern = typingPatterns.get(settings.speed <= 3 ? 'standard' :
                                             settings.speed <= 7 ? 'professional' :
                                             'expert');
            return text.split('').map(char => ({
                char,
                delay: this.calculateDelay(char, pattern)
            }));
        }

        calculateDelay(char, pattern) {
            const baseDelay = pattern.delays[Math.floor(Math.random() * pattern.delays.length)];
            const variance = Math.random() * pattern.variance * 2 - pattern.variance;
            return Math.max(MIN_DELAY, baseDelay * (1 + variance));
        }

        async executeTypingSequence(pattern, element) {
            const signal = this.abortController.signal;

            for (const {char, delay} of pattern) {
                if (signal.aborted) break;

                try {
                    if (settings.mistakes && Math.random() < settings.mistakeRate) {
                        await this.simulateMistake(char, element);
                    } else {
                        await this.insertCharacter(char, element);
                    }
                    await this.delay(delay);
                } catch (error) {
                    if (error.name === 'AbortError') break;
                    throw error;
                }
            }
        }

        async simulateMistake(correctChar, element) {
            const mistakes = 'asdfghjklqwertyuiop';
            const mistakeChar = mistakes[Math.floor(Math.random() * mistakes.length)];

            await this.insertCharacter(mistakeChar, element);
            await this.delay(150);
            await this.deleteCharacter(element);
            await this.delay(200);
            await this.insertCharacter(correctChar, element);
        }

        async insertCharacter(char, element) {
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                const start = element.selectionStart;
                const end = element.selectionEnd;
                element.value = element.value.substring(0, start) +
                               char +
                               element.value.substring(end);
                element.selectionStart = element.selectionEnd = start + 1;
            } else if (element.isContentEditable) {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                const textNode = document.createTextNode(char);
                range.deleteContents();
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            element.dispatchEvent(new Event('input', { bubbles: true }));
            if (settings.soundEffects) this.playTypeSound();
        }

        async deleteCharacter(element) {
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                const start = element.selectionStart;
                element.value = element.value.substring(0, start - 1) +
                               element.value.substring(start);
                element.selectionStart = element.selectionEnd = start - 1;
            } else if (element.isContentEditable) {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                range.setStart(range.startContainer, range.startOffset - 1);
                range.deleteContents();
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        playTypeSound() {
            const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjEzAAAAAAAAAAAAAAAAJAQKAAAAAAAAHjM=');
            audio.volume = 0.2;
            return audio.play().catch(() => {});
        }

        stop() {
            this.abortController.abort();
            this.abortController = new AbortController();
        }
    }

    class UserInterface {
        constructor() {
            this.typingManager = new TypingManager();
            this.popup = null;
            this.dragOffset = { x: 0, y: 0 };
        }

        initialize() {
            this.createStyles();
            this.createInterface();
            this.initializeEventListeners();
        }

        createStyles() {
            GM_addStyle(`
                #autoTyperElite {
                    position: fixed;
                    background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
                    border: 1px solid #333;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    width: 420px;
                    z-index: 999999;
                    color: #fff;
                    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

            `);
        }

                    GM_addStyle(`
                .typer-header {
                    background: linear-gradient(145deg, #2d2d2d, #383838);
                    padding: 18px;
                    border-radius: 15px 15px 0 0;
                    border-bottom: 2px solid #0066cc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    user-select: none;
                }

                .typer-content {
                    padding: 20px;
                }

                .typer-textarea {
                    width: 100%;
                    min-height: 120px;
                    background: #1a1a1a;
                    border: 2px solid #333;
                    border-radius: 10px;
                    color: #fff;
                    padding: 15px;
                    font-family: 'Consolas', monospace;
                    resize: vertical;
                    transition: all 0.3s ease;
                }

                .typer-button {
                    background: linear-gradient(145deg, #0066cc, #0088ff);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.7px;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 15px rgba(0,102,204,0.3);
                }

                .typer-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0,102,204,0.4);
                }

                .typer-controls {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin-top: 15px;
                }

                .typer-settings {
                    background: #1a1a1a;
                    border-radius: 10px;
                    padding: 15px;
                    margin-top: 15px;
                }

                .typer-slider {
                    width: 100%;
                    height: 6px;
                    background: #333;
                    border-radius: 3px;
                    -webkit-appearance: none;
                    margin: 15px 0;
                }

                .typer-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px;
                    height: 18px;
                    background: #0066cc;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0,102,204,0.5);
                }

                .highlight-target {
                    outline: 2px solid #0066cc !important;
                    outline-offset: 2px;
                    transition: outline 0.3s ease;
                }
            `);
        }

        createInterface() {
            this.popup = safeCreateElement('div', { id: 'autoTyperElite' });

            const header = safeCreateElement('div', { className: 'typer-header' });
            header.innerHTML = `
                <div class="typer-title">
                    <span>⌨️ Auto Typer Elite</span>
                    <span style="opacity: 0.7">v8.0</span>
                </div>
                <div class="typer-actions">
                    <button class="typer-minimize">_</button>
                </div>
            `;

            const content = safeCreateElement('div', { className: 'typer-content' });
            content.innerHTML = `
                <textarea class="typer-textarea" placeholder="Enter text to type..."></textarea>
                <div class="typer-controls">
                    <button class="typer-button" data-action="select">Select Target</button>
                    <button class="typer-button" data-action="start">Start Typing</button>
                    <button class="typer-button" data-action="pause">Pause</button>
                    <button class="typer-button" data-action="stop">Stop</button>
                </div>
                <div class="typer-settings">
                    <label>Typing Speed</label>
                    <input type="range" class="typer-slider" min="1" max="10" value="${settings.speed}">
                    <div class="typer-options">
                        <label>
                            <input type="checkbox" data-setting="humanize" ${settings.humanize ? 'checked' : ''}>
                            Human-like Patterns
                        </label>
                        <label>
                            <input type="checkbox" data-setting="mistakes" ${settings.mistakes ? 'checked' : ''}>
                            Simulate Mistakes
                        </label>
                    </div>
                </div>
                <div class="typer-status">Ready to type...</div>
            `;

            this.popup.appendChild(header);
            this.popup.appendChild(content);
            document.body.appendChild(this.popup);

            this.popup.style.top = '50px';
            this.popup.style.right = '50px';

            this.makeDraggable(header);
        }

        initializeEventListeners() {
            const controls = this.popup.querySelector('.typer-controls');
            controls.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action) this.handleAction(action);
            });

            const settings = this.popup.querySelector('.typer-settings');
            settings.addEventListener('change', (e) => {
                if (e.target.dataset.setting) {
                    this.updateSetting(e.target.dataset.setting, e.target.checked);
                }
                if (e.target.classList.contains('typer-slider')) {
                    this.updateSetting('speed', parseInt(e.target.value));
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    this.toggleInterface();
                }
            });
        }

        handleAction(action) {
            switch(action) {
                case 'select':
                    this.startElementSelection();
                    break;
                case 'start':
                    this.startTyping();
                    break;
                case 'pause':
                    this.pauseTyping();
                    break;
                case 'stop':
                    this.stopTyping();
                    break;
            }
        }

        startElementSelection() {
            isSelectorMode = true;
            document.body.style.cursor = 'crosshair';

            const selectionHandler = (e) => {
                if (e.target === this.popup || this.popup.contains(e.target)) return;

                e.preventDefault();
                e.stopPropagation();

                if (elementValidator.isValidInput(e.target)) {
                    selectedElement = e.target;
                    selectedElement.classList.add('highlight-target');
                    this.updateStatus('Target selected successfully!');
                }

                document.removeEventListener('click', selectionHandler, true);
                document.body.style.cursor = '';
                isSelectorMode = false;
            };

            document.addEventListener('click', selectionHandler, true);
        }

        async startTyping() {
            const text = this.popup.querySelector('.typer-textarea').value.trim();

            if (!text) {
                this.updateStatus('Please enter text to type!', 'warning');
                return;
            }

            if (!selectedElement) {
                this.updateStatus('Please select a target element first!', 'warning');
                return;
            }

            try {
                isTyping = true;
                this.updateStatus('Typing in progress...', 'active');
                await this.typingManager.type(text, selectedElement);
                this.updateStatus('Typing completed successfully!', 'success');
            } catch (error) {
                this.updateStatus(`Typing failed: ${error.message}`, 'error');
            } finally {
                isTyping = false;
            }
        }

        pauseTyping() {
            if (isTyping) {
                this.typingManager.stop();
                isTyping = false;
                this.updateStatus('Typing paused', 'warning');
            }
        }

        stopTyping() {
            this.typingManager.stop();
            isTyping = false;
            this.updateStatus('Typing stopped', 'info');
        }

        updateStatus(message, type = 'info') {
            const statusEl = this.popup.querySelector('.typer-status');
            statusEl.textContent = message;
            statusEl.className = `typer-status ${type}`;
        }

        makeDraggable(header) {
            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;

            const dragStart = (e) => {
                initialX = e.clientX - this.dragOffset.x;
                initialY = e.clientY - this.dragOffset.y;

                if (e.target === header) {
                    isDragging = true;
                }
            };

            const drag = (e) => {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;

                    this.dragOffset.x = currentX;
                    this.dragOffset.y = currentY;

                    requestAnimationFrame(() => {
                        this.popup.style.transform =
                            `translate(${currentX}px, ${currentY}px)`;
                    });
                }
            };

            const dragEnd = () => {
                isDragging = false;
            };

            header.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        }

        toggleInterface() {
            if (this.popup) {
                this.popup.remove();
                this.popup = null;
            } else {
                this.initialize();
            }
        }
    }

    // Initialize the application
    const ui = new UserInterface();

    // Register menu command
    GM_registerMenuCommand('Auto Typer Elite', () => ui.toggleInterface());

    // Register global hotkey
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            ui.toggleInterface();
        }
    });
})();
