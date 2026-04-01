/* ==========================================================================
   Clippy Browser Companion — Content Script
   No ES modules. Everything self-contained in an IIFE.
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

    if (host.includes('mail.google') || host.includes('outlook') || host.includes('yahoo') && path.includes('mail'))
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
      // 70% chance of site-specific quip, 30% generic
      if (Math.random() < 0.7) {
        return pickRandom(SITE_QUIPS[category]);
      }
    }
    return pickRandom(GENERIC_QUIPS);
  }

  // ---------------------------------------------------------------------------
  // Agent Loader (adapted from src/loader.ts — no ES modules)
  // ---------------------------------------------------------------------------

  // The agent.js files use JSONP style: clippy.ready(name, data)
  // We set up a global interceptor.
  if (!window.clippy) {
    window.clippy = {};
  }

  var agentDataCache = {};
  var spriteCache = {};

  function loadAgentData(name) {
    return new Promise(function (resolve, reject) {
      if (agentDataCache[name]) {
        resolve(agentDataCache[name]);
        return;
      }

      var oldReady = window.clippy.ready;
      window.clippy.ready = function (agentName, data) {
        window.clippy.ready = oldReady;
        agentDataCache[agentName] = data;
        resolve(data);
      };

      var script = document.createElement('script');
      script.src = CDN_BASE + '/' + name + '/agent.js';
      script.onerror = function () {
        window.clippy.ready = oldReady;
        reject(new Error('Failed to load agent data for ' + name));
      };
      document.head.appendChild(script);
    });
  }

  function preloadSprite(name) {
    return new Promise(function (resolve) {
      if (spriteCache[name]) {
        resolve(spriteCache[name]);
        return;
      }
      var img = new Image();
      img.onload = function () {
        spriteCache[name] = img;
        resolve(img);
      };
      img.onerror = function () {
        resolve(null); // Non-fatal
      };
      img.src = CDN_BASE + '/' + name + '/map.png';
    });
  }

  function loadAgent(name) {
    return Promise.all([loadAgentData(name), preloadSprite(name)]).then(function (results) {
      return { data: results[0], spriteSrc: CDN_BASE + '/' + name + '/map.png' };
    });
  }

  // ---------------------------------------------------------------------------
  // Animator (adapted from src/animator.ts)
  // ---------------------------------------------------------------------------

  function Animator(el, spriteSrc, data) {
    this._el = el;
    this._data = data;
    this._spriteSrc = spriteSrc;
    this._currentFrameIndex = 0;
    this._currentFrame = null;
    this._currentAnimation = null;
    this._currentAnimationName = '';
    this._overlays = [];
    this._exiting = false;
    this._started = false;
    this._stepTimer = null;
    this._endCallback = null;

    this._setup();
  }

  Animator.prototype._setup = function () {
    var frameW = this._data.framesize[0];
    var frameH = this._data.framesize[1];

    this._el.innerHTML = '';
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

  Animator.prototype.play = function (animationName, callback) {
    this._exiting = false;
    if (!this._data.animations[animationName]) {
      if (callback) callback();
      return;
    }

    this._currentAnimation = this._data.animations[animationName];
    this._currentAnimationName = animationName;
    this._currentFrameIndex = 0;
    this._currentFrame = this._currentAnimation.frames[0];
    this._started = true;
    this._endCallback = callback || null;

    this._step();
  };

  Animator.prototype.stop = function () {
    this._started = false;
    if (this._stepTimer) {
      clearTimeout(this._stepTimer);
      this._stepTimer = null;
    }
  };

  Animator.prototype.exitAnimation = function () {
    this._exiting = true;
  };

  Animator.prototype._step = function () {
    if (!this._started) return;

    var self = this;
    if (this._stepTimer) {
      clearTimeout(this._stepTimer);
      this._stepTimer = null;
    }

    this._draw();

    var nextFrame = this._getNextFrame();
    if (nextFrame === undefined) {
      // Animation ended
      this._started = false;
      if (this._endCallback) this._endCallback();
      return;
    }

    this._currentFrameIndex = nextFrame;
    this._currentFrame = this._currentAnimation.frames[nextFrame];

    var duration = this._currentFrame.duration || 100;
    this._stepTimer = setTimeout(function () {
      self._step();
    }, duration);
  };

  Animator.prototype._draw = function () {
    if (!this._currentFrame) return;
    var images = this._currentFrame.images || [];
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

  Animator.prototype._getNextFrame = function () {
    if (!this._currentAnimation || !this._currentFrame) return undefined;

    var totalFrames = this._currentAnimation.frames.length;

    // If exiting and there's an exit branch, follow it
    if (this._exiting && this._currentFrame.exitBranch !== undefined) {
      return this._currentFrame.exitBranch;
    }

    // Probabilistic branching
    var branching = this._currentFrame.branching;
    if (branching && branching.branches) {
      var rnd = Math.random() * 100;
      for (var i = 0; i < branching.branches.length; i++) {
        var branch = branching.branches[i];
        if (rnd <= branch.weight) {
          return branch.frameIndex;
        }
        rnd -= branch.weight;
      }
    }

    // Default: next frame
    var next = this._currentFrameIndex + 1;
    if (next >= totalFrames) {
      // If useExitBranching, stay on last frame until exit
      if (this._currentAnimation.useExitBranching) {
        if (this._exiting) return undefined;
        return this._currentFrameIndex; // loop on last frame
      }
      return undefined; // done
    }

    return next;
  };

  // ---------------------------------------------------------------------------
  // Balloon (adapted from src/balloon.ts)
  // ---------------------------------------------------------------------------

  function Balloon(agentEl) {
    this._agentEl = agentEl;
    this._balloon = null;
    this._content = null;
    this._tip = null;
    this._hidden = true;
    this._hideTimer = null;
    this._wordTimer = null;

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

  Balloon.prototype.speak = function (text, hold) {
    this._hidden = false;
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
    if (this._wordTimer) {
      clearTimeout(this._wordTimer);
      this._wordTimer = null;
    }

    // Measure needed size by setting full text first
    this._content.textContent = text;
    this._balloon.style.display = 'block';
    this._balloon.classList.remove('clippy-balloon-show');

    // Get measured dimensions
    var rect = this._balloon.getBoundingClientRect();
    this._balloon.style.width = rect.width + 'px';
    this._balloon.style.height = rect.height + 'px';

    this._content.textContent = '';
    this.reposition();

    // Show with fade
    this._balloon.classList.add('clippy-balloon-show');

    // Type words one by one
    this._sayWords(text, hold);
  };

  Balloon.prototype._sayWords = function (text, hold) {
    var words = text.split(/\s+/);
    var self = this;
    var idx = 1;

    function next() {
      if (idx > words.length) {
        // Done typing
        if (!hold) {
          self._hideTimer = setTimeout(function () {
            self.hide(false);
          }, CLOSE_BALLOON_DELAY);
        }
        return;
      }
      self._content.textContent = words.slice(0, idx).join(' ');
      idx++;
      self._wordTimer = setTimeout(next, WORD_SPEAK_TIME);
    }

    next();
  };

  Balloon.prototype.hide = function (fast) {
    if (this._wordTimer) {
      clearTimeout(this._wordTimer);
      this._wordTimer = null;
    }
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }

    this._hidden = true;
    this._balloon.classList.remove('clippy-balloon-show');

    var self = this;
    if (fast) {
      self._balloon.style.display = 'none';
      self._balloon.style.width = '';
      self._balloon.style.height = '';
    } else {
      setTimeout(function () {
        if (self._hidden) {
          self._balloon.style.display = 'none';
          self._balloon.style.width = '';
          self._balloon.style.height = '';
        }
      }, 300);
    }
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

    // Remove all position classes
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
      // bottom-right
      top = agentRect.top + agentRect.height + BALLOON_MARGIN;
      left = agentRect.left;
    }

    this._balloon.style.top = top + 'px';
    this._balloon.style.left = left + 'px';
  };

  Balloon.prototype._isOut = function () {
    var rect = this._balloon.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    return (rect.top < 0 || rect.left < 0 || rect.bottom > vh || rect.right > vw);
  };

  Balloon.prototype.destroy = function () {
    if (this._hideTimer) clearTimeout(this._hideTimer);
    if (this._wordTimer) clearTimeout(this._wordTimer);
    if (this._balloon && this._balloon.parentNode) {
      this._balloon.parentNode.removeChild(this._balloon);
    }
  };

  // ---------------------------------------------------------------------------
  // ClippyAgent — Main controller
  // ---------------------------------------------------------------------------

  function ClippyAgent() {
    this._el = null;
    this._animator = null;
    this._balloon = null;
    this._agentName = 'Clippy';
    this._enabled = true;
    this._quipMin = DEFAULT_QUIP_MIN;
    this._quipMax = DEFAULT_QUIP_MAX;
    this._quipTimer = null;
    this._idleTimer = null;
    this._isDragging = false;
    this._dragOffsetX = 0;
    this._dragOffsetY = 0;
    this._contextMenu = null;
    this._isAnimating = false;
    this._lastQuipTime = 0;
    this._shown = false;

    // Bind event handlers
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onDblClick = this._handleDblClick.bind(this);
    this._onContextMenu = this._handleContextMenu.bind(this);
    this._onDocClick = this._handleDocClick.bind(this);
  }

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
          quipMax: DEFAULT_QUIP_MAX
        }, function (items) {
          self._agentName = items.agent;
          self._enabled = items.enabled;
          self._quipMin = items.quipMin;
          self._quipMax = items.quipMax;
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  ClippyAgent.prototype._createAgent = function () {
    var self = this;

    // Create container element
    this._el = document.createElement('div');
    this._el.className = 'clippy';
    this._el.style.bottom = '20px';
    this._el.style.right = '20px';
    this._el.style.left = '';
    this._el.style.top = '';
    document.body.appendChild(this._el);

    // Create balloon
    this._balloon = new Balloon(this._el);

    // Load and start
    return loadAgent(this._agentName).then(function (result) {
      self._animator = new Animator(self._el, result.spriteSrc, result.data);
      self._attachEvents();
      self._show();
    }).catch(function (err) {
      console.warn('[Clippy Extension] Failed to load agent:', err);
    });
  };

  ClippyAgent.prototype._show = function () {
    this._shown = true;

    // Play entrance animation or just show
    if (this._animator.hasAnimation('Show')) {
      var self = this;
      this._isAnimating = true;
      this._animator.play('Show', function () {
        self._isAnimating = false;
        self._startIdleLoop();
        self._scheduleQuip();
      });
    } else {
      // Just draw first frame of an idle animation
      if (this._animator.hasAnimation('IdleAtom')) {
        this._animator.play('IdleAtom', null);
      }
      this._startIdleLoop();
      this._scheduleQuip();
    }
  };

  ClippyAgent.prototype._attachEvents = function () {
    this._el.addEventListener('mousedown', this._onMouseDown);
    this._el.addEventListener('dblclick', this._onDblClick);
    this._el.addEventListener('contextmenu', this._onContextMenu);
    document.addEventListener('click', this._onDocClick);
  };

  ClippyAgent.prototype._detachEvents = function () {
    if (this._el) {
      this._el.removeEventListener('mousedown', this._onMouseDown);
      this._el.removeEventListener('dblclick', this._onDblClick);
      this._el.removeEventListener('contextmenu', this._onContextMenu);
    }
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('click', this._onDocClick);
  };

  // ---------------------------------------------------------------------------
  // Drag handling
  // ---------------------------------------------------------------------------

  ClippyAgent.prototype._handleMouseDown = function (e) {
    if (e.button !== 0) return; // left click only
    e.preventDefault();

    var rect = this._el.getBoundingClientRect();
    this._dragOffsetX = e.clientX - rect.left;
    this._dragOffsetY = e.clientY - rect.top;
    this._isDragging = false;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
  };

  ClippyAgent.prototype._handleMouseMove = function (e) {
    var dx = e.clientX - this._dragStartX;
    var dy = e.clientY - this._dragStartY;

    // Start dragging after 5px threshold
    if (!this._isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      this._isDragging = true;
      this._el.classList.add('clippy-dragging');
      this._balloon.hide(true);

      // Switch from bottom/right to top/left positioning for drag
      var rect = this._el.getBoundingClientRect();
      this._el.style.bottom = '';
      this._el.style.right = '';
      this._el.style.left = rect.left + 'px';
      this._el.style.top = rect.top + 'px';
    }

    if (this._isDragging) {
      var x = e.clientX - this._dragOffsetX;
      var y = e.clientY - this._dragOffsetY;

      // Clamp to viewport
      var w = this._el.offsetWidth;
      var h = this._el.offsetHeight;
      x = Math.max(0, Math.min(window.innerWidth - w, x));
      y = Math.max(0, Math.min(window.innerHeight - h, y));

      this._el.style.left = x + 'px';
      this._el.style.top = y + 'px';
    }
  };

  ClippyAgent.prototype._handleMouseUp = function () {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);

    if (this._isDragging) {
      this._isDragging = false;
      this._el.classList.remove('clippy-dragging');
    }
  };

  // ---------------------------------------------------------------------------
  // Double-click: random animation
  // ---------------------------------------------------------------------------

  ClippyAgent.prototype._handleDblClick = function (e) {
    e.preventDefault();
    if (this._isDragging) return;
    this._playRandomAnimation();
  };

  ClippyAgent.prototype._playRandomAnimation = function () {
    if (this._isAnimating) return;

    var anims = this._animator.animations().filter(function (a) {
      return a !== 'Show' && a !== 'Hide';
    });

    if (anims.length === 0) return;

    var anim = pickRandom(anims);
    var self = this;
    this._isAnimating = true;
    this._stopIdleLoop();

    this._animator.play(anim, function () {
      self._isAnimating = false;
      self._startIdleLoop();
    });
  };

  // ---------------------------------------------------------------------------
  // Right-click: agent context menu
  // ---------------------------------------------------------------------------

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

    // Add separator and hide option
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

    // Position the menu
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    document.body.appendChild(menu);

    // Adjust if off-screen
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
  };

  // ---------------------------------------------------------------------------
  // Agent switching
  // ---------------------------------------------------------------------------

  ClippyAgent.prototype._switchAgent = function (name) {
    if (name === this._agentName) return;

    var self = this;
    this._agentName = name;

    // Save to storage
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ agent: name });
    }

    // Destroy and recreate
    this._stopQuipTimer();
    this._stopIdleLoop();
    if (this._animator) this._animator.stop();
    if (this._balloon) this._balloon.hide(true);

    // Clear the element but keep it in the DOM
    var oldRect = this._el.getBoundingClientRect();

    loadAgent(name).then(function (result) {
      self._animator = new Animator(self._el, result.spriteSrc, result.data);
      self._show();
    }).catch(function (err) {
      console.warn('[Clippy Extension] Failed to switch agent:', err);
    });
  };

  // ---------------------------------------------------------------------------
  // Idle animations
  // ---------------------------------------------------------------------------

  ClippyAgent.prototype._startIdleLoop = function () {
    this._stopIdleLoop();
    var self = this;

    function scheduleIdle() {
      self._idleTimer = setTimeout(function () {
        if (self._isAnimating || self._isDragging) {
          scheduleIdle();
          return;
        }

        var idleAnims = self._animator.animations().filter(function (a) {
          return a.indexOf('Idle') === 0;
        });

        if (idleAnims.length === 0) {
          scheduleIdle();
          return;
        }

        var anim = pickRandom(idleAnims);
        self._isAnimating = true;
        self._animator.play(anim, function () {
          self._isAnimating = false;
          scheduleIdle();
        });
      }, randomInt(3000, 8000));
    }

    scheduleIdle();
  };

  ClippyAgent.prototype._stopIdleLoop = function () {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Quip scheduling
  // ---------------------------------------------------------------------------

  ClippyAgent.prototype._scheduleQuip = function () {
    this._stopQuipTimer();
    var self = this;
    var delay = randomInt(this._quipMin, this._quipMax) * 1000;

    this._quipTimer = setTimeout(function () {
      self._showQuip();
    }, delay);
  };

  ClippyAgent.prototype._showQuip = function () {
    if (!this._shown || this._isDragging) {
      this._scheduleQuip();
      return;
    }

    // Cooldown: don't show quip if one was shown recently
    var now = Date.now();
    if (now - this._lastQuipTime < 15000) {
      this._scheduleQuip();
      return;
    }

    this._lastQuipTime = now;
    var quip = getQuip();
    this._balloon.speak(quip, false);

    // Play a speaking/greeting animation if available
    if (!this._isAnimating) {
      var speakAnims = this._animator.animations().filter(function (a) {
        return a.indexOf('Greet') >= 0 || a.indexOf('GetAttention') >= 0 ||
               a.indexOf('Explain') >= 0 || a.indexOf('Congratulate') >= 0 ||
               a.indexOf('Wave') >= 0 || a.indexOf('Alert') >= 0;
      });

      if (speakAnims.length > 0) {
        var anim = pickRandom(speakAnims);
        this._stopIdleLoop();
        this._isAnimating = true;
        var self = this;
        this._animator.play(anim, function () {
          self._isAnimating = false;
          self._startIdleLoop();
        });
      }
    }

    this._scheduleQuip();
  };

  ClippyAgent.prototype._stopQuipTimer = function () {
    if (this._quipTimer) {
      clearTimeout(this._quipTimer);
      this._quipTimer = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Speak (public, used by popup/background messages)
  // ---------------------------------------------------------------------------

  ClippyAgent.prototype.speak = function (text) {
    if (!this._shown) return;
    this._balloon.speak(text, false);
  };

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  ClippyAgent.prototype.destroy = function () {
    this._shown = false;
    this._stopQuipTimer();
    this._stopIdleLoop();
    this._detachEvents();
    this._hideContextMenu();

    if (this._animator) this._animator.stop();
    if (this._balloon) this._balloon.destroy();
    if (this._el && this._el.parentNode) {
      this._el.parentNode.removeChild(this._el);
    }

    window.__clippyExtensionLoaded = false;
  };

  // ---------------------------------------------------------------------------
  // Settings change listener
  // ---------------------------------------------------------------------------

  ClippyAgent.prototype._listenForChanges = function () {
    var self = this;

    if (chrome && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'sync') return;

        if (changes.enabled) {
          if (changes.enabled.newValue === false) {
            self.destroy();
          } else if (changes.enabled.newValue === true && !self._shown) {
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
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Message listener (from popup/background)
  // ---------------------------------------------------------------------------

  function setupMessageListener(agent) {
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(function (msg) {
        if (msg.type === 'speak' && msg.text) {
          agent.speak(msg.text);
        }
        if (msg.type === 'animate') {
          agent._playRandomAnimation();
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------

  var agent = new ClippyAgent();
  agent._listenForChanges();
  setupMessageListener(agent);

  agent.init().catch(function (err) {
    console.warn('[Clippy Extension] Init error:', err);
  });

})();
