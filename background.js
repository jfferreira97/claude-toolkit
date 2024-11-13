chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        console.log(details)
    },
    { urls: ["*://*.anthropic.com/*/messages/*"] },
    ["requestBody"]
);