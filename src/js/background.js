// Background service worker for AI Cloudy Calculator
// Minimal background script for Manifest V3

// Handle installation/startup
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed successfully
  // Update currency rates on install
  updateCurrencyRates();
});

// Update currency rates periodically
async function updateCurrencyRates() {
  try {
    var response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!response.ok) {
      throw new Error('Failed to fetch currency rates');
    }
    var data = await response.json();
    
    var rates = { USD: 1 };
    if (data.rates) {
      for (var currency in data.rates) {
        rates[currency] = data.rates[currency];
      }
    }
    
    // Save to storage
    await chrome.storage.local.set({
      currencyRates: rates,
      currencyRatesTimestamp: Date.now()
    });
    
    console.log('Currency rates updated successfully');
  } catch (error) {
    console.log('Currency update failed:', error);
  }
}

// Update rates every 24 hours
setInterval(updateCurrencyRates, 24 * 60 * 60 * 1000);

// Also update on startup
updateCurrencyRates();

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
