console.log("devtools.js running");

const MESSAGE_COMPLETION_ENDPOINT = "/completion";

// Devtools API expects a callback with body and encoding args
function handleResponseContent(body, encoding) {
    console.log(body);
}

chrome.devtools.network.onRequestFinished.addListener(request => {
    if (request.request.url.endsWith(MESSAGE_COMPLETION_ENDPOINT)) {
        request.getContent(handleResponseContent);
    }
});
