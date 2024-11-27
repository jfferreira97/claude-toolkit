// background.js
console.log("service worker working");

// Listen for URL/status changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log("Tab updated:", tab.url);
    if (tab.url?.includes("claude.ai") && changeInfo.status === 'complete') {
        injectScript(tabId);
    }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
        console.log("Tab activated:", tab.url);
        if (tab.url?.includes("claude.ai")) {
            injectScript(tab.id);
        }
    });
});

// Helper function to avoid code duplication
function injectScript(tabId) {
    console.log("Injecting into tab:", tabId);
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: injectToggleButtons
    });
}

function injectToggleButtons() {
    
    const targetSelector = 'div[data-is-streaming]';
    
    function addToggleToMessage(messageContainer) {
        if (messageContainer.querySelector('.raw-toggle')) {
            return;
        }
        
        const toggle = document.createElement('div');
        toggle.className = 'raw-toggle';
        toggle.innerHTML = `
            <div style="
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
            ">
                <span style="color: #565869; font-size: 12px;">Raw</span>
                <label class="switch" style="
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 20px;
                ">
                    <input type="checkbox" style="
                        opacity: 0;
                        width: 0;
                        height: 0;
                    ">
                    <span style="
                        position: absolute;
                        cursor: pointer;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: #2D2D2D;
                        transition: .4s;
                        border-radius: 34px;
                    ">
                        <span style="
                            position: absolute;
                            height: 16px;
                            width: 16px;
                            left: 2px;
                            bottom: 2px;
                            background-color: white;
                            transition: .4s;
                            border-radius: 50%;
                        "></span>
                    </span>
                </label>
            </div>
        `;
        
        messageContainer.style.position = 'relative';
        messageContainer.style.paddingTop = '40px';
        messageContainer.appendChild(toggle);
 
        // Add slider animation
        const slider = toggle.querySelector('input');
        const sliderButton = toggle.querySelector('span > span');
        
        slider.addEventListener('change', function() {
            if (this.checked) {
                sliderButton.style.transform = 'translateX(20px)';
                sliderButton.style.backgroundColor = '#0099FF';
            } else {
                sliderButton.style.transform = 'translateX(0)';
                sliderButton.style.backgroundColor = 'white';
            }
        });
    }
 
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.matches(targetSelector)) {
                        addToggleToMessage(node);
                    }
                }
            });
        });
    });
 
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
 
    const existing = document.querySelectorAll(targetSelector);
    existing.forEach(addToggleToMessage);
 }