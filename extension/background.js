/* ==========================================================================
   Clippy Extension — Background Service Worker (Manifest V3)
   Handles context menus and cross-script messaging.
   ========================================================================== */

var AGENTS = ['Bonzi', 'Clippy', 'F1', 'Genie', 'Genius', 'Links', 'Merlin', 'Peedy', 'Rocky', 'Rover'];

// ---------------------------------------------------------------------------
// Context menu setup
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(function () {
  // Parent menu on extension icon
  chrome.contextMenus.create({
    id: 'clippy-parent',
    title: 'Clippy Agent',
    contexts: ['action']
  });

  // Agent sub-items
  AGENTS.forEach(function (name) {
    chrome.contextMenus.create({
      id: 'clippy-agent-' + name,
      parentId: 'clippy-parent',
      title: name,
      type: 'radio',
      checked: name === 'Clippy',
      contexts: ['action']
    });
  });

  chrome.contextMenus.create({
    id: 'clippy-sep',
    parentId: 'clippy-parent',
    type: 'separator',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'clippy-toggle',
    parentId: 'clippy-parent',
    title: 'Enable/Disable',
    type: 'checkbox',
    checked: true,
    contexts: ['action']
  });

  // "Ask Clippy about this" for selected text on pages
  chrome.contextMenus.create({
    id: 'clippy-ask-selection',
    title: 'Ask Clippy about this',
    contexts: ['selection']
  });

  // Sync initial state with storage
  chrome.storage.sync.get({ agent: 'Clippy', enabled: true }, function (items) {
    AGENTS.forEach(function (name) {
      chrome.contextMenus.update('clippy-agent-' + name, {
        checked: name === items.agent
      });
    });
    chrome.contextMenus.update('clippy-toggle', {
      checked: items.enabled
    });
  });
});

// ---------------------------------------------------------------------------
// Context menu click handler
// ---------------------------------------------------------------------------

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === 'clippy-toggle') {
    chrome.storage.sync.set({ enabled: info.checked });
    return;
  }

  // Agent selection
  var match = info.menuItemId.match(/^clippy-agent-(.+)$/);
  if (match) {
    chrome.storage.sync.set({ agent: match[1] });
    return;
  }

  // "Ask Clippy about this" — send selected text to content script
  if (info.menuItemId === 'clippy-ask-selection' && info.selectionText && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'askAboutSelection',
      text: info.selectionText
    });
  }
});

// ---------------------------------------------------------------------------
// Listen for storage changes to keep menu state in sync
// ---------------------------------------------------------------------------

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area !== 'sync') return;

  if (changes.agent) {
    AGENTS.forEach(function (name) {
      chrome.contextMenus.update('clippy-agent-' + name, {
        checked: name === changes.agent.newValue
      });
    });
  }

  if (changes.enabled) {
    chrome.contextMenus.update('clippy-toggle', {
      checked: changes.enabled.newValue
    });
  }
});

// ---------------------------------------------------------------------------
// Message handlers (popup test, etc.)
// ---------------------------------------------------------------------------

var CLIPPY_SYSTEM_PROMPT = 'You are Clippy, the helpful (and slightly sarcastic) Microsoft Office assistant. Keep responses brief — 2-3 sentences max. Be helpful but add personality. You\'re appearing in a speech bubble on a webpage so keep it concise.';

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'testGateway') {
    var headers = {};
    if (msg.token) {
      headers['Authorization'] = 'Bearer ' + msg.token;
    }
    fetch(msg.url, { method: 'GET', headers: headers })
      .then(function (res) {
        if (res.ok) {
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, error: 'HTTP ' + res.status });
        }
      })
      .catch(function (err) {
        sendResponse({ ok: false, error: err.message || 'Failed to connect' });
      });
    return true;
  }

  if (msg.type === 'gatewayChat') {
    // Load gateway settings and make the API call
    chrome.storage.sync.get({ gatewayUrl: '', gatewayToken: '' }, function (items) {
      if (!items.gatewayUrl) {
        sendResponse({ ok: false, error: 'Gateway URL not configured' });
        return;
      }

      var url = items.gatewayUrl.replace(/\/+$/, '') + '/v1/chat/completions';
      var headers = { 'Content-Type': 'application/json' };
      if (items.gatewayToken) {
        headers['Authorization'] = 'Bearer ' + items.gatewayToken;
      }

      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: 'openclaw/default',
          messages: [
            { role: 'system', content: CLIPPY_SYSTEM_PROMPT },
            { role: 'user', content: msg.message }
          ]
        })
      })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data.choices && data.choices[0] && data.choices[0].message) {
          sendResponse({ ok: true, text: data.choices[0].message.content });
        } else {
          sendResponse({ ok: false, error: 'Unexpected response format' });
        }
      })
      .catch(function (err) {
        sendResponse({ ok: false, error: err.message || 'Gateway request failed' });
      });
    });
    return true;
  }
});
