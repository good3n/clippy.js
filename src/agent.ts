import type { AgentData, SoundMap, AnimatorState } from './types.js';
import { Animator, AnimatorStates } from './animator.js';
import { Balloon } from './balloon.js';
import { Queue } from './queue.js';

export class Agent {
  private _el: HTMLElement;
  private _animator: Animator;
  private _balloon: Balloon;
  private _queue: Queue;
  private _hidden = false;
  private _idleResolve: (() => void) | null = null;
  private _idlePromise: Promise<void> | null = null;

  // Drag state
  private _offset = { top: 0, left: 0 };
  private _targetX = 0;
  private _targetY = 0;
  private _moveHandle: ((e: MouseEvent) => void) | null = null;
  private _upHandle: ((e: MouseEvent) => void) | null = null;
  private _dragUpdateLoop: ReturnType<typeof setTimeout> | null = null;
  private _dragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private static readonly DRAG_THRESHOLD = 5;

  readonly path: string;

  constructor(path: string, data: AgentData, sounds: SoundMap) {
    this.path = path;
    this._queue = new Queue(() => this._onQueueEmpty());

    this._el = document.createElement('div');
    this._el.className = 'clippy';
    this._el.style.display = 'none';
    this._el.style.position = 'fixed';
    this._el.style.zIndex = '999999';
    this._el.style.cursor = 'pointer';
    document.body.appendChild(this._el);

    this._animator = new Animator(this._el, path, data, sounds);
    this._balloon = new Balloon(this._el);
    this._setupEvents();
  }

  // ─── Public API ───

  gestureAt(x: number, y: number): boolean {
    const d = this._getDirection(x, y);
    const gAnim = 'Gesture' + d;
    const lookAnim = 'Look' + d;
    const animation = this.hasAnimation(gAnim) ? gAnim : lookAnim;
    return this.play(animation);
  }

  hide(fast?: boolean, callback?: () => void): void {
    this._hidden = true;
    this.stop();

    if (fast) {
      this._el.style.display = 'none';
      this.pause();
      if (callback) callback();
      return;
    }

    this._playInternal('Hide', (_name, state) => {
      if (state === AnimatorStates.EXITED) {
        this._el.style.display = 'none';
        this.pause();
        if (callback) callback();
      }
    });
  }

  moveTo(x: number, y: number, duration = 1000): void {
    const dir = this._getDirection(x, y);
    const anim = 'Move' + dir;

    this._addToQueue((complete) => {
      if (duration === 0) {
        this._el.style.top = y + 'px';
        this._el.style.left = x + 'px';
        this.reposition();
        complete();
        return;
      }

      if (!this.hasAnimation(anim)) {
        this._animateMove(x, y, duration, complete);
        return;
      }

      this._playInternal(anim, (_name, state) => {
        if (state === AnimatorStates.EXITED) {
          complete();
        }
        if (state === AnimatorStates.WAITING) {
          this._animateMove(x, y, duration, () => {
            this._animator.exitAnimation();
          });
        }
      });
    });
  }

  play(animation: string, timeout = 5000, cb?: () => void): boolean {
    if (!this.hasAnimation(animation)) return false;

    this._addToQueue((complete) => {
      let completed = false;

      const callback = (_name: string, state: AnimatorState) => {
        if (state === AnimatorStates.EXITED) {
          completed = true;
          if (cb) cb();
          complete();
        }
      };

      if (timeout) {
        setTimeout(() => {
          if (completed) return;
          this._animator.exitAnimation();
        }, timeout);
      }

      this._playInternal(animation, callback);
    });

    return true;
  }

  show(fast?: boolean): boolean | void {
    this._hidden = false;
    this._el.style.display = '';

    if (fast) {
      this.resume();
      this._onQueueEmpty();
      return;
    }

    // Position agent if not already placed
    if (!this._el.style.top || !this._el.style.left) {
      const left = Math.min(window.innerWidth * 0.8, window.innerWidth - 150);
      const top = Math.min(window.innerHeight * 0.8, window.innerHeight - 130);
      this._el.style.top = top + 'px';
      this._el.style.left = left + 'px';
    }

    this.resume();
    return this.play('Show');
  }

  speak(text: string, hold?: boolean): void {
    this._addToQueue((complete) => {
      this._balloon.speak(complete, text, hold);
    });
  }

  closeBalloon(): void {
    this._balloon.hide();
  }

  delay(time = 250): void {
    this._addToQueue((complete) => {
      this._onQueueEmpty();
      setTimeout(complete, time);
    });
  }

  stopCurrent(): void {
    this._animator.exitAnimation();
    this._balloon.close();
  }

  stop(): void {
    this._queue.clear();
    this._animator.pause(); // Actually kills the timer
    this._balloon.hide();
  }

  hasAnimation(name: string): boolean {
    return this._animator.hasAnimation(name);
  }

  animations(): string[] {
    return this._animator.animations();
  }

  animate(): boolean {
    const anims = this.animations();
    const anim = anims[Math.floor(Math.random() * anims.length)];
    if (anim.indexOf('Idle') === 0) return this.animate();
    return this.play(anim);
  }

  pause(): void {
    this._animator.pause();
    this._balloon.pause();
  }

  resume(): void {
    this._animator.resume();
    this._balloon.resume();
  }

  /** Remove the agent from the DOM entirely */
  destroy(): void {
    this.stop();
    this._animator.destroy();
    this._el.remove();
    window.removeEventListener('resize', this._resizeHandler);
    // Clean up any lingering drag handlers
    if (this._moveHandle) window.removeEventListener('mousemove', this._moveHandle);
    if (this._upHandle) window.removeEventListener('mouseup', this._upHandle);
    if (this._dragUpdateLoop) clearTimeout(this._dragUpdateLoop);
  }

  // ─── Internals ───

  private _playInternal(animation: string, callback?: (_name: string, state: AnimatorState) => void): void {
    // If idle is playing, wait for it to finish then play
    if (this._isIdleAnimation() && this._idlePromise) {
      this._animator.exitAnimation(); // Signal idle to stop
      this._idlePromise.then(() => {
        this._animator.showAnimation(animation, callback);
      });
      return;
    }
    this._animator.showAnimation(animation, callback);
  }

  private _getDirection(x: number, y: number): string {
    const rect = this._el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const a = centerY - y;
    const b = centerX - x;
    const r = Math.round((180 * Math.atan2(a, b)) / Math.PI);

    if (-45 <= r && r < 45) return 'Right';
    if (45 <= r && r < 135) return 'Up';
    if ((135 <= r && r <= 180) || (-180 <= r && r < -135)) return 'Left';
    if (-135 <= r && r < -45) return 'Down';
    return 'Top';
  }

  private _onQueueEmpty(): void {
    if (this._hidden || this._isIdleAnimation()) return;
    const idleAnim = this._getIdleAnimation();
    if (!idleAnim) return;

    this._idlePromise = new Promise<void>((resolve) => {
      this._idleResolve = resolve;
    });

    this._animator.showAnimation(idleAnim, (_name, state) => {
      if (state === AnimatorStates.EXITED) {
        if (this._idleResolve) {
          this._idleResolve();
          this._idleResolve = null;
        }
        this._idlePromise = null;
        // Queue next idle after a short delay
        if (!this._hidden) {
          setTimeout(() => this._onQueueEmpty(), 1000);
        }
      }
    });
  }

  private _isIdleAnimation(): boolean {
    const c = this._animator.currentAnimationName;
    return !!c && c.indexOf('Idle') === 0;
  }

  private _getIdleAnimation(): string | undefined {
    const idles = this.animations().filter((a) => a.indexOf('Idle') === 0);
    if (!idles.length) return undefined;
    return idles[Math.floor(Math.random() * idles.length)];
  }

  private _resizeHandler = (): void => {
    this.reposition();
  };

  private _setupEvents(): void {
    window.addEventListener('resize', this._resizeHandler);
    this._el.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this._el.addEventListener('dblclick', () => this._onDoubleClick());
  }

  private _onDoubleClick(): void {
    if (!this.play('ClickedOn')) {
      this.animate();
    }
  }

  reposition(): void {
    if (this._el.style.display === 'none') return;

    const rect = this._el.getBoundingClientRect();
    let top = rect.top;
    let left = rect.left;
    const m = 5;

    if (top - m < 0) top = m;
    else if (top + rect.height + m > window.innerHeight) top = window.innerHeight - rect.height - m;

    if (left - m < 0) left = m;
    else if (left + rect.width + m > window.innerWidth) left = window.innerWidth - rect.width - m;

    // position:fixed = viewport-relative, no scroll offset
    this._el.style.top = top + 'px';
    this._el.style.left = left + 'px';
    this._balloon.reposition();
  }

  private _onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this._startDrag(e);
  }

  private _startDrag(e: MouseEvent): void {
    this._dragging = false;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;

    const rect = this._el.getBoundingClientRect();
    this._offset = {
      top: e.clientY - rect.top,
      left: e.clientX - rect.left,
    };
    this._targetX = rect.left;
    this._targetY = rect.top;

    this._moveHandle = (ev: MouseEvent) => this._dragMove(ev);
    this._upHandle = () => this._finishDrag();

    window.addEventListener('mousemove', this._moveHandle);
    window.addEventListener('mouseup', this._upHandle);
  }

  private _updateLocation(): void {
    this._el.style.top = this._targetY + 'px';
    this._el.style.left = this._targetX + 'px';
    this._dragUpdateLoop = setTimeout(() => this._updateLocation(), 10);
  }

  private _dragMove(e: MouseEvent): void {
    e.preventDefault();
    const dx = e.clientX - this._dragStartX;
    const dy = e.clientY - this._dragStartY;

    if (!this._dragging) {
      if (Math.abs(dx) < Agent.DRAG_THRESHOLD && Math.abs(dy) < Agent.DRAG_THRESHOLD) return;
      this._dragging = true;
      this.pause();
      this._balloon.hide(true);
      this._dragUpdateLoop = setTimeout(() => this._updateLocation(), 10);
    }

    this._targetX = e.clientX - this._offset.left;
    this._targetY = e.clientY - this._offset.top;
  }

  private _finishDrag(): void {
    if (this._dragUpdateLoop) {
      clearTimeout(this._dragUpdateLoop);
      this._dragUpdateLoop = null;
    }
    if (this._moveHandle) window.removeEventListener('mousemove', this._moveHandle);
    if (this._upHandle) window.removeEventListener('mouseup', this._upHandle);
    this._moveHandle = null;
    this._upHandle = null;

    if (this._dragging) {
      this._balloon.show();
      this.reposition();
      this.resume();
    }
    this._dragging = false;
  }

  private _addToQueue(func: (complete: () => void) => void): void {
    this._queue.queue((complete) => func.call(this, complete));
  }

  private _animateMove(x: number, y: number, duration: number, callback: () => void): void {
    const start = performance.now();
    const startLeft = parseFloat(this._el.style.left) || 0;
    const startTop = parseFloat(this._el.style.top) || 0;

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      this._el.style.left = startLeft + (x - startLeft) * progress + 'px';
      this._el.style.top = startTop + (y - startTop) * progress + 'px';

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        callback();
      }
    };

    requestAnimationFrame(step);
  }
}
