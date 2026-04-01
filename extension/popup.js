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

  // AI elements
  var aiEnabledEl = document.getElementById('aiEnabled');
  var aiSettingsEl = document.getElementById('aiSettings');
  var gatewayUrlEl = document.getElementById('gatewayUrl');
  var gatewayTokenEl = document.getElementById('gatewayToken');
  var testGatewayBtnEl = document.getElementById('testGatewayBtn');
  var gatewayStatusEl = document.getElementById('gatewayStatus');
  var aiStatusCellEl = document.getElementById('aiStatusCell');

  // ---------------------------------------------------------------------------
  // Load saved settings
  // ---------------------------------------------------------------------------

  chrome.storage.sync.get({
    agent: 'Clippy',
    enabled: true,
    quipMin: 30,
    quipMax: 60,
    aiEnabled: false,
    gatewayUrl: '',
    gatewayToken: ''
  }, function (items) {
    enabledEl.checked = items.enabled;
    agentEl.value = items.agent;
    quipMinEl.value = items.quipMin;
    quipMaxEl.value = items.quipMax;
    aiEnabledEl.checked = items.aiEnabled;
    gatewayUrlEl.value = items.gatewayUrl;
    gatewayTokenEl.value = items.gatewayToken;
    updatePreview(items.agent);
    updateAiVisibility();
    updateAiStatusBar();
  });

  // ---------------------------------------------------------------------------
  // Agent preview
  // ---------------------------------------------------------------------------

  function updatePreview(agentName) {
    var previewDiv = document.createElement('div');
    previewDiv.style.width = '124px';
    previewDiv.style.height = '93px';
    previewDiv.style.backgroundImage = 'url(' + CDN_BASE + '/' + agentName + '/map.png)';
    previewDiv.style.backgroundPosition = '0 0';
    previewDiv.style.backgroundRepeat = 'no-repeat';
    previewDiv.style.imageRendering = 'pixelated';
    previewDiv.style.overflow = 'hidden';

    previewEl.textContent = '';
    previewEl.appendChild(previewDiv);

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
  // AI settings visibility
  // ---------------------------------------------------------------------------

  function updateAiVisibility() {
    aiSettingsEl.style.display = aiEnabledEl.checked ? 'block' : 'none';
  }

  function updateAiStatusBar() {
    if (aiEnabledEl.checked && gatewayUrlEl.value) {
      aiStatusCellEl.textContent = 'AI: On';
      aiStatusCellEl.style.color = '#080';
    } else if (aiEnabledEl.checked) {
      aiStatusCellEl.textContent = 'AI: No URL';
      aiStatusCellEl.style.color = '#c00';
    } else {
      aiStatusCellEl.textContent = 'AI: Off';
      aiStatusCellEl.style.color = '#888';
    }
  }

  aiEnabledEl.addEventListener('change', function () {
    updateAiVisibility();
    updateAiStatusBar();
  });

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  saveBtnEl.addEventListener('click', function () {
    var minVal = parseInt(quipMinEl.value, 10) || 30;
    var maxVal = parseInt(quipMaxEl.value, 10) || 60;

    if (minVal < 5) minVal = 5;
    if (maxVal < minVal + 5) maxVal = minVal + 5;
    if (maxVal > 600) maxVal = 600;

    quipMinEl.value = minVal;
    quipMaxEl.value = maxVal;

    var settings = {
      agent: agentEl.value,
      enabled: enabledEl.checked,
      quipMin: minVal,
      quipMax: maxVal,
      aiEnabled: aiEnabledEl.checked,
      gatewayUrl: gatewayUrlEl.value.trim(),
      gatewayToken: gatewayTokenEl.value
    };

    chrome.storage.sync.set(settings, function () {
      statusEl.textContent = 'Settings saved!';
      saveBtnEl.textContent = 'Saved!';
      updateAiStatusBar();
      setTimeout(function () {
        saveBtnEl.textContent = 'OK';
        statusEl.textContent = 'Ready';
      }, 1500);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Quip
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

  // ---------------------------------------------------------------------------
  // Test Gateway Connection
  // ---------------------------------------------------------------------------

  testGatewayBtnEl.addEventListener('click', function () {
    var url = gatewayUrlEl.value.trim();
    if (!url) {
      gatewayStatusEl.textContent = 'Enter a URL first';
      gatewayStatusEl.style.color = '#c00';
      return;
    }

    gatewayStatusEl.textContent = 'Testing...';
    gatewayStatusEl.style.color = '#888';
    testGatewayBtnEl.disabled = true;

    var headers = { 'Content-Type': 'application/json' };
    var token = gatewayTokenEl.value;
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    chrome.runtime.sendMessage({
      type: 'testGateway',
      url: url.replace(/\/+$/, '') + '/v1/models',
      token: token
    }, function (response) {
      testGatewayBtnEl.disabled = false;
      if (chrome.runtime.lastError) {
        gatewayStatusEl.textContent = 'Extension error';
        gatewayStatusEl.style.color = '#c00';
        return;
      }
      if (response && response.ok) {
        gatewayStatusEl.textContent = 'Connected!';
        gatewayStatusEl.style.color = '#080';
      } else {
        gatewayStatusEl.textContent = response ? response.error : 'Failed to connect';
        gatewayStatusEl.style.color = '#c00';
      }
    });
  });

})();
