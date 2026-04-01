type QueueFunction = (complete: () => void) => void;

export class Queue {
  private _queue: QueueFunction[] = [];
  private _active = false;
  private _onEmptyCallback: () => void;

  constructor(onEmptyCallback: () => void) {
    this._onEmptyCallback = onEmptyCallback;
  }

  queue(func: QueueFunction): void {
    this._queue.push(func);
    if (this._queue.length === 1 && !this._active) {
      this._progressQueue();
    }
  }

  private _progressQueue(): void {
    if (!this._queue.length) {
      this._onEmptyCallback();
      return;
    }

    const f = this._queue.shift()!;
    this._active = true;
    f(() => this.next());
  }

  clear(): void {
    this._queue = [];
  }

  next(): void {
    this._active = false;
    this._progressQueue();
  }
}
