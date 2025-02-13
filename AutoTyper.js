// ==UserScript==
// @name         Human-Typer (Automatic) - Google Docs & Slides
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Types your text in a human-like manner so the edit history shows the progress. https://greasyfork.org/en/users/449798-ace-dx
// @author       ∫(Ace)³dx
// @match        https://docs.google.com/*
// @icon         https://i.imgur.com/z2gxKWZ.png
// @grant        none
// @license MIT
// @downloadURL https://update.greasyfork.org/scripts/474038/Human-Typer%20%28Automatic%29%20-%20Google%20Docs%20%20Slides.user.js
// @updateURL https://update.greasyfork.org/scripts/474038/Human-Typer%20%28Automatic%29%20-%20Google%20Docs%20%20Slides.meta.js
// ==/UserScript==

if (window.location.href.includes("docs.google.com/document/d") || window.location.href.includes("docs.google.com/presentation/d")) {
    console.log("Document opened, Human-Typer available!");

    const humanTyperButton = document.createElement("div");
    humanTyperButton.textContent = "Human-Typer";
    humanTyperButton.classList.add("menu-button", "goog-control", "goog-inline-block");
    humanTyperButton.style.userSelect = "none";
    humanTyperButton.setAttribute("aria-haspopup", "true");
    humanTyperButton.setAttribute("aria-expanded", "false");
    humanTyperButton.setAttribute("aria-disabled", "false");
    humanTyperButton.setAttribute("role", "menuitem");
    humanTyperButton.id = "human-typer-button";
    humanTyperButton.style.transition = "all 0.3s ease";
    humanTyperButton.style.padding = "8px 16px";
    humanTyperButton.style.borderRadius = "6px";
    humanTyperButton.style.cursor = "pointer";

    const stopButton = document.createElement("div");
    stopButton.textContent = "Stop";
    stopButton.classList.add("menu-button", "goog-control", "goog-inline-block");
    stopButton.style.userSelect = "none";
    stopButton.style.color = "#ff4444";
    stopButton.style.cursor = "pointer";
    stopButton.style.transition = "all 0.3s ease";
    stopButton.style.padding = "8px 16px";
    stopButton.style.borderRadius = "6px";
    stopButton.id = "stop-button";
    stopButton.style.display = "none";

    const helpMenu = document.getElementById("docs-help-menu");
    helpMenu.parentNode.insertBefore(humanTyperButton, helpMenu);
    humanTyperButton.parentNode.insertBefore(stopButton, humanTyperButton.nextSibling);

    let cancelTyping = false;
    let typingInProgress = false;
    let lowerBoundValue = 60;
    let upperBoundValue = 140;

    function showOverlay() {
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.top = "50%";
        overlay.style.left = "50%";
        overlay.style.transform = "translate(-50%, -50%)";
        overlay.style.backgroundColor = "#2d2d2d";
        overlay.style.padding = "25px";
        overlay.style.borderRadius = "12px";
        overlay.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";
        overlay.style.zIndex = "9999";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.alignItems = "center";
        overlay.style.width = "380px";
        overlay.style.color = "#ffffff";

        const textField = document.createElement("textarea");
        textField.rows = "6";
        textField.placeholder = "Enter your text...";
        textField.style.marginBottom = "15px";
        textField.style.width = "100%";
        textField.style.padding = "12px";
        textField.style.border = "1px solid #444";
        textField.style.borderRadius = "8px";
        textField.style.resize = "vertical";
        textField.style.backgroundColor = "#3d3d3d";
        textField.style.color = "#ffffff";
        textField.style.fontSize = "14px";

        const description = document.createElement("p");
        description.textContent = "It's necessary to keep this tab open; otherwise, the script will pause and will resume once you return to it (this behavior is caused by the way the browser functions). Lower bound is the minimum time in milliseconds per character. Upper bound is the maximum time in milliseconds per character. A random delay value will be selected between these bounds for every character in your text, ensuring that the typing appears natural and human-like.";
        description.style.fontSize = "14px";
        description.style.marginBottom = "20px";
        description.style.lineHeight = "1.5";
        description.style.color = "#cccccc";

        const randomDelayLabel = document.createElement("div");
        randomDelayLabel.style.marginBottom = "15px";
        randomDelayLabel.style.color = "#cccccc";

        const inputContainer = document.createElement("div");
        inputContainer.style.display = "flex";
        inputContainer.style.gap = "15px";
        inputContainer.style.marginBottom = "20px";

        const lowerBoundLabel = document.createElement("label");
        lowerBoundLabel.textContent = "Lower Bound (ms): ";
        lowerBoundLabel.style.color = "#cccccc";

        const lowerBoundInput = document.createElement("input");
        lowerBoundInput.type = "number";
        lowerBoundInput.min = "0";
        lowerBoundInput.value = lowerBoundValue;
        lowerBoundInput.style.padding = "8px";
        lowerBoundInput.style.border = "1px solid #444";
        lowerBoundInput.style.borderRadius = "6px";
        lowerBoundInput.style.backgroundColor = "#3d3d3d";
        lowerBoundInput.style.color = "#ffffff";
        lowerBoundInput.style.width = "80px";

        const upperBoundLabel = document.createElement("label");
        upperBoundLabel.textContent = "Upper Bound (ms): ";
        upperBoundLabel.style.color = "#cccccc";

        const upperBoundInput = document.createElement("input");
        upperBoundInput.type = "number";
        upperBoundInput.min = "0";
        upperBoundInput.value = upperBoundValue;
        upperBoundInput.style.padding = "8px";
        upperBoundInput.style.border = "1px solid #444";
        upperBoundInput.style.borderRadius = "6px";
        upperBoundInput.style.backgroundColor = "#3d3d3d";
        upperBoundInput.style.color = "#ffffff";
        upperBoundInput.style.width = "80px";

        const confirmButton = document.createElement("button");
        confirmButton.textContent = textField.value.trim() === "" ? "Cancel" : "Confirm";
        confirmButton.style.padding = "10px 24px";
        confirmButton.style.backgroundColor = "#2196f3";
        confirmButton.style.color = "white";
        confirmButton.style.border = "none";
        confirmButton.style.borderRadius = "6px";
        confirmButton.style.cursor = "pointer";
        confirmButton.style.transition = "background-color 0.3s";
        confirmButton.style.fontSize = "14px";
        confirmButton.style.fontWeight = "500";

        confirmButton.addEventListener("mouseenter", () => {
            confirmButton.style.backgroundColor = "#1976d2";
        });

        confirmButton.addEventListener("mouseleave", () => {
            confirmButton.style.backgroundColor = "#2196f3";
        });

        overlay.appendChild(description);
        overlay.appendChild(textField);
        overlay.appendChild(randomDelayLabel);
        
        const inputWrapper = document.createElement("div");
        inputWrapper.style.display = "flex";
        inputWrapper.style.gap = "15px";
        inputWrapper.style.marginBottom = "20px";
        
        const lowerBoundWrapper = document.createElement("div");
        lowerBoundWrapper.appendChild(lowerBoundLabel);
        lowerBoundWrapper.appendChild(lowerBoundInput);
        
        const upperBoundWrapper = document.createElement("div");
        upperBoundWrapper.appendChild(upperBoundLabel);
        upperBoundWrapper.appendChild(upperBoundInput);
        
        inputWrapper.appendChild(lowerBoundWrapper);
        inputWrapper.appendChild(upperBoundWrapper);
        
        overlay.appendChild(inputWrapper);
        overlay.appendChild(confirmButton);

        document.body.appendChild(overlay);

        return new Promise((resolve) => {
            const updateRandomDelayLabel = () => {
                const charCount = textField.value.length;
                const etaLowerBound = Math.ceil((charCount * parseInt(lowerBoundInput.value)) / 60000);
                const etaUpperBound = Math.ceil((charCount * parseInt(upperBoundInput.value)) / 60000);
                randomDelayLabel.textContent = `ETA: ${etaLowerBound} - ${etaUpperBound} minutes`;
            };

            const handleCancelClick = () => {
                cancelTyping = true;
                stopButton.style.display = "none";
            };

            confirmButton.addEventListener("click", () => {
                const userInput = textField.value.trim();
                lowerBoundValue = parseInt(lowerBoundInput.value);
                upperBoundValue = parseInt(upperBoundInput.value);

                if (userInput === "") {
                    document.body.removeChild(overlay);
                    return;
                }

                if (isNaN(lowerBoundValue) || isNaN(upperBoundValue) || lowerBoundValue < 0 || upperBoundValue < lowerBoundValue) return;

                typingInProgress = true;
                stopButton.style.display = "inline";
                document.body.removeChild(overlay);
                resolve({ userInput });
            });

            textField.addEventListener("input", () => {
                confirmButton.textContent = textField.value.trim() === "" ? "Cancel" : "Confirm";
                updateRandomDelayLabel();
            });

            lowerBoundInput.addEventListener("input", updateRandomDelayLabel);
            upperBoundInput.addEventListener("input", updateRandomDelayLabel);
            stopButton.addEventListener("click", handleCancelClick);
        });
    }

    humanTyperButton.addEventListener("mouseenter", () => {
        humanTyperButton.style.backgroundColor = "#f0f0f0";
    });

    humanTyperButton.addEventListener("mouseleave", () => {
        humanTyperButton.style.backgroundColor = "";
    });

    stopButton.addEventListener("mouseenter", () => {
        stopButton.style.backgroundColor = "#f0f0f0";
    });

    stopButton.addEventListener("mouseleave", () => {
        stopButton.style.backgroundColor = "";
    });

    humanTyperButton.addEventListener("click", async () => {
        if (typingInProgress) {
            console.log("Typing in progress, please wait...");
            return;
        }

        cancelTyping = false;
        stopButton.style.display = "none";

        const { userInput } = await showOverlay();

        if (userInput !== "") {
            const input = document.querySelector(".docs-texteventtarget-iframe").contentDocument.activeElement;

            async function simulateTyping(inputElement, char, delay) {
                return new Promise((resolve) => {
                    if (cancelTyping) {
                        stopButton.style.display = "none";
                        console.log("Typing cancelled");
                        resolve();
                        return;
                    }

                    setTimeout(() => {
                        let eventObj;
                        if (char === "\n") {
                            eventObj = new KeyboardEvent("keydown", {
                                bubbles: true,
                                key: "Enter",
                                code: "Enter",
                                keyCode: 13,
                                which: 13,
                                charCode: 13,
                            });
                        } else {
                            eventObj = new KeyboardEvent("keypress", {
                                bubbles: true,
                                key: char,
                                charCode: char.charCodeAt(0),
                                keyCode: char.charCodeAt(0),
                                which: char.charCodeAt(0),
                            });
                        }

                        inputElement.dispatchEvent(eventObj);
                        console.log(`Typed: ${char}, Delay: ${delay}ms`);
                        resolve();
                    }, delay);
                });
            }

            async function typeStringWithRandomDelay(inputElement, string) {
                for (let i = 0; i < string.length; i++) {
                    const char = string[i];
                    const randomDelay = Math.floor(Math.random() * (upperBoundValue - lowerBoundValue + 1)) + lowerBoundValue;
                    await simulateTyping(inputElement, char, randomDelay);
                }

                typingInProgress = false;
                stopButton.style.display = "none";
            }

            typeStringWithRandomDelay(input, userInput);
        }
    });
} else {
    console.log("Document not open, Human-Typer not available.");
}
