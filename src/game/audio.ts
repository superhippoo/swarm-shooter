export class ProceduralAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastHitAt = -1;

  unlock(): void {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.24;
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.context);
    }
    if (this.context.state === 'suspended') {
      void this.context.resume().catch(() => undefined);
    }
  }

  playShot(): void {
    const context = this.readyContext();
    if (!context || !this.master || !this.noiseBuffer) {
      return;
    }
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const oscillatorGain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(175, now);
    oscillator.frequency.exponentialRampToValueAtTime(58, now + 0.075);
    oscillatorGain.gain.setValueAtTime(0.22, now);
    oscillatorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    oscillator.connect(oscillatorGain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.09);

    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = 1450;
    filter.Q.value = 0.65;
    noiseGain.gain.setValueAtTime(0.16, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(now, Math.random() * 0.6, 0.06);
  }

  playHit(): void {
    const context = this.readyContext();
    if (!context || !this.master || context.currentTime - this.lastHitAt < 0.028) {
      return;
    }
    this.lastHitAt = context.currentTime;
    this.tone(720, 310, 0.045, 0.09, 'square');
  }

  playEnemyDeath(): void {
    if (this.readyContext()) {
      this.tone(150, 42, 0.16, 0.13, 'sawtooth');
    }
  }

  playReload(): void {
    if (this.readyContext()) {
      this.tone(260, 410, 0.055, 0.07, 'square');
    }
  }

  playMission(): void {
    const context = this.readyContext();
    if (!context) {
      return;
    }
    this.tone(330, 440, 0.12, 0.08, 'sine');
    this.tone(440, 660, 0.15, 0.08, 'sine', 0.09);
  }

  close(): void {
    const context = this.context;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    if (context && context.state !== 'closed') {
      void context.close().catch(() => undefined);
    }
  }

  private readyContext(): AudioContext | null {
    return this.context && this.context.state !== 'closed' ? this.context : null;
  }

  private createNoiseBuffer(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < channel.length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.35 + white * 0.65;
      channel[index] = previous;
    }
    return buffer;
  }

  private tone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    delaySeconds = 0,
  ): void {
    const context = this.readyContext();
    if (!context || !this.master) {
      return;
    }
    const now = context.currentTime + delaySeconds;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }
}
