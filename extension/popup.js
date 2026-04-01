/* ==========================================================================
   Clippy Extension Popup — Settings Controller
   ========================================================================== */

(function () {
  'use strict';

  var CDN_BASE = 'https://unpkg.com/clippy-agent@2/agents';

  // Elements
  var enabledEl = document.getElementById('enabled');
  var agentEl = document.getElementById('agent');
  var quipMinEl = document.getElementById('quipMin');
  var quipMaxEl = document.getElementById('quipMax');
  var saveBtnEl = document.getElementById('saveBtn');
  var testBtnEl = document.getElementById('testBtn');
  var statusEl = document.getElementById('status');
  var previewEl = document.getElementById('agentPreview');

  // ---------------------------------------------------------------------------
  // Load saved settings
  // ---------------------------------------------------------------------------

  chrome.storage.sync.get({
    agent: 'Clippy',
    enabled: true,
    quipMin: 30,
    quipMax: 60
  }, function (items) {
    enabledEl.checked = items.enabled;
    agentEl.value = items.agent;
    quipMinEl.value = items.quipMin;
    quipMaxEl.value = items.quipMax;
    updatePreview(items.agent);
  });

  // ---------------------------------------------------------------------------
  // Agent preview
  // ---------------------------------------------------------------------------

  function updatePreview(agentName) {
    var img = new Image();
    img.style.imageRendering = 'pixelated';

    // We'll show the first frame of the sprite sheet (top-left corner),
    // clipped to the agent's frame size. Since we don't know the frame size
    // without loading agent data, we'll use a div with background clipping.
    var previewDiv = document.createElement('div');
    previewDiv.style.width = '124px';
    previewDiv.style.height = '93px';
    previewDiv.style.backgroundImage = 'url(' + CDN_BASE + '/' + agentName + '/map.png)';
    previewDiv.style.backgroundPosition = '0 0';
    previewDiv.style.backgroundRepeat = 'no-repeat';
    previewDiv.style.imageRendering = 'pixelated';
    previewDiv.style.overflow = 'hidden';

    previewEl.innerHTML = '';
    previewEl.appendChild(previewDiv);

    // Also show the agent name
    var label = document.createElement('div');
    label.textContent = agentName;
    label.style.marginTop = '4px';
    label.style.fontWeight = 'bold';
    previewEl.appendChild(label);
  }

  agentEl.addEventListener('change', function () {
    updatePreview(agentEl.value);
  });

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  saveBtnEl.addEventListener('click', function () {
    var minVal = parseInt(quipMinEl.value, 10) || 30;
    var maxVal = parseInt(quipMaxEl.value, 10) || 60;

    // Clamp values
    if (minVal < 5) minVal = 5;
    if (maxVal < minVal + 5) maxVal = minVal + 5;
    if (maxVal > 600) maxVal = 600;

    quipMinEl.value = minVal;
    quipMaxEl.value = maxVal;

    var settings = {
      agent: agentEl.value,
      enabled: enabledEl.checked,
      quipMin: minVal,
      quipMax: maxVal
    };

    chrome.storage.sync.set(settings, function () {
      statusEl.textContent = 'Settings saved!';

      // Flash effect
      saveBtnEl.textContent = 'Saved!';
      setTimeout(function () {
        saveBtnEl.textContent = 'OK';
        statusEl.textContent = 'Ready';
      }, 1500);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Quip — send message to active tab's content script
  // ---------------------------------------------------------------------------

  testBtnEl.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'speak', text: 'It looks like you are testing me. I approve!' });
        statusEl.textContent = 'Quip sent!';
        setTimeout(function () {
          statusEl.textContent = 'Ready';
        }, 1500);
      }
    });
  });

})();
