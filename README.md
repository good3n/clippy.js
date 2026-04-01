# 📎 Clippy.js

**Add Clippy or his friends to any website for instant nostalgia.**

Modernized fork of the original [ClippyJS](https://github.com/clippyjs/clippy.js) — zero dependencies, TypeScript, ES modules.

[![npm version](https://img.shields.io/npm/v/clippy.js.svg)](https://www.npmjs.com/package/clippy.js)
[![license](https://img.shields.io/npm/l/clippy.js.svg)](./MIT-LICENSE.txt)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)

---

## What's New in v2

- 🚀 **Zero dependencies** — no more jQuery
- 📦 **ES Modules + CommonJS** — works everywhere
- 🔷 **Full TypeScript** — types included out of the box
- 🎯 **Tree-shakeable** — only bundle what you use
- 🪶 **Tiny footprint** — modernized vanilla JS under the hood
- 🖱️ **Draggable** — click and drag your agent around
- 🔊 **Sound support** — optional agent sounds

## Install

```bash
npm install clippy.js
```

Or via CDN:

```html
<script type="module">
  import { load } from 'https://unpkg.com/clippy.js@2/dist/index.js';

  const agent = await load('Clippy');
  agent.show();
  agent.speak('Hello! I see you\'re browsing the web. Need help?');
</script>
```

## Quick Start

```typescript
import { load } from 'clippy.js';

// Load an agent
const agent = await load('Clippy');

// Show the agent
agent.show();

// Make it talk
agent.speak('It looks like you\'re writing a letter. Would you like help?');

// Play an animation
agent.play('Searching');

// Move to a position
agent.moveTo(200, 300);

// Play a random animation
agent.animate();
```

## API

### `load(name, config?)`

Load an agent. Returns a `Promise<Agent>`.

```typescript
const agent = await load('Clippy');

// With config
const agent = await load('Merlin', {
  basePath: '/my-custom-agents',  // Custom agent asset path
  sounds: false,                   // Disable sounds
});
```

### Agent Methods

| Method | Description |
|--------|-------------|
| `agent.show(fast?)` | Show the agent. Pass `true` to skip animation. |
| `agent.hide(fast?, callback?)` | Hide the agent. |
| `agent.speak(text, hold?)` | Show a speech bubble. Pass `hold: true` to keep it visible. |
| `agent.closeBalloon()` | Close the speech bubble. |
| `agent.play(animation, timeout?, cb?)` | Play a specific animation. |
| `agent.animate()` | Play a random animation. |
| `agent.moveTo(x, y, duration?)` | Move agent to coordinates. |
| `agent.gestureAt(x, y)` | Gesture toward a point. |
| `agent.stopCurrent()` | Stop the current animation. |
| `agent.stop()` | Stop all animations and clear the queue. |
| `agent.animations()` | Get list of available animation names. |
| `agent.hasAnimation(name)` | Check if an animation exists. |
| `agent.pause()` | Pause all animations. |
| `agent.resume()` | Resume animations. |
| `agent.delay(ms?)` | Add a delay to the action queue. |
| `agent.destroy()` | Remove agent from the DOM entirely. |

### Action Queue

All actions are queued and executed in order:

```typescript
agent.speak('Let me search for that...');
agent.play('Searching');
agent.speak('Found it!');
agent.play('Congratulate');
```

## Available Agents

| Agent | Preview |
|-------|---------|
| **Clippy** | The classic paperclip |
| **Bonzi** | The purple gorilla |
| **F1** | The robot |
| **Genie** | The lamp genie |
| **Genius** | The Einstein-like character |
| **Links** | The cat |
| **Merlin** | The wizard |
| **Peedy** | The parrot |
| **Rocky** | The dog |
| **Rover** | The search dog |

```typescript
// Load any agent
const clippy = await load('Clippy');
const merlin = await load('Merlin');
const bonzi = await load('Bonzi');
```

## Custom Agent Path

By default, agent assets are loaded from unpkg CDN. You can self-host them:

```typescript
const agent = await load('Clippy', {
  basePath: '/assets/agents'
});
```

Copy the `agents/` directory to your public assets folder.

## TypeScript

Full type definitions are included:

```typescript
import { load, type Agent, type AgentName } from 'clippy.js';

const agentName: AgentName = 'Clippy';
const agent: Agent = await load(agentName);
```

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). No IE support — it's 2026.

## Roadmap

- 🧩 **Chrome Extension** — Clippy for your browser, everywhere you go
- 🤖 **MCP Integration** — Connect Clippy to Claude via Model Context Protocol for AI-powered assistance
- 📱 **React/Vue/Svelte components** — Framework wrappers

## Credits

- Original [ClippyJS](https://github.com/clippyjs/clippy.js) by [Smore](https://www.smore.com/clippy-js)
- [Cinnamon Software](http://www.cinnamonsoftware.com/) for [Double Agent](http://doubleagent.sourceforge.net/) (used to extract the original sprites)
- Microsoft, for creating Clippy 📎

## License

[MIT](./MIT-LICENSE.txt)
