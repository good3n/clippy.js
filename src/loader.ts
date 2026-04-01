import type { AgentData, AgentName, SoundMap, ClippyConfig } from './types.js';
import { Agent } from './agent.js';

const DEFAULT_BASE_PATH = 'https://unpkg.com/clippy-js@2/agents';

const mapCache = new Map<string, Promise<void>>();
const agentCache = new Map<string, Promise<AgentData>>();
const soundCache = new Map<string, Promise<SoundMap>>();

/**
 * Load a Clippy agent by name.
 *
 * @example
 * ```ts
 * import { load } from 'clippy.js';
 *
 * const agent = await load('Clippy');
 * agent.show();
 * agent.speak('Hello!');
 * ```
 */
export async function load(name: AgentName, config?: ClippyConfig): Promise<Agent> {
  const basePath = config?.basePath ?? DEFAULT_BASE_PATH;
  const path = `${basePath}/${name}`;
  const enableSounds = config?.sounds !== false;

  const [, data, sounds] = await Promise.all([
    loadMap(path),
    loadAgent(name, path),
    enableSounds ? loadSounds(name, path) : Promise.resolve({} as SoundMap),
  ]);

  return new Agent(path, data, sounds);
}

function loadMap(path: string): Promise<void> {
  if (mapCache.has(path)) return mapCache.get(path)!;

  const promise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load sprite map: ${path}/map.png`));
    img.src = `${path}/map.png`;
  });

  mapCache.set(path, promise);
  return promise;
}

function loadAgent(name: string, path: string): Promise<AgentData> {
  if (agentCache.has(name)) return agentCache.get(name)!;

  const promise = new Promise<AgentData>((resolve, reject) => {
    // The agent.js files use `clippy.ready(name, data)` to register.
    // We need to intercept that call.
    const w = window as unknown as Record<string, unknown>;

    // Ensure the clippy namespace exists for legacy agent files
    if (!w.clippy) w.clippy = {};
    const ns = w.clippy as Record<string, unknown>;

    // Store the original ready function if it exists
    const originalReady = ns.ready as ((...args: unknown[]) => void) | undefined;

    ns.ready = (agentName: string, data: AgentData) => {
      if (agentName === name) {
        resolve(data);
        // Restore original
        if (originalReady) {
          ns.ready = originalReady;
        } else {
          delete ns.ready;
        }
      } else if (originalReady) {
        originalReady(agentName, data);
      }
    };

    loadScript(`${path}/agent.js`).catch(reject);
  });

  agentCache.set(name, promise);
  return promise;
}

function loadSounds(name: string, path: string): Promise<SoundMap> {
  if (soundCache.has(name)) return soundCache.get(name)!;

  const promise = new Promise<SoundMap>((resolve, reject) => {
    const audio = document.createElement('audio');
    const canPlayMp3 = !!audio.canPlayType && audio.canPlayType('audio/mpeg') !== '';
    const canPlayOgg = !!audio.canPlayType && audio.canPlayType('audio/ogg; codecs="vorbis"') !== '';

    if (!canPlayMp3 && !canPlayOgg) {
      resolve({});
      return;
    }

    const w = window as unknown as Record<string, unknown>;
    if (!w.clippy) w.clippy = {};
    const ns = w.clippy as Record<string, unknown>;

    const originalSoundsReady = ns.soundsReady as ((...args: unknown[]) => void) | undefined;

    ns.soundsReady = (agentName: string, data: SoundMap) => {
      if (agentName === name) {
        resolve(data);
        if (originalSoundsReady) {
          ns.soundsReady = originalSoundsReady;
        } else {
          delete ns.soundsReady;
        }
      } else if (originalSoundsReady) {
        originalSoundsReady(agentName, data);
      }
    };

    const src = `${path}/${canPlayMp3 ? 'sounds-mp3.js' : 'sounds-ogg.js'}`;
    loadScript(src).catch(reject);
  });

  soundCache.set(name, promise);
  return promise;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}
