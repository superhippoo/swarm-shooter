import type { WeaponId } from '../shared/game-types';
import { LIMITS } from './config';

interface Voice {
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  remaining: number;
  endsAt: number;
  priority: number;
}

interface VoiceContext {
  context: AudioContext;
  voice: Voice;
  now: number;
}

export class ProceduralAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private voices: Voice[] = [];
  private lastHitAt = -1;
  private lastDeathAt = -1;

  unlock(): void {
    if (!this.context) {
      this.context = new AudioContext();
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 16;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.16;
      this.master = this.context.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(compressor).connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.context);
    }
    if (this.context.state === 'suspended') {
      void this.context.resume().catch(() => undefined);
    }
  }

  pause(): void {
    if (this.context?.state === 'running') {
      void this.context.suspend().catch(() => undefined);
    }
  }

  playShot(id: WeaponId): void {
    const duration = id === 'shotgun' ? 0.15 : id === 'rail' ? 0.18 : id === 'flame' ? 0.07 : 0.09;
    const voice = this.beginVoice(duration, 2);
    if (!voice) return;
    const pitch = 1 + (Math.random() - 0.5) * 0.06;
    if (id === 'rifle') {
      this.tone(voice, 820 * pitch, 420 * pitch, 0.065, 0.12, 'square');
      this.noise(voice, 0.065, 2400, 0.11, 'highpass');
    } else if (id === 'shotgun') {
      this.tone(voice, 135 * pitch, 52 * pitch, 0.15, 0.2, 'triangle');
      this.noise(voice, 0.15, 850, 0.19, 'lowpass');
    } else if (id === 'arc') {
      this.tone(voice, 1180 * pitch, 260 * pitch, 0.09, 0.1, 'sawtooth');
      this.noise(voice, 0.07, 3200, 0.08, 'highpass');
    } else if (id === 'rail') {
      this.tone(voice, 92 * pitch, 920 * pitch, 0.18, 0.16, 'sawtooth');
      this.noise(voice, 0.12, 1800, 0.11, 'bandpass');
    } else if (id === 'flame') {
      this.noise(voice, 0.07, 740, 0.075, 'lowpass');
      this.tone(voice, 120 * pitch, 82 * pitch, 0.07, 0.035, 'triangle');
    } else if (id === 'mines') {
      this.tone(voice, 310 * pitch, 150 * pitch, 0.09, 0.09, 'square');
    } else {
      this.tone(voice, 105 * pitch, 43 * pitch, 0.09, 0.18, 'sine');
      this.noise(voice, 0.09, 420, 0.12, 'bandpass');
    }
  }

  playExplosion(): void {
    const voice = this.beginVoice(0.24, 3);
    if (!voice) return;
    this.tone(voice, 78, 28, 0.24, 0.22, 'sine');
    this.noise(voice, 0.24, 320, 0.2, 'lowpass');
  }

  playHit(): void {
    const context = this.readyContext();
    if (!context || context.currentTime - this.lastHitAt < 0.05) return;
    this.lastHitAt = context.currentTime;
    const voice = this.beginVoice(0.04, 1);
    if (voice) this.tone(voice, 760, 390, 0.04, 0.055, 'square');
  }

  playEnemyDeath(): void {
    const context = this.readyContext();
    if (!context || context.currentTime - this.lastDeathAt < 0.08) return;
    this.lastDeathAt = context.currentTime;
    const voice = this.beginVoice(0.09, 1);
    if (voice) this.tone(voice, 190, 55, 0.09, 0.07, 'sawtooth');
  }

  playReload(): void {
    const voice = this.beginVoice(0.14, 2);
    if (!voice) return;
    this.tone(voice, 240, 330, 0.055, 0.055, 'square');
    this.tone(voice, 330, 470, 0.06, 0.05, 'square', 0.075);
  }

  playSupply(): void {
    const voice = this.beginVoice(0.2, 3);
    if (!voice) return;
    this.tone(voice, 420, 620, 0.1, 0.06, 'sine');
    this.tone(voice, 620, 840, 0.1, 0.05, 'sine', 0.09);
  }

  playMission(): void {
    const voice = this.beginVoice(0.25, 3);
    if (!voice) return;
    this.tone(voice, 330, 440, 0.12, 0.065, 'sine');
    this.tone(voice, 440, 660, 0.13, 0.065, 'sine', 0.1);
  }

  playStageStart(): void {
    const voice = this.beginVoice(0.22, 3);
    if (!voice) return;
    this.tone(voice, 220, 440, 0.18, 0.055, 'triangle');
  }

  playStageClear(): void {
    const voice = this.beginVoice(0.38, 4);
    if (!voice) return;
    this.tone(voice, 330, 660, 0.16, 0.07, 'sine');
    this.tone(voice, 495, 990, 0.18, 0.06, 'sine', 0.16);
  }

  playUnlock(): void {
    const voice = this.beginVoice(0.3, 4);
    if (!voice) return;
    this.tone(voice, 520, 1040, 0.24, 0.06, 'triangle');
  }

  playMultiKill(tier: number): void {
    const voice = this.beginVoice(0.16, 3);
    if (!voice) return;
    this.tone(voice, 420 + tier * 18, 760 + tier * 22, 0.14, 0.045, 'square');
  }

  close(): void {
    for (const voice of [...this.voices]) this.stopVoice(voice);
    this.voices.length = 0;
    const context = this.context;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    if (context && context.state !== 'closed') {
      void context.close().catch(() => undefined);
    }
  }

  private beginVoice(duration: number, priority: number): VoiceContext | null {
    const context = this.readyContext();
    if (!context || !this.master) return null;
    const now = context.currentTime;
    this.pruneVoices(now);
    if (this.voices.length >= LIMITS.audioVoices) {
      const oldest = [...this.voices].sort((a, b) => a.priority - b.priority || a.endsAt - b.endsAt)[0];
      if (oldest) {
        this.stopVoice(oldest);
      }
    }
    const gain = context.createGain();
    gain.gain.value = 1;
    gain.connect(this.master);
    const voice: Voice = {
      sources: [],
      nodes: [gain],
      remaining: 0,
      endsAt: now + duration + 0.02,
      priority,
    };
    this.voices.push(voice);
    return { context, voice, now };
  }

  private tone(
    output: VoiceContext,
    startFrequency: number,
    endFrequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    delay = 0,
  ): void {
    const { context, voice } = output;
    const start = output.now + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, startFrequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(voice.nodes[0]);
    voice.nodes.push(oscillator, gain);
    this.startSource(voice, oscillator, start, duration + 0.01);
  }

  private noise(
    output: VoiceContext,
    duration: number,
    frequency: number,
    volume: number,
    filterType: BiquadFilterType,
  ): void {
    if (!this.noiseBuffer) return;
    const { context, voice, now } = output;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter).connect(gain);
    gain.connect(voice.nodes[0]);
    voice.nodes.push(source, filter, gain);
    this.startSource(voice, source, now, duration);
  }

  private startSource(
    voice: Voice,
    source: AudioScheduledSourceNode,
    start: number,
    duration: number,
  ): void {
    voice.sources.push(source);
    voice.remaining += 1;
    source.onended = () => {
      voice.remaining -= 1;
      if (voice.remaining <= 0) this.cleanupVoice(voice);
    };
    source.start(start);
    source.stop(start + duration);
  }

  private pruneVoices(now: number): void {
    for (const voice of [...this.voices]) {
      if (voice.endsAt <= now) this.cleanupVoice(voice);
    }
  }

  private cleanupVoice(voice: Voice): void {
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
    const index = this.voices.indexOf(voice);
    if (index >= 0) this.voices.splice(index, 1);
  }

  private stopVoice(voice: Voice): void {
    for (const source of voice.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* already stopped */ }
    }
    this.cleanupVoice(voice);
  }

  private readyContext(): AudioContext | null {
    return this.context && this.context.state !== 'closed' ? this.context : null;
  }

  private createNoiseBuffer(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < channel.length; index += 1) {
      previous = previous * 0.3 + (Math.random() * 2 - 1) * 0.7;
      channel[index] = previous;
    }
    return buffer;
  }
}
