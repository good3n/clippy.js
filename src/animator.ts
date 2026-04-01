import type { AgentData, AnimationData, FrameData, SoundMap, StateChangeCallback, AnimatorState } from './types.js';

export const AnimatorStates = {
  WAITING: 'WAITING' as AnimatorState,
  EXITED: 'EXITED' as AnimatorState,
};

export class Animator {
  private _el: HTMLElement;
  private _data: AgentData;
  private _path: string;
  private _currentFrameIndex = 0;
  private _currentFrame: FrameData | undefined;
  private _exiting = false;
  private _currentAnimation: AnimationData | undefined;
  private _endCallback: StateChangeCallback | undefined;
  private _sounds: Record<string, HTMLAudioElement> = {};
  private _overlays: HTMLElement[];
  private _loop: ReturnType<typeof setTimeout> | null = null;

  currentAnimationName: string | undefined;

  constructor(el: HTMLElement, path: string, data: AgentData, sounds: SoundMap) {
    this._el = el;
    this._data = data;
    this._path = path;
    this._overlays = [this._el];
    this._preloadSounds(sounds);
    this._setupElement(this._el);

    let curr = this._el;
    for (let i = 1; i < this._data.overlayCount; i++) {
      const inner = document.createElement('div');
      this._setupElement(inner);
      curr.appendChild(inner);
      this._overlays.push(inner);
      curr = inner;
    }
  }

  private _setupElement(el: HTMLElement): HTMLElement {
    const frameSize = this._data.framesize;
    el.style.display = 'none';
    el.style.width = frameSize[0] + 'px';
    el.style.height = frameSize[1] + 'px';
    el.style.background = `url('${this._path}/map.png') no-repeat`;
    return el;
  }

  animations(): string[] {
    return Object.keys(this._data.animations);
  }

  private _preloadSounds(sounds: SoundMap): void {
    for (const snd of this._data.sounds) {
      const uri = sounds[snd];
      if (!uri) continue;
      this._sounds[snd] = new Audio(uri);
    }
  }

  hasAnimation(name: string): boolean {
    return !!this._data.animations[name];
  }

  exitAnimation(): void {
    this._exiting = true;
  }

  showAnimation(animationName: string, stateChangeCallback?: StateChangeCallback): boolean {
    this._exiting = false;

    if (!this.hasAnimation(animationName)) return false;

    // Kill any running loop first
    this._clearLoop();

    this._currentAnimation = this._data.animations[animationName];
    this.currentAnimationName = animationName;
    this._currentFrameIndex = 0;
    this._currentFrame = undefined;
    this._endCallback = stateChangeCallback;

    this._step();
    return true;
  }

  private _clearLoop(): void {
    if (this._loop !== null) {
      clearTimeout(this._loop);
      this._loop = null;
    }
  }

  private _draw(): void {
    const images = this._currentFrame?.images || [];

    for (let i = 0; i < this._overlays.length; i++) {
      if (i < images.length) {
        const xy = images[i];
        this._overlays[i].style.backgroundPosition = `${-xy[0]}px ${-xy[1]}px`;
        this._overlays[i].style.display = 'block';
      } else {
        this._overlays[i].style.display = 'none';
      }
    }
  }

  private _getNextAnimationFrame(): number | undefined {
    if (!this._currentAnimation) return undefined;
    if (!this._currentFrame) return 0;

    if (this._exiting && this._currentFrame.exitBranch !== undefined) {
      return this._currentFrame.exitBranch;
    }

    const branching = this._currentFrame.branching;
    if (branching) {
      let rnd = Math.random() * 100;
      for (const branch of branching.branches) {
        if (rnd <= branch.weight) return branch.frameIndex;
        rnd -= branch.weight;
      }
    }

    return this._currentFrameIndex + 1;
  }

  private _playSound(): void {
    const s = this._currentFrame?.sound;
    if (!s) return;
    const audio = this._sounds[s];
    if (audio) audio.play();
  }

  private _atLastFrame(): boolean {
    if (!this._currentAnimation) return true;
    return this._currentFrameIndex >= this._currentAnimation.frames.length - 1;
  }

  private _step(): void {
    if (!this._currentAnimation) return;

    const nextFrame = this._getNextAnimationFrame();
    const newFrameIndex = Math.min(
      nextFrame ?? 0,
      this._currentAnimation.frames.length - 1
    );
    const frameChanged = !this._currentFrame || this._currentFrameIndex !== newFrameIndex;
    this._currentFrameIndex = newFrameIndex;

    if (!(this._atLastFrame() && this._currentAnimation.useExitBranching)) {
      this._currentFrame = this._currentAnimation.frames[this._currentFrameIndex];
    }

    this._draw();
    this._playSound();

    const duration = this._currentFrame?.duration ?? 100;

    // Check if we're at the end
    if (this._endCallback && frameChanged && this._atLastFrame()) {
      if (this._currentAnimation.useExitBranching && !this._exiting) {
        // Waiting for exit signal — keep looping on this frame
        this._loop = setTimeout(() => this._step(), duration);
        this._endCallback(this.currentAnimationName!, AnimatorStates.WAITING);
      } else {
        // Done — fire callback and STOP. No more setTimeout.
        this._loop = null;
        this._endCallback(this.currentAnimationName!, AnimatorStates.EXITED);
      }
    } else {
      // More frames to go
      this._loop = setTimeout(() => this._step(), duration);
    }
  }

  pause(): void {
    this._clearLoop();
  }

  resume(): void {
    if (this._currentAnimation) {
      this._step();
    }
  }

  destroy(): void {
    this._clearLoop();
    this._currentAnimation = undefined;
    this._endCallback = undefined;
    this._currentFrame = undefined;
  }
}
