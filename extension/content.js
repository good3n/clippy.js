/* ==========================================================================
   Clippy Browser Companion — Content Script
   No ES modules. Everything self-contained in an IIFE.
   Animation engine matches the fixed core library (src/agent.ts, etc).
   ========================================================================== */

(function () {
  'use strict';

  // Bail if already injected (e.g. multiple content script loads)
  if (window.__clippyExtensionLoaded) return;
  window.__clippyExtensionLoaded = true;

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var CDN_BASE = 'https://unpkg.com/clippy-agent@2/agents';
  var AGENTS = ['Bonzi', 'Clippy', 'F1', 'Genie', 'Genius', 'Links', 'Merlin', 'Peedy', 'Rocky', 'Rover'];
  var WORD_SPEAK_TIME = 200;
  var CLOSE_BALLOON_DELAY = 4000;
  var BALLOON_MARGIN = 15;
  var DRAG_THRESHOLD = 5;
  var DEFAULT_QUIP_MIN = 30;
  var DEFAULT_QUIP_MAX = 60;

  // ---------------------------------------------------------------------------
  // Context-Aware Quips
  // ---------------------------------------------------------------------------

  var SITE_QUIPS = {
    gmail: [
      'It looks like you are writing an email. Would you like help making it passive-aggressive?',
      'Did you really just type "per my last email"? Bold move.',
      'I notice you have 3,847 unread emails. Want me to declare email bankruptcy?',
      'That reply-all was brave. Very, very brave.',
      'Would you like me to add more exclamation points? You sound a bit too calm!',
      'Pro tip: "Regards" means you are annoyed. "Best regards" means you are VERY annoyed.'
    ],
    github: [
      'It looks like you are reviewing code. Have you tried blaming someone else?',
      'That commit message says "fix stuff." Shakespeare would be proud.',
      'I see you are about to merge to main. Living dangerously, I like it.',
      'Have you considered that the bug is actually a feature?',
      'I notice this PR has been open for 47 days. At this point, just close it.',
      '"LGTM" — you did not actually read it, did you?'
    ],
    google_search: [
      'It looks like you are searching for something. Have you tried asking me instead?',
      'Fun fact: I could have found that for you faster. Probably.',
      'Page 2 of Google? You must be truly desperate.',
      'Let me guess — you are going to click the first link without reading the rest.',
      'I see you are googling error messages. Classic developer move.',
      'Have you tried turning it off and on again?'
    ],
    youtube: [
      'It looks like you are procrastinating. Would you like to procrastinate more efficiently?',
      '"Just one more video" — that is what you said three hours ago.',
      'Your watch history is a journey. A concerning journey.',
      'Would you like me to calculate how much time you have spent here today? Actually, better not.',
      'I notice you are watching a 10-hour video. I admire your commitment.',
      'The algorithm knows you better than you know yourself.'
    ],
    twitter: [
      'It looks like you are about to post something you will regret.',
      'Are you sure you want to engage with that? Discretion is the better part of valor.',
      'I have analyzed this thread. Nobody wins. Nobody.',
      'Would you like me to draft a tweet you will delete in 5 minutes?',
      'Ratio incoming. I can feel it.',
      'Hot take detected. Deploying asbestos suit.'
    ],
    reddit: [
      'It looks like you are reading Reddit. Your productivity called — it misses you.',
      'AITA for telling you to stop scrolling? No. No I am not.',
      'I see you are three subreddits deep. There is no coming back now.',
      'Would you like me to sort by controversial? That is where the fun is.',
      'This rabbit hole goes deeper than you think.',
      'You have been scrolling for a while. Your posture is terrible, by the way.'
    ],
    amazon: [
      'It looks like you are shopping. Would you like me to hide your credit card?',
      'Do you NEED it, or do you WANT it? Never mind, add to cart.',
      'I see you are reading reviews. The one-star reviews are the honest ones.',
      'Your cart total is concerning. Just saying.',
      '"Customers who bought this also bought" — do not fall for it!',
      'Free shipping if you spend more? That is not saving money, that is math.'
    ],
    linkedin: [
      'It looks like you are pretending to network.',
      'Excited to announce that I am excited to announce things!',
      'I see you are endorsing someone for a skill you have never seen them use.',
      'Would you like me to write a thought leadership post about disrupting synergies?',
      'That recruiter message was definitely not sent to 500 other people.',
      'Agree? Thoughts? Let me know in the comments. I will not read them.'
    ],
    stackoverflow: [
      'It looks like you are copying code. I will not tell anyone.',
      'Marked as duplicate. The universal Stack Overflow greeting.',
      'The answer with -2 votes is actually correct. Trust me.',
      'Would you like me to explain this code, or should we just pretend you wrote it?',
      'I see the question was asked in 2009. The accepted answer uses jQuery.',
      'Copy. Paste. Pray. The developer workflow.'
    ],
    slack: [
      'It looks like you are avoiding real work by chatting.',
      'Do you really need to send a GIF for every message?',
      'I see you are in #random. At least you are honest about it.',
      'Would you like me to set your status to "Focusing" while you chat?',
      'That emoji reaction was passive-aggressive and I respect it.',
      'You have 47 unread channels. Some of them might be important. Probably not.'
    ],
    discord: [
      'It looks like you are avoiding real work by chatting.',
      'I see you have 12 servers. You only visit 2 of them.',
      'Would you like me to help you touch grass?',
      'Your Discord status has been "Do Not Disturb" for 3 weeks.',
      'I notice you are in a voice channel. Is anyone actually talking?',
      'Another server notification. Surely this one is important.'
    ],
    google_docs: [
      'It looks like you are writing a document. Need help procrastinating instead?',
      'I see cursor blinking but no typing. Writer\'s block?',
      'Would you like me to suggest more buzzwords? "Synergy" is always a winner.',
      'That paragraph could use some work. All of them, actually.',
      'I notice 3 people are viewing this doc. Two of them are you.',
      'The comments say "Great work!" Nobody actually read it.'
    ],
    video_call: [
      'It looks like you are in a meeting. Would you like me to fake a bad connection?',
      '"You are on mute." The most-used phrase of the decade.',
      'This meeting could have been an email. But here we are.',
      'I see you turned off your camera. Smart move.',
      'Would you like me to generate some authentic-sounding background noise?',
      'I notice you are multitasking. Your secret is safe with me.'
    ]
  };

  var GENERIC_QUIPS = [
    'Need help?',
    'I see you are working hard!',
    'Would you like me to search the web for that?',
    'You look like you could use some help!',
    'Remember to save your work!',
    'Tip: Try pressing Ctrl+Z. It fixes most things in life.',
    'I am just here if you need me!',
    'Have you tried turning it off and on again?',
    'You are doing great! Probably.',
    'I have been watching you work. Not in a creepy way.',
    'Fun fact: I was born in 1997. I have seen things.',
    'Would you like me to organize your desktop? Just kidding, I cannot do that.',
    'Remember: every expert was once a beginner who had me.',
    'It looks like you are clicking things. Can I click things too?',
    'I believe in you! Even if your code does not compile.',
    'Pro tip: Coffee is the answer. I do not know the question.',
    'You seem stressed. Have you tried blaming the intern?'
  ];

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getSiteCategory() {
    var host = window.location.hostname.toLowerCase();
    var path = window.location.pathname.toLowerCase();

    if (host.includes('mail.google') || host.includes('outlook') || (host.includes('yahoo') && path.includes('mail')))
      return 'gmail';
    if (host.includes('github'))
      return 'github';
    if (host === 'www.google.com' && (path === '/search' || path === '/' || path.startsWith('/search')))
      return 'google_search';
    if (host.includes('youtube'))
      return 'youtube';
    if (host.includes('twitter.com') || host.includes('x.com'))
      return 'twitter';
    if (host.includes('reddit'))
      return 'reddit';
    if (host.includes('amazon'))
      return 'amazon';
    if (host.includes('linkedin'))
      return 'linkedin';
    if (host.includes('stackoverflow') || host.includes('stackexchange'))
      return 'stackoverflow';
    if (host.includes('slack.com'))
      return 'slack';
    if (host.includes('discord'))
      return 'discord';
    if (host.includes('docs.google'))
      return 'google_docs';
    if (host.includes('meet.google') || host.includes('zoom.us'))
      return 'video_call';

    return null;
  }

  function getQuip() {
    var category = getSiteCategory();
    if (category && SITE_QUIPS[category]) {
      if (Math.random() < 0.7) {
        return pickRandom(SITE_QUIPS[category]);
      }
    }
    return pickRandom(GENERIC_QUIPS);
  }

  // ---------------------------------------------------------------------------
  // Agent Loader (adapted from src/loader.ts — no ES modules)
  // ---------------------------------------------------------------------------

  if (!window.clippy) {
    window.clippy = {};
  }

  var agentDataCache = {};
  var spriteCache = {};

  function loadAgentData(name) {
    if (agentDataCache[name]) {
      return Promise.resolve(agentDataCache[name]);
    }

    // Use fetch instead of <script> injection to avoid CSP blocks.
    // The agent.js files are JSONP: clippy.ready('Name', { ... })
    return fetch(CDN_BASE + '/' + name + '/agent.js')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        // Extract JSON from: clippy.ready('AgentName', {...})
        var match = text.match(/clippy\.ready\s*\(\s*'[^']+'\s*,\s*/);
        if (!match) throw new Error('Unexpected agent.js format');
        var jsonStr = text.slice(match.index + match[0].length, -2); // trim trailing ");"
        var data = JSON.parse(jsonStr);
        agentDataCache[name] = data;
        return data;
      });
  }

  function preloadSprite(name) {
    if (spriteCache[name]) {
      return Promise.resolve(spriteCache[name]);
    }

    // Fetch as blob to avoid CSP img-src blocks on strict sites
    return fetch(CDN_BASE + '/' + name + '/map.png')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.blob();
      })
      .then(function (blob) {
        var blobUrl = URL.createObjectURL(blob);
        spriteCache[name] = blobUrl;
        return blobUrl;
      })
      .catch(function () {
        return null;
      });
  }

  function loadAgent(name) {
    return Promise.all([loadAgentData(name), preloadSprite(name)]).then(function (results) {
      return { data: results[0], spriteSrc: results[1] || (CDN_BASE + '/' + name + '/map.png') };
    });
  }

  // ---------------------------------------------------------------------------
  // Queue (matches src/queue.ts)
  // ---------------------------------------------------------------------------

  function Queue(onEmptyCallback) {
    this._queue = [];
    this._active = false;
    this._onEmptyCallback = onEmptyCallback;
  }

  Queue.prototype.queue = function (func) {
    this._queue.push(func);
    if (this._queue.length === 1 && !this._active) {
      this._progressQueue();
    }
  };

  Queue.prototype._progressQueue = function () {
    if (!this._queue.length) {
      this._onEmptyCallback();
      return;
    }
    var f = this._queue.shift();
    this._active = true;
    var self = this;
    f(function () { self.next(); });
  };

  Object.defineProperty(Queue.prototype, 'active', {
    get: function () {
      return this._active || this._queue.length > 0;
    }
  });

  Queue.prototype.clear = function () {
    this._queue = [];
  };

  Queue.prototype.next = function () {
    this._active = false;
    this._progressQueue();
  };

  // ---------------------------------------------------------------------------
  // Animator (matches src/animator.ts)
  // ---------------------------------------------------------------------------

  var ANIM_EXITED = 'EXITED';
  var ANIM_WAITING = 'WAITING';

  function Animator(el, spriteSrc, data) {
    this._el = el;
    this._data = data;
    this._spriteSrc = spriteSrc;
    this._currentFrameIndex = 0;
    this._currentFrame = undefined;
    this._currentAnimation = undefined;
    this.currentAnimationName = undefined;
    this._overlays = [];
    this._exiting = false;
    this._endCallback = undefined;
    this._loop = null;

    this._setup();
  }

  Animator.prototype._setup = function () {
    var frameW = this._data.framesize[0];
    var frameH = this._data.framesize[1];

    // Clear children safely (no innerHTML)
    while (this._el.firstChild) {
      this._el.removeChild(this._el.firstChild);
    }
    this._el.style.width = frameW + 'px';
    this._el.style.height = frameH + 'px';

    var overlayCount = this._data.overlayCount || 1;
    this._overlays = [];
    for (var i = 0; i < overlayCount; i++) {
      var overlay = document.createElement('div');
      overlay.className = 'clippy-overlay';
      overlay.style.width = frameW + 'px';
      overlay.style.height = frameH + 'px';
      overlay.style.background = 'url(' + this._spriteSrc + ') no-repeat';
      overlay.style.display = 'none';
      this._el.appendChild(overlay);
      this._overlays.push(overlay);
    }
  };

  Animator.prototype.animations = function () {
    return Object.keys(this._data.animations);
  };

  Animator.prototype.hasAnimation = function (name) {
    return !!this._data.animations[name];
  };

  Animator.prototype.exitAnimation = function () {
    this._exiting = true;
  };

  Animator.prototype.showAnimation = function (animationName, stateChangeCallback) {
    this._exiting = false;
    if (!this._data.animations[animationName]) return false;

    // Kill any running loop first
    this._clearLoop();

    this._currentAnimation = this._data.animations[animationName];
    this.currentAnimationName = animationName;
    this._currentFrameIndex = 0;
    this._currentFrame = undefined;
    this._endCallback = stateChangeCallback;

    this._step();
    return true;
  };

  Animator.prototype._clearLoop = function () {
    if (this._loop !== null) {
      clearTimeout(this._loop);
      this._loop = null;
    }
  };

  Animator.prototype._draw = function () {
    var images = (this._currentFrame && this._currentFrame.images) || [];
    for (var i = 0; i < this._overlays.length; i++) {
      if (i < images.length) {
        var xy = images[i];
        this._overlays[i].style.backgroundPosition = (-xy[0]) + 'px ' + (-xy[1]) + 'px';
        this._overlays[i].style.display = 'block';
      } else {
        this._overlays[i].style.display = 'none';
      }
    }
  };

  Animator.prototype._getNextAnimationFrame = function () {
    if (!this._currentAnimation) return undefined;
    if (!this._currentFrame) return 0;

    if (this._exiting && this._currentFrame.exitBranch !== undefined) {
      return this._currentFrame.exitBranch;
    }

    var branching = this._currentFrame.branching;
    if (branching && branching.branches) {
      var rnd = Math.random() * 100;
      for (var i = 0; i < branching.branches.length; i++) {
        var branch = branching.branches[i];
        if (rnd <= branch.weight) return branch.frameIndex;
        rnd -= branch.weight;
      }
    }

    return this._currentFrameIndex + 1;
  };

  Animator.prototype._atLastFrame = function () {
    if (!this._currentAnimation) return true;
    return this._currentFrameIndex >= this._currentAnimation.frames.length - 1;
  };

  Animator.prototype._step = function () {
    if (!this._currentAnimation) return;

    var nextFrame = this._getNextAnimationFrame();
    var maxFrame = this._currentAnimation.frames.length - 1;
    var newFrameIndex = Math.min(nextFrame !== undefined ? nextFrame : 0, maxFrame);
    var frameChanged = !this._currentFrame || this._currentFrameIndex !== newFrameIndex;
    this._currentFrameIndex = newFrameIndex;

    if (!(this._atLastFrame() && this._currentAnimation.useExitBranching)) {
      this._currentFrame = this._currentAnimation.frames[this._currentFrameIndex];
    }

    this._draw();

    var duration = (this._currentFrame && this._currentFrame.duration) || 100;
    var self = this;

    if (this._endCallback && frameChanged && this._atLastFrame()) {
      if (this._currentAnimation.useExitBranching && !this._exiting) {
        this._loop = setTimeout(function () { self._step(); }, duration);
        this._endCallback(this.currentAnimationName, ANIM_WAITING);
      } else {
        this._loop = null;
        this._endCallback(this.currentAnimationName, ANIM_EXITED);
      }
    } else {
      this._loop = setTimeout(function () { self._step(); }, duration);
    }
  };

  Animator.prototype.pause = function () {
    this._clearLoop();
  };

  Animator.prototype.resume = function () {
    if (this._currentAnimation) {
      this._step();
    }
  };

  Animator.prototype.destroy = function () {
    this._clearLoop();
    this._currentAnimation = undefined;
    this._endCallback = undefined;
    this._currentFrame = undefined;
  };

  // ---------------------------------------------------------------------------
  // Balloon (matches src/balloon.ts — position:fixed, no scrollY)
  // ---------------------------------------------------------------------------

  function Balloon(agentEl) {
    this._agentEl = agentEl;
    this._balloon = null;
    this._content = null;
    this._tip = null;
    this._hidden = true;
    this._active = false;
    this._hold = false;
    this._complete = undefined;
    this._wordLoop = null;
    this._hideTimer = null;
    this._addWordFn = undefined;

    this._setup();
  }

  Balloon.prototype._setup = function () {
    this._balloon = document.createElement('div');
    this._balloon.className = 'clippy-balloon';
    this._balloon.style.display = 'none';

    var close = document.createElement('button');
    close.className = 'clippy-balloon-close';
    close.textContent = '\u00D7';
    var self = this;
    close.addEventListener('click', function () {
      self.hide(true);
    });

    this._tip = document.createElement('div');
    this._tip.className = 'clippy-tip';

    this._content = document.createElement('div');
    this._content.className = 'clippy-content';

    this._balloon.appendChild(close);
    this._balloon.appendChild(this._tip);
    this._balloon.appendChild(this._content);
    document.body.appendChild(this._balloon);
  };

  Balloon.prototype.speak = function (complete, text, hold) {
    this._hidden = false;
    this.show();

    this._content.style.height = 'auto';
    this._content.style.width = 'auto';
    this._content.textContent = text;

    // Measure then reset
    var h = this._content.offsetHeight;
    var w = this._content.offsetWidth;
    this._content.style.height = h + 'px';
    this._content.style.width = w + 'px';
    this._content.textContent = '';

    this._balloon.classList.add('clippy-balloon-show');
    this.reposition();
    this._complete = complete;
    this._sayWords(text, !!hold, complete);
  };

  Balloon.prototype.show = function () {
    if (this._hidden) return;
    this._balloon.style.display = '';
  };

  Balloon.prototype.hide = function (fast) {
    if (this._wordLoop) {
      clearTimeout(this._wordLoop);
      this._wordLoop = null;
    }
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
    this._active = false;
    this._addWordFn = undefined;

    this._hidden = true;
    this._balloon.classList.remove('clippy-balloon-show');

    var self = this;
    if (fast) {
      this._balloon.style.display = 'none';
    } else {
      setTimeout(function () {
        if (self._hidden) {
          self._balloon.style.display = 'none';
        }
      }, 300);
    }
  };

  Balloon.prototype._sayWords = function (text, hold, complete) {
    this._active = true;
    this._hold = hold;
    var words = text.split(/[^\S-]/);
    var time = WORD_SPEAK_TIME;
    var idx = 1;
    var self = this;

    this._addWordFn = function () {
      if (!self._active) return;
      if (idx > words.length) {
        self._addWordFn = undefined;
        self._active = false;
        if (!self._hold) {
          complete();
          self._hideTimer = setTimeout(function () {
            self.hide(false);
          }, CLOSE_BALLOON_DELAY);
        }
      } else {
        self._content.textContent = words.slice(0, idx).join(' ');
        idx++;
        self._wordLoop = setTimeout(function () {
          if (self._addWordFn) self._addWordFn();
        }, time);
      }
    };

    this._addWordFn();
  };

  Balloon.prototype.reposition = function () {
    var sides = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    for (var i = 0; i < sides.length; i++) {
      this._position(sides[i]);
      if (!this._isOut()) break;
    }
  };

  Balloon.prototype._position = function (side) {
    var agentRect = this._agentEl.getBoundingClientRect();
    var balloonRect = this._balloon.getBoundingClientRect();

    this._balloon.className = 'clippy-balloon clippy-balloon-show clippy-' + side;

    var top, left;
    if (side === 'top-left') {
      top = agentRect.top - balloonRect.height - BALLOON_MARGIN;
      left = agentRect.left + agentRect.width - balloonRect.width;
    } else if (side === 'top-right') {
      top = agentRect.top - balloonRect.height - BALLOON_MARGIN;
      left = agentRect.left;
    } else if (side === 'bottom-left') {
      top = agentRect.top + agentRect.height + BALLOON_MARGIN;
      left = agentRect.left + agentRect.width - balloonRect.width;
    } else {
      top = agentRect.top + agentRect.height + BALLOON_MARGIN;
      left = agentRect.left;
    }

    // position:fixed — no scrollY/scrollX needed
    this._balloon.style.top = top + 'px';
    this._balloon.style.left = left + 'px';
  };

  Balloon.prototype._isOut = function () {
    var rect = this._balloon.getBoundingClientRect();
    return (rect.top < 0 || rect.left < 0 || rect.bottom > window.innerHeight || rect.right > window.innerWidth);
  };

  Balloon.prototype.pause = function () {
    if (this._wordLoop) { clearTimeout(this._wordLoop); this._wordLoop = null; }
    if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
  };

  Balloon.prototype.resume = function () {
    if (this._addWordFn) {
      this._addWordFn();
    }
  };

  Balloon.prototype.destroy = function () {
    this.pause();
    if (this._balloon && this._balloon.parentNode) {
      this._balloon.parentNode.removeChild(this._balloon);
    }
  };

  // ---------------------------------------------------------------------------
  // ClippyAgent — Main controller (matches src/agent.ts patterns)
  // ---------------------------------------------------------------------------

  function ClippyAgent() {
    this._el = null;
    this._animator = null;
    this._balloon = null;
    this._queue = null;
    this._agentName = 'Clippy';
    this._enabled = true;
    this._quipMin = DEFAULT_QUIP_MIN;
    this._quipMax = DEFAULT_QUIP_MAX;
    this._quipTimer = null;
    this._idleRestartTimer = null;
    this._hidden = true;
    this._paused = false;
    this._lastQuipTime = 0;
    this._contextMenu = null;
    this._askMenu = null;
    this._clickTimer = null;

    // AI / OpenClaw gateway
    this._aiEnabled = false;
    this._gatewayUrl = '';
    this._gatewayToken = '';
    this._lastAiQuipTime = 0;
    this._aiQuipCooldown = 300000; // 5 minutes

    // Drag state
    this._dragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._dragOffsetX = 0;
    this._dragOffsetY = 0;
    this._targetX = 0;
    this._targetY = 0;
    this._dragUpdateLoop = null;
    this._moveHandle = null;
    this._upHandle = null;

    // Bind event handlers
    this._onDblClick = this._handleDblClick.bind(this);
    this._onContextMenu = this._handleContextMenu.bind(this);
    this._onDocClick = this._handleDocClick.bind(this);
    this._resizeHandler = this._handleResize.bind(this);
  }

  // ─── Init ───

  ClippyAgent.prototype.init = function () {
    var self = this;
    return this._loadSettings().then(function () {
      if (!self._enabled) return;
      return self._createAgent();
    });
  };

  ClippyAgent.prototype._loadSettings = function () {
    var self = this;
    return new Promise(function (resolve) {
      if (chrome && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get({
          agent: 'Clippy',
          enabled: true,
          quipMin: DEFAULT_QUIP_MIN,
          quipMax: DEFAULT_QUIP_MAX,
          aiEnabled: false,
          gatewayUrl: '',
          gatewayToken: ''
        }, function (items) {
          self._agentName = items.agent;
          self._enabled = items.enabled;
          self._quipMin = items.quipMin;
          self._quipMax = items.quipMax;
          self._aiEnabled = items.aiEnabled;
          self._gatewayUrl = items.gatewayUrl;
          self._gatewayToken = items.gatewayToken;
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  ClippyAgent.prototype._createAgent = function () {
    var self = this;

    this._el = document.createElement('div');
    this._el.className = 'clippy';
    this._el.style.position = 'fixed';
    this._el.style.zIndex = '2147483646';
    this._el.style.cursor = 'pointer';
    this._el.style.display = 'none';
    document.body.appendChild(this._el);

    this._balloon = new Balloon(this._el);
    this._queue = new Queue(function () { self._onQueueEmpty(); });

    return loadAgent(this._agentName).then(function (result) {
      self._animator = new Animator(self._el, result.spriteSrc, result.data);
      self._attachEvents();
      self._show();
    }).catch(function (err) {
      console.warn('[Clippy Extension] Failed to load agent:', err);
    });
  };

  // ─── Show / Hide ───

  ClippyAgent.prototype._show = function () {
    this._hidden = false;
    this._el.style.display = '';

    if (!this._el.style.top || !this._el.style.left ||
        this._el.style.top === '' || this._el.style.left === '') {
      var left = Math.min(window.innerWidth * 0.8, window.innerWidth - 150);
      var top = Math.min(window.innerHeight * 0.8, window.innerHeight - 130);
      this._el.style.top = top + 'px';
      this._el.style.left = left + 'px';
      this._el.style.bottom = '';
      this._el.style.right = '';
    }

    this.resume();
    this._play('Show');
    this._scheduleQuip();
  };

  // ─── Queue-based play / speak ───

  ClippyAgent.prototype._play = function (animation, timeout, cb) {
    if (!this._animator || !this._animator.hasAnimation(animation)) return false;
    if (timeout === undefined) timeout = 5000;

    var self = this;
    this._queue.queue(function (complete) {
      var completed = false;

      var callback = function (_name, state) {
        if (state === ANIM_EXITED) {
          completed = true;
          if (cb) cb();
          complete();
        }
      };

      if (timeout) {
        setTimeout(function () {
          if (completed) return;
          self._animator.exitAnimation();
        }, timeout);
      }

      self._playInternal(animation, callback);
    });

    return true;
  };

  ClippyAgent.prototype._speak = function (text, hold) {
    var self = this;
    this._queue.queue(function (complete) {
      self._balloon.speak(complete, text, hold);
    });
  };

  ClippyAgent.prototype._playInternal = function (animation, callback) {
    if (this._idleRestartTimer) {
      clearTimeout(this._idleRestartTimer);
      this._idleRestartTimer = null;
    }

    // Kill idle immediately — showAnimation() clears its loop
    this._animator.showAnimation(animation, callback);
  };

  // ─── Idle ───

  ClippyAgent.prototype._onQueueEmpty = function () {
    if (this._hidden || this._paused || this._isIdleAnimation() || this._queue.active) return;

    var idleAnims = this._animator.animations().filter(function (a) {
      return a.indexOf('Idle') === 0;
    });
    if (!idleAnims.length) return;

    var anim = pickRandom(idleAnims);
    var self = this;

    this._animator.showAnimation(anim, function (_name, state) {
      if (state === ANIM_EXITED) {
        if (!self._hidden) {
          self._idleRestartTimer = setTimeout(function () {
            self._idleRestartTimer = null;
            self._onQueueEmpty();
          }, 1000);
        }
      }
    });
  };

  ClippyAgent.prototype._isIdleAnimation = function () {
    var c = this._animator && this._animator.currentAnimationName;
    return !!c && c.indexOf('Idle') === 0;
  };

  // ─── Pause / Resume ───

  ClippyAgent.prototype.pause = function () {
    this._paused = true;
    if (this._animator) this._animator.pause();
    if (this._balloon) this._balloon.pause();
  };

  ClippyAgent.prototype.resume = function () {
    this._paused = false;
    if (this._animator) this._animator.resume();
    if (this._balloon) this._balloon.resume();
  };

  // ─── Events ───

  ClippyAgent.prototype._attachEvents = function () {
    var self = this;
    this._el.addEventListener('mousedown', function (e) { self._handleMouseDown(e); });
    this._el.addEventListener('dblclick', this._onDblClick);
    this._el.addEventListener('contextmenu', this._onContextMenu);
    document.addEventListener('click', this._onDocClick);
    window.addEventListener('resize', this._resizeHandler);
  };

  ClippyAgent.prototype._detachEvents = function () {
    if (this._el) {
      this._el.removeEventListener('dblclick', this._onDblClick);
      this._el.removeEventListener('contextmenu', this._onContextMenu);
    }
    if (this._moveHandle) window.removeEventListener('mousemove', this._moveHandle);
    if (this._upHandle) window.removeEventListener('mouseup', this._upHandle);
    document.removeEventListener('click', this._onDocClick);
    window.removeEventListener('resize', this._resizeHandler);
  };

  ClippyAgent.prototype._handleResize = function () {
    this._reposition();
  };

  // ─── Drag (matches src/agent.ts — 5px dead zone, updateLocation loop) ───

  ClippyAgent.prototype._handleMouseDown = function (e) {
    if (e.button !== 0) return;
    e.preventDefault();

    // Cancel pending single-click timer (double-click in progress)
    if (this._clickTimer) {
      clearTimeout(this._clickTimer);
      this._clickTimer = null;
    }

    this._dragging = false;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;

    var rect = this._el.getBoundingClientRect();
    this._dragOffsetX = e.clientX - rect.left;
    this._dragOffsetY = e.clientY - rect.top;
    this._targetX = rect.left;
    this._targetY = rect.top;

    // Ensure top/left positioning
    this._el.style.bottom = '';
    this._el.style.right = '';
    this._el.style.left = rect.left + 'px';
    this._el.style.top = rect.top + 'px';

    var self = this;
    this._moveHandle = function (ev) { self._handleMouseMove(ev); };
    this._upHandle = function () { self._handleMouseUp(); };

    window.addEventListener('mousemove', this._moveHandle);
    window.addEventListener('mouseup', this._upHandle);
  };

  ClippyAgent.prototype._handleMouseMove = function (e) {
    e.preventDefault();
    var dx = e.clientX - this._dragStartX;
    var dy = e.clientY - this._dragStartY;

    if (!this._dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      this._dragging = true;
      this._el.classList.add('clippy-dragging');
      this.pause();
      this._balloon.hide(true);
      var self = this;
      this._dragUpdateLoop = setTimeout(function () { self._updateLocation(); }, 10);
    }

    this._targetX = e.clientX - this._dragOffsetX;
    this._targetY = e.clientY - this._dragOffsetY;
  };

  ClippyAgent.prototype._updateLocation = function () {
    this._el.style.top = this._targetY + 'px';
    this._el.style.left = this._targetX + 'px';
    var self = this;
    this._dragUpdateLoop = setTimeout(function () { self._updateLocation(); }, 10);
  };

  ClippyAgent.prototype._handleMouseUp = function () {
    if (this._dragUpdateLoop) {
      clearTimeout(this._dragUpdateLoop);
      this._dragUpdateLoop = null;
    }
    if (this._moveHandle) window.removeEventListener('mousemove', this._moveHandle);
    if (this._upHandle) window.removeEventListener('mouseup', this._upHandle);
    this._moveHandle = null;
    this._upHandle = null;

    if (this._dragging) {
      this._el.classList.remove('clippy-dragging');
      this._balloon.show();
      this._reposition();
      this.resume();
    } else {
      // Single click (no drag) — show the ask menu
      // Delay slightly so the doc click handler doesn't immediately close it
      var self = this;
      self._clickTimer = setTimeout(function () { self._clickTimer = null; self._showAskMenu(); }, 250);
    }
    this._dragging = false;
  };

  ClippyAgent.prototype._reposition = function () {
    if (!this._el || this._el.style.display === 'none') return;

    var rect = this._el.getBoundingClientRect();
    var top = rect.top;
    var left = rect.left;
    var m = 5;

    if (top - m < 0) top = m;
    else if (top + rect.height + m > window.innerHeight) top = window.innerHeight - rect.height - m;

    if (left - m < 0) left = m;
    else if (left + rect.width + m > window.innerWidth) left = window.innerWidth - rect.width - m;

    this._el.style.top = top + 'px';
    this._el.style.left = left + 'px';
    if (this._balloon) this._balloon.reposition();
  };

  // ─── Double-click: random animation ───

  ClippyAgent.prototype._handleDblClick = function (e) {
    e.preventDefault();
    if (this._dragging) return;
    if (this._clickTimer) {
      clearTimeout(this._clickTimer);
      this._clickTimer = null;
    }
    this._hideAskMenu();
    this._playRandomAnimation();
  };

  ClippyAgent.prototype._playRandomAnimation = function () {
    var anims = this._animator.animations().filter(function (a) {
      return a.indexOf('Idle') !== 0 && a !== 'Show' && a !== 'Hide';
    });
    if (!anims.length) return;
    this._play(pickRandom(anims));
  };

  // ─── Ask menu (click Clippy to interact with AI) ───

  var SMART_OPTIONS = {
    gmail:          [{ label: 'Help me write this', action: 'Help me write this email' }, { label: 'Summarize inbox', action: 'Summarize what I can see on this page' }],
    github:         [{ label: 'Explain this code', action: 'Explain the code on this page' }, { label: 'Review this PR', action: 'Review this pull request and give feedback' }],
    google_search:  [{ label: 'Better search?', action: 'Suggest a better search query for what I am looking for' }],
    youtube:        [{ label: 'Is this worth watching?', action: 'Based on the title and page, is this video worth watching?' }],
    stackoverflow:  [{ label: 'Explain the answer', action: 'Explain the top answer on this page in simple terms' }],
    amazon:         [{ label: 'Is this worth it?', action: 'Analyze this product — is it worth buying?' }],
    reddit:         [{ label: 'TL;DR this thread', action: 'Summarize this Reddit thread' }],
    linkedin:       [{ label: 'Draft a reply', action: 'Help me draft a professional reply to this post' }],
    google_docs:    [{ label: 'Improve my writing', action: 'Review and suggest improvements to the text on this page' }],
    twitter:        [{ label: 'Draft a reply', action: 'Help me draft a witty reply' }],
    slack:          [{ label: 'Summarize this channel', action: 'Summarize the conversation visible on this page' }],
    discord:        [{ label: 'Summarize chat', action: 'Summarize the conversation visible on this page' }],
    video_call:     [{ label: 'Talking points', action: 'Generate some talking points based on this meeting page' }]
  };

  ClippyAgent.prototype._showAskMenu = function () {
    this._hideAskMenu();
    this._hideContextMenu();

    var self = this;
    var menu = document.createElement('div');
    menu.className = 'clippy-ask-menu';

    // Smart options based on current site
    var category = getSiteCategory();
    var options = (category && SMART_OPTIONS[category]) || [];

    // Always-available options
    var allOptions = options.concat([
      { label: 'Summarize this page', action: 'Summarize this page concisely' },
      { label: 'What\'s interesting here?', action: 'What is interesting or notable about this page?' }
    ]);

    allOptions.forEach(function (opt) {
      var item = document.createElement('div');
      item.className = 'clippy-ask-item';
      item.textContent = opt.label;
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        self._hideAskMenu();
        self._askGateway(opt.action);
      });
      menu.appendChild(item);
    });

    // Custom input
    var inputRow = document.createElement('div');
    inputRow.className = 'clippy-ask-input-row';

    var input = document.createElement('input');
    input.className = 'clippy-ask-input';
    input.type = 'text';
    input.placeholder = 'Ask ' + this._agentName + ' anything...';

    input.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter' && input.value.trim()) {
        var q = input.value.trim();
        self._hideAskMenu();
        self._askGateway(q);
      }
      if (e.key === 'Escape') {
        self._hideAskMenu();
      }
    });

    // Prevent click from propagating to doc click handler
    input.addEventListener('click', function (e) { e.stopPropagation(); });

    var sendBtn = document.createElement('button');
    sendBtn.className = 'clippy-ask-send';
    sendBtn.textContent = '\u27A4'; // ➤ arrow
    sendBtn.title = 'Send';
    sendBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (input.value.trim()) {
        var q = input.value.trim();
        self._hideAskMenu();
        self._askGateway(q);
      }
    });

    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);
    menu.appendChild(inputRow);

    // Position above Clippy
    var agentRect = this._el.getBoundingClientRect();
    menu.style.left = agentRect.left + 'px';
    menu.style.bottom = (window.innerHeight - agentRect.top + 8) + 'px';

    document.body.appendChild(menu);

    // Adjust if off-screen
    var menuRect = menu.getBoundingClientRect();
    if (menuRect.left + menuRect.width > window.innerWidth) {
      menu.style.left = (window.innerWidth - menuRect.width - 10) + 'px';
    }
    if (menuRect.top < 0) {
      // Flip below agent
      menu.style.bottom = '';
      menu.style.top = (agentRect.bottom + 8) + 'px';
    }

    this._askMenu = menu;

    // Focus the input
    setTimeout(function () { input.focus(); }, 50);
  };

  ClippyAgent.prototype._hideAskMenu = function () {
    if (this._askMenu && this._askMenu.parentNode) {
      this._askMenu.parentNode.removeChild(this._askMenu);
    }
    this._askMenu = null;
  };

  ClippyAgent.prototype._askGateway = function (question) {
    var self = this;

    if (!this._aiEnabled || !this._gatewayUrl) {
      this._speak('AI features are not configured. Open the Clippy extension settings to set up your gateway.', false);
      return;
    }

    // Dismiss any existing balloon and reset queue for new request
    if (this._balloon) this._balloon.hide(true);
    if (this._queue) {
      this._queue.clear();
      this._queue._active = false;
    }

    // Show thinking dots animation
    if (this._animator && this._animator.hasAnimation('Thinking')) {
      this._play('Thinking');
    }

    // Animated dots in the balloon
    this._balloon._hidden = false;
    this._balloon.show();
    this._balloon._content.textContent = '.';
    this._balloon._balloon.classList.add('clippy-balloon-show');
    this._balloon.reposition();

    var dotCount = 1;
    var thinkingTimer = setInterval(function () {
      dotCount = (dotCount % 3) + 1;
      var dots = '';
      for (var i = 0; i < dotCount; i++) dots += '.';
      self._balloon._content.textContent = dots;
    }, 400);

    // Gather page context
    var sel = '';
    try { sel = window.getSelection().toString(); } catch (e) { /* ignore */ }

    var pageText = '';
    try {
      pageText = document.body.innerText.substring(0, 5000);
    } catch (e) { /* ignore */ }

    var parts = [];
    parts.push('Page: ' + document.title);
    parts.push('URL: ' + window.location.href);
    if (sel) parts.push('Selected text: "' + sel + '"');
    parts.push('Page content:\n' + pageText);
    parts.push('\nUser question: ' + question);

    var prompt = 'You are Clippy, the helpful (and slightly sarcastic) Microsoft Office assistant, now living in the user\'s browser. Answer concisely — your response appears in a small speech bubble (2-3 sentences max unless summarizing). Be helpful but witty.\n\n' + parts.join('\n');

    this._callGateway(prompt).then(function (answer) {
      clearInterval(thinkingTimer);
      self._balloon.hide(true);
      if (self._queue) { self._queue.clear(); self._queue._active = false; }
      self._speak(answer, true);
    }).catch(function () {
      clearInterval(thinkingTimer);
      self._balloon.hide(true);
      if (self._queue) { self._queue.clear(); self._queue._active = false; }
      self._speak('Hmm, I couldn\'t figure that out. Try again?', false);
    });
  };

  ClippyAgent.prototype._callGateway = function (message) {
    // Route through background service worker to avoid CSP/CORS blocks
    return new Promise(function (resolve, reject) {
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'gatewayChat',
          message: message
        }, function (response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response && response.ok) {
            resolve(response.text);
          } else {
            reject(new Error(response ? response.error : 'No response'));
          }
        });
      } else {
        reject(new Error('Extension messaging not available'));
      }
    });
  };

  // ─── Right-click: context menu ───

  ClippyAgent.prototype._handleContextMenu = function (e) {
    e.preventDefault();
    e.stopPropagation();
    this._showContextMenu(e.clientX, e.clientY);
  };

  ClippyAgent.prototype._showContextMenu = function (x, y) {
    this._hideContextMenu();

    var menu = document.createElement('div');
    menu.className = 'clippy-context-menu';

    var header = document.createElement('div');
    header.className = 'clippy-context-menu-header';
    header.textContent = 'Choose Your Agent';
    menu.appendChild(header);

    var self = this;
    AGENTS.forEach(function (agentName) {
      var item = document.createElement('div');
      item.className = 'clippy-context-menu-item';
      if (agentName === self._agentName) {
        item.classList.add('clippy-menu-active');
      }
      item.textContent = agentName;
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        self._switchAgent(agentName);
        self._hideContextMenu();
      });
      menu.appendChild(item);
    });

    var sep = document.createElement('div');
    sep.className = 'clippy-context-menu-separator';
    menu.appendChild(sep);

    var hideItem = document.createElement('div');
    hideItem.className = 'clippy-context-menu-item';
    hideItem.textContent = 'Hide Clippy';
    hideItem.addEventListener('click', function (e) {
      e.stopPropagation();
      self._hideContextMenu();
      self.destroy();
    });
    menu.appendChild(hideItem);

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    document.body.appendChild(menu);

    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = (y - rect.height) + 'px';
    }

    this._contextMenu = menu;
  };

  ClippyAgent.prototype._hideContextMenu = function () {
    if (this._contextMenu && this._contextMenu.parentNode) {
      this._contextMenu.parentNode.removeChild(this._contextMenu);
    }
    this._contextMenu = null;
  };

  ClippyAgent.prototype._handleDocClick = function () {
    this._hideContextMenu();
    this._hideAskMenu();
  };

  // ─── Agent switching ───

  ClippyAgent.prototype._switchAgent = function (name) {
    if (name === this._agentName) return;

    var self = this;
    this._agentName = name;

    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ agent: name });
    }

    this._stopQuipTimer();
    if (this._idleRestartTimer) { clearTimeout(this._idleRestartTimer); this._idleRestartTimer = null; }
    if (this._queue) this._queue.clear();
    if (this._animator) { this._animator.pause(); this._animator.destroy(); }
    if (this._balloon) this._balloon.hide(true);

    loadAgent(name).then(function (result) {
      self._animator = new Animator(self._el, result.spriteSrc, result.data);
      self._queue = new Queue(function () { self._onQueueEmpty(); });
      self._show();
    }).catch(function (err) {
      console.warn('[Clippy Extension] Failed to switch agent:', err);
    });
  };

  // ─── Quip scheduling ───

  ClippyAgent.prototype._scheduleQuip = function () {
    this._stopQuipTimer();
    var self = this;
    var delay = randomInt(this._quipMin, this._quipMax) * 1000;

    this._quipTimer = setTimeout(function () {
      self._showQuip();
    }, delay);
  };

  ClippyAgent.prototype._showQuip = function () {
    if (this._hidden || this._dragging) {
      this._scheduleQuip();
      return;
    }

    var now = Date.now();
    if (now - this._lastQuipTime < 15000) {
      this._scheduleQuip();
      return;
    }

    this._lastQuipTime = now;

    var speakAnims = this._animator.animations().filter(function (a) {
      return a.indexOf('Greet') >= 0 || a.indexOf('GetAttention') >= 0 ||
             a.indexOf('Explain') >= 0 || a.indexOf('Congratulate') >= 0 ||
             a.indexOf('Wave') >= 0 || a.indexOf('Alert') >= 0;
    });

    if (speakAnims.length > 0) {
      this._play(pickRandom(speakAnims));
    }

    // Try AI smart quip if enabled and cooldown passed
    var self = this;
    if (this._aiEnabled && this._gatewayUrl && (now - this._lastAiQuipTime > this._aiQuipCooldown)) {
      this._lastAiQuipTime = now;
      var pageSnippet = '';
      try { pageSnippet = document.body.innerText.substring(0, 1000); } catch (e) { /* */ }
      var prompt = 'You are Clippy, the classic Microsoft Office assistant. Generate ONE short, witty, context-aware quip (1-2 sentences max) about what the user is doing on this page. Be funny and slightly sarcastic.\n\nPage: ' + document.title + '\nURL: ' + window.location.href + '\nContent: ' + pageSnippet;
      this._callGateway(prompt).then(function (quip) {
        self._speak(quip, false);
      }).catch(function () {
        // Fall back to canned quip
        self._speak(getQuip(), false);
      });
    } else {
      this._speak(getQuip(), false);
    }

    this._scheduleQuip();
  };

  ClippyAgent.prototype._stopQuipTimer = function () {
    if (this._quipTimer) {
      clearTimeout(this._quipTimer);
      this._quipTimer = null;
    }
  };

  // ─── Public speak (from popup/background messages) ───

  ClippyAgent.prototype.speak = function (text) {
    if (this._hidden) return;
    this._speak(text, false);
  };

  // ─── Destroy ───

  ClippyAgent.prototype.destroy = function () {
    this._hidden = true;
    this._stopQuipTimer();
    if (this._idleRestartTimer) { clearTimeout(this._idleRestartTimer); this._idleRestartTimer = null; }
    if (this._dragUpdateLoop) { clearTimeout(this._dragUpdateLoop); this._dragUpdateLoop = null; }
    if (this._queue) this._queue.clear();
    this._detachEvents();
    this._hideContextMenu();
    this._hideAskMenu();

    if (this._animator) { this._animator.pause(); this._animator.destroy(); }
    if (this._balloon) this._balloon.destroy();
    if (this._el && this._el.parentNode) {
      this._el.parentNode.removeChild(this._el);
    }

    window.__clippyExtensionLoaded = false;
  };

  // ─── Settings change listener ───

  ClippyAgent.prototype._listenForChanges = function () {
    var self = this;

    if (chrome && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'sync') return;

        if (changes.enabled) {
          if (changes.enabled.newValue === false) {
            self.destroy();
          } else if (changes.enabled.newValue === true && self._hidden) {
            window.__clippyExtensionLoaded = true;
            self._enabled = true;
            self._createAgent();
          }
        }

        if (changes.agent && changes.agent.newValue !== self._agentName) {
          self._switchAgent(changes.agent.newValue);
        }

        if (changes.quipMin) {
          self._quipMin = changes.quipMin.newValue;
        }
        if (changes.quipMax) {
          self._quipMax = changes.quipMax.newValue;
        }
        if (changes.aiEnabled !== undefined) {
          self._aiEnabled = changes.aiEnabled.newValue;
        }
        if (changes.gatewayUrl !== undefined) {
          self._gatewayUrl = changes.gatewayUrl.newValue;
        }
        if (changes.gatewayToken !== undefined) {
          self._gatewayToken = changes.gatewayToken.newValue;
        }
      });
    }
  };

  // ─── Message listener (from popup/background) ───

  function setupMessageListener(agent) {
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(function (msg) {
        if (msg.type === 'speak' && msg.text) {
          agent.speak(msg.text);
        }
        if (msg.type === 'animate') {
          agent._playRandomAnimation();
        }
        // "Ask Clippy about this" from right-click context menu
        if (msg.type === 'askAboutSelection' && msg.text) {
          agent._askGateway('Explain or summarize this: ' + msg.text);
        }
      });
    }
  }

  // ─── Bootstrap ───

  var agent = new ClippyAgent();
  agent._listenForChanges();
  setupMessageListener(agent);

  agent.init().catch(function (err) {
    console.warn('[Clippy Extension] Init error:', err);
  });

})();
