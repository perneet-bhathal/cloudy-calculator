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

function decodeHtmlFragment(value) {
  return String(value)
    .replace(/<sup>([^<]*)<\/sup>/gi, '^$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&times;/gi, '×')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, function (_, digits) { return String.fromCharCode(Number(digits)); })
    .replace(/\s+/g, ' ')
    .trim();
}

function extractGoogleCalculatorResult(html) {
  if (!html) return null;
  const patterns = [
    /id=["']cwos["'][^>]*>([^<]+)/i,
    /class=["'][^"']*\bqv3Wpe\b[^"']*["'][^>]*>([^<]+)/i
  ];
  for (let i = 0; i < patterns.length; i++) {
    const match = html.match(patterns[i]);
    if (match && match[1] && /[0-9]/.test(match[1])) {
      return decodeHtmlFragment(match[1]);
    }
  }
  return null;
}

async function queryGoogleCalculator(query) {
  const stored = await chrome.storage.local.get(['localGoogleOn', 'localGoogleUrl']);
  let base = 'https://www.google.com';
  if (stored.localGoogleOn && stored.localGoogleUrl) {
    try {
      const parsed = new URL(stored.localGoogleUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') base = parsed.origin;
    } catch (e) {
      base = 'https://www.google.com';
    }
  }
  const text = String(query || '').trim();
  if (!text) return null;
  const withEquals = /\d/.test(text) && !/=\s*$/.test(text) ? text + '=' : text;
  const url = base + '/search?hl=en&q=' + encodeURIComponent(withEquals);
  const response = await fetch(url, { credentials: 'omit', redirect: 'follow' });
  if (!response.ok) return null;
  return extractGoogleCalculatorResult(await response.text());
}

async function queryWolframAlpha(query) {
  const stored = await chrome.storage.local.get(['wolframAppId']);
  // A saved empty string turns Wolfram off. A missing key keeps the built-in App ID.
  const appId = Object.prototype.hasOwnProperty.call(stored, 'wolframAppId')
    ? String(stored.wolframAppId || '').trim()
    : 'P8EHXTA2KJ';
  if (!appId) return null;
  const text = String(query || '').trim();
  if (!text) return null;
  const url = 'https://api.wolframalpha.com/v1/result?appid=' + encodeURIComponent(appId) +
    '&units=metric&i=' + encodeURIComponent(text);
  const response = await fetch(url, { credentials: 'omit', redirect: 'follow' });
  if (!response.ok) return null;
  const body = (await response.text()).trim();
  if (!body) return null;
  return body.slice(0, 500);
}

async function queryOnlineCalculator(request) {
  const engine = request && request.engine;
  const query = request && request.query;
  try {
    if (engine === 'google') {
      return { output: await queryGoogleCalculator(query), source: 'google' };
    }
    if (engine === 'wolfram') {
      return { output: await queryWolframAlpha(query), source: 'wolfram' };
    }
    const wolfram = await queryWolframAlpha(query);
    if (wolfram) return { output: wolfram, source: 'wolfram' };
    const google = await queryGoogleCalculator(query);
    if (google) return { output: google, source: 'google' };
    return { output: null };
  } catch (error) {
    return { output: null };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || request.type !== 'onlineCalc') return;
  queryOnlineCalculator(request).then(sendResponse);
  return true;
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
