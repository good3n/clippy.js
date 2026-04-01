/* ==========================================================================
   Clippy Extension — Background Service Worker (Manifest V3)
   Handles context menus and cross-script messaging.
   ========================================================================== */

var AGENTS = ['Bonzi', 'Clippy', 'F1', 'Genie', 'Genius', 'Links', 'Merlin', 'Peedy', 'Rocky', 'Rover'];

// ---------------------------------------------------------------------------
// Context menu setup
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(function () {
  // Parent menu
  chrome.contextMenus.create({
    id: 'clippy-parent',
    title: 'Clippy Agent',
    contexts: ['action'] // show on extension icon click
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

  // Separator + toggle
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

  // Sync initial checked state with storage
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

chrome.contextMenus.onClicked.addListener(function (info) {
  if (info.menuItemId === 'clippy-toggle') {
    chrome.storage.sync.set({ enabled: info.checked });
    return;
  }

  // Agent selection
  var match = info.menuItemId.match(/^clippy-agent-(.+)$/);
  if (match) {
    chrome.storage.sync.set({ agent: match[1] });
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
