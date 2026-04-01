export class Balloon {
  private _targetEl: HTMLElement;
  private _hidden = true;
  private _balloon!: HTMLElement;
  private _content!: HTMLElement;
  private _active = false;
  private _hold = false;
  private _complete: (() => void) | undefined;
  private _loop: ReturnType<typeof setTimeout> | undefined;
  private _hiding: ReturnType<typeof setTimeout> | null = null;
  private _addWordFn: (() => void) | undefined;

  readonly WORD_SPEAK_TIME = 200;
  readonly CLOSE_BALLOON_DELAY = 2000;
  private readonly _BALLOON_MARGIN = 15;

  constructor(targetEl: HTMLElement) {
    this._targetEl = targetEl;
    this._setup();
  }

  private _setup(): void {
    this._balloon = document.createElement('div');
    this._balloon.className = 'clippy-balloon';
    this._balloon.style.display = 'none';

    const tip = document.createElement('div');
    tip.className = 'clippy-tip';

    this._content = document.createElement('div');
    this._content.className = 'clippy-content';

    this._balloon.appendChild(tip);
    this._balloon.appendChild(this._content);
    document.body.appendChild(this._balloon);
  }

  reposition(): void {
    const sides = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
    for (const side of sides) {
      this._position(side);
      if (!this._isOut()) break;
    }
  }

  private _position(side: string): void {
    const rect = this._targetEl.getBoundingClientRect();
    const bRect = this._balloon.getBoundingClientRect();
    const bH = bRect.height;
    const bW = bRect.width;

    this._balloon.classList.remove(
      'clippy-top-left', 'clippy-top-right',
      'clippy-bottom-right', 'clippy-bottom-left'
    );

    let left: number, top: number;
    switch (side) {
      case 'top-left':
        left = rect.left + rect.width - bW;
        top = rect.top - bH - this._BALLOON_MARGIN;
        break;
      case 'top-right':
        left = rect.left;
        top = rect.top - bH - this._BALLOON_MARGIN;
        break;
      case 'bottom-right':
        left = rect.left;
        top = rect.top + rect.height + this._BALLOON_MARGIN;
        break;
      case 'bottom-left':
        left = rect.left + rect.width - bW;
        top = rect.top + rect.height + this._BALLOON_MARGIN;
        break;
      default:
        left = 0;
        top = 0;
    }

    this._balloon.style.top = top + window.scrollY + 'px';
    this._balloon.style.left = left + window.scrollX + 'px';
    this._balloon.classList.add('clippy-' + side);
  }

  private _isOut(): boolean {
    const rect = this._balloon.getBoundingClientRect();
    const m = 5;
    if (rect.top - m < 0 || rect.left - m < 0) return true;
    if (rect.bottom + m > window.innerHeight || rect.right + m > window.innerWidth) return true;
    return false;
  }

  speak(complete: () => void, text: string, hold?: boolean): void {
    this._hidden = false;
    this.show();

    this._content.style.height = 'auto';
    this._content.style.width = 'auto';
    this._content.textContent = text;

    // Measure then reset
    const h = this._content.offsetHeight;
    const w = this._content.offsetWidth;
    this._content.style.height = h + 'px';
    this._content.style.width = w + 'px';
    this._content.textContent = '';

    this.reposition();
    this._complete = complete;
    this._sayWords(text, !!hold, complete);
  }

  show(): void {
    if (this._hidden) return;
    this._balloon.style.display = '';
  }

  hide(fast?: boolean): void {
    if (fast) {
      this._balloon.style.display = 'none';
      return;
    }
    this._hiding = setTimeout(() => this._finishHideBalloon(), this.CLOSE_BALLOON_DELAY);
  }

  private _finishHideBalloon(): void {
    if (this._active) return;
    this._balloon.style.display = 'none';
    this._hidden = true;
    this._hiding = null;
  }

  private _sayWords(text: string, hold: boolean, complete: () => void): void {
    this._active = true;
    this._hold = hold;
    const words = text.split(/[^\S-]/);
    const time = this.WORD_SPEAK_TIME;
    let idx = 1;

    this._addWordFn = () => {
      if (!this._active) return;
      if (idx > words.length) {
        this._addWordFn = undefined;
        this._active = false;
        if (!this._hold) {
          complete();
          this.hide();
        }
      } else {
        this._content.textContent = words.slice(0, idx).join(' ');
        idx++;
        this._loop = setTimeout(() => this._addWordFn?.(), time);
      }
    };

    this._addWordFn();
  }

  close(): void {
    if (this._active) {
      this._hold = false;
    } else if (this._hold && this._complete) {
      this._complete();
    }
  }

  pause(): void {
    if (this._loop) clearTimeout(this._loop);
    if (this._hiding) {
      clearTimeout(this._hiding);
      this._hiding = null;
    }
  }

  resume(): void {
    if (this._addWordFn) {
      this._addWordFn();
    } else if (!this._hold && !this._hidden) {
      this._hiding = setTimeout(() => this._finishHideBalloon(), this.CLOSE_BALLOON_DELAY);
    }
  }
}
