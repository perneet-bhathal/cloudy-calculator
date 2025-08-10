// Background service worker for AI Cloudy Calculator
// Minimal background script for Manifest V3

// Handle installation/startup
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed successfully
});

// Handle external messages (for compatibility with external apps)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.helperIsInstalled === "yep") {
    // Store helper status if needed
  } else if (request.helperIsInstalled === "nope") {
    // Helper extension not available
  } else if (request.openPopOut) {
    // Open calculator popup window
    chrome.windows.create({
      url: 'calc.html',
      type: 'popup',
      width: 500,
      height: 500
    });
  }
  
  sendResponse({});
});
