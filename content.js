// Will print upon successfully initializing extension on claude.ai (manifest.json => content_scripts => matches)
console.log("[Claude toolkit] content.js running");

const SLIDER_SELECTOR = '.inline-flex.gap-0.flex-row-reverse.overflow-hidden';

/**
 * Observes for Claude's chatbox's attachments slider, upon finding it, appends the speech to text button
 * Disconnects observer afterwards, to prevent side effects as the target element changes
 */
function observeAttachmentsSlider() {
    console.log("[Claude toolkit] observing for attachments slider");
    const observer = new MutationObserver(async () => {
        // Injects microphone button into Claude's UI, appending to the attachments slider button in the input textbox
        // WARNING: class based selectors are bound to break, hopefully Claude doesnt shake the room too much 
        // Reference: https://github.com/jfferreira97/claude-toolkit/blob/main/docs/images/claude-slider-button.png
        const sliderDiv = document.querySelector(SLIDER_SELECTOR);
        if (sliderDiv && !document.getElementById('speech-to-text-btn')) {
            // Past this point, observer is no longer needed
            observer.disconnect();
            try {
                // TODO: Get tooltip working
                const [buttonResponse] = await Promise.all([
                    fetch(chrome.runtime.getURL('assets/speech-to-text-btn.html')),
                ]);

                const buttonHtml = await buttonResponse.text();
                const buttonContainer = document.createElement('div');
                buttonContainer.innerHTML = buttonHtml;
                const button = sliderDiv.appendChild(buttonContainer.firstElementChild);
                const indicator = button.querySelector('#recording-indicator');
                
                button.querySelector('button').addEventListener('click', () => {
                    indicator.style.display = indicator.style.display === 'none' ? 'block' : 'none';
                });
            } catch (error) {
                console.error('[Claude toolkit] Error:', error);
            }
        }
    });

    // TODO: make observer attach to 'querySelector('.sticky.bottom-0')' on document load for performance
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * Claude is an SPA, this is the way I found to keep on observing for the attachments button as the user changes between different chats
 * @param {*} callback - callback function we intend on running
 */
function observeUrlChanges(callback) {
    const urlObserver = new MutationObserver(function (mutations) {
        if (location.href !== urlObserver.url) {
            urlObserver.url = location.href;
            callback();
        }
    });
    urlObserver.url = location.href;
    urlObserver.observe(document, {
        subtree: true,
        childList: true
    });
}

observeAttachmentsSlider();
observeUrlChanges(observeAttachmentsSlider);