import type { AgentData, AgentName, SoundMap, LoadOptions } from './types.js';
import { Agent } from './agent.js';

const DEFAULT_BASE_PATH = 'https://s3.amazonaws.com/clippy.js/Agents/';

const mapCache = new Map<string, Promise<void>>();
const agentCache = new Map<string, Promise<AgentData>>();
const soundsCache = new Map<string, Promise<SoundMap>>();

function loadMap(path: string): Promise<void> {
  const cached = mapCache.get(path);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load map: ${path}/map.png`));
    img.src = path + '/map.png';
  });

  mapCache.set(path, promise);
  return promise;
}

function loadAgent(name: string, path: string): Promise<AgentData> {
  const cached = agentCache.get(name);
  if (cached) return cached;

  const promise = new Promise<AgentData>((resolve, reject) => {
    // Register the global callback the agent script will call
    const w = window as unknown as Record<string, unknown>;
    if (!w.clippy) w.clippy = {};
    const clippy = w.clippy as Record<string, unknown>;

    clippy.ready = (agentName: string, data: AgentData) => {
      if (agentName === name) resolve(data);
    };

    const script = document.createElement('script');
    script.src = path + '/agent.js';
    script.async = true;
    script.onerror = () => reject(new Error(`Failed to load agent: ${name}`));
    document.head.appendChild(script);
  });

  agentCache.set(name, promise);
  return promise;
}

function loadSounds(name: string, path: string): Promise<SoundMap> {
  const cached = soundsCache.get(name);
  if (cached) return cached;

  const promise = new Promise<SoundMap>((resolve, reject) => {
    const audio = document.createElement('audio');
    const canPlayMp3 = !!audio.canPlayType && audio.canPlayType('audio/mpeg') !== '';
    const canPlayOgg =
      !!audio.canPlayType &&
      audio.canPlayType('audio/ogg; codecs="vorbis"') !== '';

    if (!canPlayMp3 && !canPlayOgg) {
      resolve({});
      return;
    }

    const w = window as unknown as Record<string, unknown>;
    if (!w.clippy) w.clippy = {};
    const clippy = w.clippy as Record<string, unknown>;

    clippy.soundsReady = (agentName: string, data: SoundMap) => {
      if (agentName === name) resolve(data);
    };

    const src = path + (canPlayMp3 ? '/sounds-mp3.js' : '/sounds-ogg.js');
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onerror = () => reject(new Error(`Failed to load sounds for: ${name}`));
    document.head.appendChild(script);
  });

  soundsCache.set(name, promise);
  return promise;
}

export async function load(
  name: AgentName | string,
  options?: LoadOptions
): Promise<Agent> {
  const basePath = options?.basePath ?? DEFAULT_BASE_PATH;
  const path = basePath + name;

  const [, data, sounds] = await Promise.all([
    loadMap(path),
    loadAgent(name, path),
    loadSounds(name, path),
  ]);

  return new Agent(path, data, sounds);
}
