(function () {
    // Will print upon successfully initializing extension on claude.ai (manifest.json => content_scripts => matches)
    console.log("[Claude toolkit] content.js running");

    // Selectors for targeting specific elements in the Claude.ai DOM
    const ATTACHMENTS_SLIDER_SELECTOR = '.inline-flex.gap-0.flex-row-reverse.overflow-hidden';
    const LANDING_PAGE_ATTACHMENTS_SELECTOR = 'div.inline-flex.gap-0:not(.flex-row)';

    /** Accessors for key Claude.ai UI elements (original or injected). @type {object} */
    const claudeUI = {
        /** @returns {HTMLElement | null} Attachments slider in chat input. */
        get attachmentsSlider() { return document.querySelector(ATTACHMENTS_SLIDER_SELECTOR); },

        /** @returns {HTMLElement | null} Landing page attachments container. */
        get landingPageAttachments() { return document.querySelector(LANDING_PAGE_ATTACHMENTS_SELECTOR); },

        /** @returns {HTMLElement | null} Claude's default Chatbox for text input. */
        get chatbox() { return document.querySelector('div[contenteditable="true"].ProseMirror'); },

        /** @returns {HTMLElement | null} Injected speech-to-text button. */
        get speechToTextButton() { return document.getElementById('speech-to-text-btn'); },

        /** @returns {HTMLElement | null} Injected GitHub import button. */
        get githubButton() { return document.getElementById('github-btn'); }
    };

    /** Observes for Claude's chatbox's attachments slider, upon finding it, appends the speech to text button */
    function observeAttachmentsSlider() {

        // Sets up a MutationObserver to watch for DOM changes
        const observer = new MutationObserver(async () => {
            // Injects microphone button, making sure to await its completion
            try {
                await injectSpeechToTextButton();
            } catch (error) {
                console.error("Error injecting speech-to-text button:", error);
            }
        });

        // Starts observing the entire document body for changes
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /** @async Injects the speech-to-text button. Reference: https://github.com/jfferreira97/claude-toolkit/blob/main/docs/images/microphone-button.png */
    async function injectSpeechToTextButton() {
        if (claudeUI.speechToTextButton) { return; }

        if (!claudeUI.attachmentsSlider) { return; }

        try {
            // TODO: Get tooltip working
            const [buttonResponse] = await Promise.all([fetch(chrome.runtime.getURL('assets/speech-to-text-btn.html')),]);

            const buttonHtml = await buttonResponse.text();
            const buttonContainer = document.createElement('div');
            buttonContainer.innerHTML = buttonHtml;

            if (!claudeUI.speechToTextButton) {
                const button = claudeUI.attachmentsSlider.appendChild(buttonContainer.firstElementChild);

                button.querySelector('button').addEventListener('click', () => {
                    const indicator = button.querySelector('#recording-indicator');
                    var isRecording = indicator.style.display === 'none'; // If at the moment of click, the indicator is not displayed, the current click will start recording 

                    indicator.style.display = isRecording ? 'block' : 'none';

                    if (isRecording) {
                        recognition = new webkitSpeechRecognition();
                        recognition.continuous = true;
                        recognition.interimResults = false;

                        recognition.onresult = (event) => {
                            const transcript = Array.from(event.results).map(result => result[0].transcript).join('');
                            console.log('[Claude toolkit] Speech to text transcript:', transcript);

                            const emptyP = claudeUI.chatbox.querySelector('p.is-empty'); // Find empty paragraph in chatbox to append transcripted text

                            // If Claude's chatbox is empty, the transcript must be added to emptyP to prevent an empty paragraph before the first populated paragraph of the chatbox
                            if (emptyP) {
                                emptyP.textContent = transcript;
                            } else {
                                const p = document.createElement('p');
                                p.textContent = transcript;
                                claudeUI.chatbox.appendChild(p);
                            }

                            // recognition.OnResult runs upon recording being finished, recording indicator gets hidden and recognition is stopped
                            indicator.style.display = 'none';
                            recognition.stop();
                            recognition = null;
                        };

                        recognition.onerror = (event) => {
                            console.error('[Claude toolkit] Speech recognition error:', event.error);
                            indicator.style.display = 'none';
                        };

                        recognition.start();
                    } else {
                        if (recognition) {
                            recognition.stop();
                            recognition = null;
                        }
                    }
                });
            }
        } catch (error) {
            console.error('[Claude toolkit] Error:', error);
        }
    }

    /** Observes the DOM for the landing page attachments container and injects the GitHub button. */
    function observeLandingPage() {
        const observer = new MutationObserver(async () => {
            try {
                await injectGithubButton();
            } catch (error) {
                console.error("Error injecting GitHub button:", error);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    /** @async Injects the GitHub import button. Reference: https://github.com/jfferreira97/claude-toolkit/blob/main/docs/images/github-button.png */
    async function injectGithubButton() {
        if (claudeUI.githubButton) {
            return;
        }

        const attachmentsContainer = claudeUI.landingPageAttachments;
        if (!attachmentsContainer) {
            return;
        }

        try {
            const [buttonResponse] = await Promise.all([fetch(chrome.runtime.getURL('assets/github-btn.html')),]);

            const buttonHtml = await buttonResponse.text();
            const buttonContainer = document.createElement('div');
            buttonContainer.innerHTML = buttonHtml;

            if (claudeUI.githubButton) { return; } // Early return in case the button has been added elsewhere
            attachmentsContainer.appendChild(buttonContainer.firstElementChild);
            // TODO: Implement repo2text functionalities
            // button.querySelector('button').addEventListener('click', handleRepoButtonClick); 
        } catch (error) {
            console.error('[Claude toolkit] Error appending github button:', error);
        }
    }

    /**
     * Claude is an SPA, this is the way I found to keep on observing for the attachments button as the user changes between different chats
     * @param {*} callback - callback function we intend on running
     */
    function observeUrlChanges(callback) {
        const urlObserver = new MutationObserver(() => {
            if (location.href !== urlObserver.url) {
                urlObserver.url = location.href; // Run callback if window URL changes
                callback();
            }
        });
        urlObserver.url = location.href; // Store initial URL
        urlObserver.observe(document.body, { subtree: true, childList: true });
    }

    function setObservers() {
        observeAttachmentsSlider();
        observeLandingPage();
    }

    setObservers();
    observeUrlChanges(setObservers);
})();