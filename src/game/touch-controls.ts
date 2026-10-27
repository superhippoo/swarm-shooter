import { normalizeStickVector } from './logic';

interface TouchControlsOptions {
  movePad: HTMLElement;
  moveKnob: HTMLElement;
  fireButton: HTMLButtonElement;
  onMove: (x: number, y: number) => void;
  onFire: (firing: boolean) => void;
}

export class TouchControls {
  private readonly movePad: HTMLElement;
  private readonly moveKnob: HTMLElement;
  private readonly fireButton: HTMLButtonElement;
  private readonly onMove: TouchControlsOptions['onMove'];
  private readonly onFire: TouchControlsOptions['onFire'];
  private readonly events = new AbortController();
  private enabled = false;
  private movePointerId: number | null = null;
  private firePointerId: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private radius = 1;

  constructor(options: TouchControlsOptions) {
    this.movePad = options.movePad;
    this.moveKnob = options.moveKnob;
    this.fireButton = options.fireButton;
    this.onMove = options.onMove;
    this.onFire = options.onFire;
    const signal = this.events.signal;
    this.movePad.addEventListener('pointerdown', this.handleMoveDown, { signal });
    this.movePad.addEventListener('pointermove', this.handleMove, { signal });
    this.movePad.addEventListener('pointerup', this.handleMoveEnd, { signal });
    this.movePad.addEventListener('pointercancel', this.handleMoveEnd, { signal });
    this.movePad.addEventListener('lostpointercapture', this.handleMoveEnd, { signal });
    this.fireButton.addEventListener('pointerdown', this.handleFireDown, { signal });
    this.fireButton.addEventListener('pointerup', this.handleFireEnd, { signal });
    this.fireButton.addEventListener('pointercancel', this.handleFireEnd, { signal });
    this.fireButton.addEventListener('lostpointercapture', this.handleFireEnd, { signal });
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  reset(): void {
    this.resetMove();
    this.resetFire();
  }

  dispose(): void {
    this.reset();
    this.events.abort();
  }

  private readonly handleMoveDown = (event: PointerEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!this.enabled || this.movePointerId !== null) return;
    const bounds = this.movePad.getBoundingClientRect();
    const knobBounds = this.moveKnob.getBoundingClientRect();
    this.centerX = bounds.left + bounds.width / 2;
    this.centerY = bounds.top + bounds.height / 2;
    this.radius = Math.max(1, (bounds.width - knobBounds.width) / 2);
    this.movePointerId = event.pointerId;
    this.movePad.setPointerCapture(event.pointerId);
    this.movePad.classList.add('is-active');
    this.updateMove(event);
  };

  private readonly handleMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.movePointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.updateMove(event);
  };

  private readonly handleMoveEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.movePointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.resetMove();
  };

  private readonly handleFireDown = (event: PointerEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!this.enabled || this.firePointerId !== null) return;
    this.firePointerId = event.pointerId;
    this.fireButton.setPointerCapture(event.pointerId);
    this.fireButton.classList.add('is-active');
    this.onFire(true);
  };

  private readonly handleFireEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.firePointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.resetFire();
  };

  private updateMove(event: PointerEvent): void {
    const deltaX = event.clientX - this.centerX;
    const deltaY = event.clientY - this.centerY;
    const vector = normalizeStickVector(deltaX, deltaY, this.radius);
    const distance = Math.hypot(deltaX, deltaY);
    const visualScale = distance > this.radius ? this.radius / distance : 1;
    const visualX = deltaX * visualScale;
    const visualY = deltaY * visualScale;
    this.moveKnob.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
    this.onMove(vector.x, vector.y);
  }

  private resetMove(): void {
    const pointerId = this.movePointerId;
    this.movePointerId = null;
    if (pointerId !== null && this.movePad.hasPointerCapture(pointerId)) {
      this.movePad.releasePointerCapture(pointerId);
    }
    this.movePad.classList.remove('is-active');
    this.moveKnob.style.transform = '';
    this.onMove(0, 0);
  }

  private resetFire(): void {
    const pointerId = this.firePointerId;
    this.firePointerId = null;
    if (pointerId !== null && this.fireButton.hasPointerCapture(pointerId)) {
      this.fireButton.releasePointerCapture(pointerId);
    }
    this.fireButton.classList.remove('is-active');
    this.onFire(false);
  }
}
