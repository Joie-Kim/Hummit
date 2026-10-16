import { NoteStep } from '../types';

const NOTE_OFFSETS: Record<string, number> = {
  'C': 0, 'C#': 1, 'DB': 1,
  'D': 2, 'D#': 3, 'EB': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'GB': 6,
  'G': 7, 'G#': 8, 'AB': 8,
  'A': 9, 'A#': 10, 'BB': 10,
  'B': 11,
};

export function noteToFreq(noteStr: string): number {
  if (!noteStr || noteStr.toUpperCase() === 'REST') return 0;
  const cleaned = noteStr.trim().toUpperCase();
  const match = cleaned.match(/^([A-G][#B]?)(-?\d)$/);
  if (!match) return 440;
  const [, pitchName, octaveStr] = match;
  const semitone = NOTE_OFFSETS[pitchName] ?? 0;
  const octave = parseInt(octaveStr, 10);
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToNoteName(freq: number): string {
  if (freq < 75 || freq > 1400) return '';
  const midi = Math.round(12 * Math.log2(freq / 440) + 69);
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = names[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/**
 * Autocorrelation pitch detector for microphone input
 */
function autoCorrelatePitch(buf: Float32Array, sampleRate: number): number {
  let size = buf.length;
  let rms = 0;
  for (let i = 0; i < size; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.018) return -1; // Too quiet

  let r1 = 0;
  let r2 = size - 1;
  const thres = 0.2;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buf[size - i]) < thres) {
      r2 = size - i;
      break;
    }
  }

  const trimmed = buf.slice(r1, r2);
  size = trimmed.length;
  if (size < 32) return -1;

  const c = new Array(size).fill(0);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  let d = 0;
  while (d < size - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  if (maxpos <= 0) return -1;
  return sampleRate / maxpos;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private activeStream: MediaStream | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeTimers: number[] = [];
  private htmlAudioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private timeDomainBuf = new Float32Array(1024);

  private ensureContext(): { ctx: AudioContext; analyser: AnalyserNode } {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.78;
    }
    return { ctx: this.ctx, analyser: this.analyser };
  }

  public getFrequencyData(targetArray: Uint8Array): number {
    if (!this.analyser) {
      targetArray.fill(0);
      return 0;
    }
    this.analyser.getByteFrequencyData(targetArray);
    let sum = 0;
    for (let i = 0; i < targetArray.length; i++) {
      sum += targetArray[i];
    }
    return sum / targetArray.length;
  }

  /**
   * Detects the current musical note being hummed into the microphone (e.g. "F#4")
   */
  public detectLivePitchNote(): string {
    if (!this.analyser || !this.ctx) return '';
    this.analyser.getFloatTimeDomainData(this.timeDomainBuf);
    const freq = autoCorrelatePitch(this.timeDomainBuf, this.ctx.sampleRate);
    if (freq > 80 && freq < 1100) {
      return freqToNoteName(freq);
    }
    return '';
  }

  public async startMicrophone(): Promise<MediaStream> {
    this.stopMicrophone();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.activeStream = stream;
    this.connectMicStream(stream);
    return stream;
  }

  public stopMicrophone() {
    this.disconnectMicStream();
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.activeStream = null;
    }
  }

  public connectMicStream(stream: MediaStream): AnalyserNode {
    const { ctx, analyser } = this.ensureContext();
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {
        // ignore
      }
    }
    this.micSource = ctx.createMediaStreamSource(stream);
    this.micSource.connect(analyser);
    return analyser;
  }

  public disconnectMicStream() {
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {
        // ignore
      }
      this.micSource = null;
    }
  }

  public stopPlayback() {
    this.isPlaying = false;
    this.activeTimers.forEach((id) => window.clearTimeout(id));
    this.activeTimers = [];
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeOscillators = [];

    if (this.htmlAudioElement) {
      try {
        this.htmlAudioElement.pause();
        this.htmlAudioElement.currentTime = 0;
      } catch {
        // ignore
      }
      this.htmlAudioElement = null;
    }
  }

  /**
   * Plays an audio URL (either the user's recorded humming blob URL or iTunes 30s chorus preview)
   * while feeding simulated or real frequency pulses so the 3D Mascot dances along!
   */
  public playAudioUrl(url: string, onComplete?: () => void) {
    this.stopPlayback();
    this.ensureContext();
    this.isPlaying = true;

    const audio = new Audio(url);
    audio.volume = 0.9;
    this.htmlAudioElement = audio;

    // Also run a gentle silent/low pulse into analyser so 3D mascot mouth dances even on cross-origin audio
    const { ctx, analyser } = this.ensureContext();
    const pulseOsc = ctx.createOscillator();
    const pulseGain = ctx.createGain();
    pulseOsc.type = 'sawtooth';
    pulseOsc.frequency.value = 180;
    pulseGain.gain.value = 0.001; // Inaudible to speakers, visible to analyser if needed

    const analyserBoost = ctx.createGain();
    analyserBoost.gain.value = 0.5;
    pulseOsc.connect(analyserBoost);
    analyserBoost.connect(analyser);
    pulseOsc.start();
    this.activeOscillators.push(pulseOsc);

    // Modulate frequency to create lifelike mouth movement during external audio playback
    const modInterval = window.setInterval(() => {
      if (!this.isPlaying) return;
      pulseOsc.frequency.setValueAtTime(120 + Math.random() * 480, ctx.currentTime);
      analyserBoost.gain.setValueAtTime(0.2 + Math.random() * 0.65, ctx.currentTime);
    }, 90);
    this.activeTimers.push(modInterval);

    audio.onended = () => {
      this.stopPlayback();
      if (onComplete) onComplete();
    };
    audio.onerror = () => {
      this.stopPlayback();
      if (onComplete) onComplete();
    };

    audio.play().catch(() => {
      this.stopPlayback();
      if (onComplete) onComplete();
    });
  }

  /**
   * Plays a song's chorus hook melody using a crystal-clear Electric Piano + Bell Lead
   * (or warm vocal humming sound) so melodies are immediately recognizable!
   */
  public playHookMelody(
    notes: NoteStep[],
    mode: 'popboy-lead' | 'human-hum' = 'popboy-lead',
    onComplete?: () => void,
    onNoteIndexChange?: (idx: number, note: string) => void
  ) {
    this.stopPlayback();
    const { ctx, analyser } = this.ensureContext();
    this.isPlaying = true;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.52;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    let cursor = ctx.currentTime + 0.05;
    let totalDurationMs = 50;

    notes.forEach((step, idx) => {
      const dur = Math.max(0.14, step.duration || 0.3);
      const freq = noteToFreq(step.note);

      const noteStartMs = totalDurationMs;
      const stepTimer = window.setTimeout(() => {
        if (this.isPlaying && onNoteIndexChange) {
          onNoteIndexChange(idx, step.note);
        }
      }, noteStartMs);
      this.activeTimers.push(stepTimer);

      if (freq > 0) {
        const oscMain = ctx.createOscillator();
        const oscBell = ctx.createOscillator();
        const oscWarm = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const bellGain = ctx.createGain();

        if (mode === 'human-hum') {
          // Warm human-like humming / vocal synth
          oscMain.type = 'triangle';
          oscBell.type = 'sine';
          oscWarm.type = 'sine';

          oscMain.frequency.setValueAtTime(freq, cursor);
          oscBell.frequency.setValueAtTime(freq * 2, cursor);
          oscWarm.frequency.setValueAtTime(freq * 0.5, cursor);

          bellGain.gain.setValueAtTime(0.18, cursor);
          bellGain.gain.exponentialRampToValueAtTime(0.01, cursor + dur * 0.9);

          noteGain.gain.setValueAtTime(0.001, cursor);
          noteGain.gain.linearRampToValueAtTime(0.85, cursor + 0.03);
          noteGain.gain.exponentialRampToValueAtTime(0.55, cursor + dur * 0.75);
          noteGain.gain.exponentialRampToValueAtTime(0.001, cursor + dur * 0.98);
        } else {
          // Crystal Rhodes Electric Piano + Clear Melody Bell (Highly recognizable!)
          oscMain.type = 'triangle';
          oscBell.type = 'sine';
          oscWarm.type = 'sine';

          oscMain.frequency.setValueAtTime(freq, cursor);
          oscBell.frequency.setValueAtTime(freq * 2, cursor); // Crystal overtone
          oscWarm.frequency.setValueAtTime(freq * 0.5, cursor); // Warm bass foundation

          // Bell chime attack
          bellGain.gain.setValueAtTime(0.38, cursor);
          bellGain.gain.exponentialRampToValueAtTime(0.02, cursor + Math.min(0.22, dur * 0.7));

          // Piano sustain envelope
          noteGain.gain.setValueAtTime(0.001, cursor);
          noteGain.gain.linearRampToValueAtTime(0.95, cursor + 0.015);
          noteGain.gain.exponentialRampToValueAtTime(0.48, cursor + dur * 0.65);
          noteGain.gain.exponentialRampToValueAtTime(0.001, cursor + dur * 0.96);
        }

        const warmGain = ctx.createGain();
        warmGain.gain.value = 0.25;

        oscMain.connect(noteGain);
        oscBell.connect(bellGain);
        bellGain.connect(noteGain);
        oscWarm.connect(warmGain);
        warmGain.connect(noteGain);

        noteGain.connect(masterGain);

        oscMain.start(cursor);
        oscBell.start(cursor);
        oscWarm.start(cursor);

        oscMain.stop(cursor + dur);
        oscBell.stop(cursor + dur);
        oscWarm.stop(cursor + dur);

        this.activeOscillators.push(oscMain, oscBell, oscWarm);
      }

      cursor += dur;
      totalDurationMs += dur * 1000;
    });

    const finishTimer = window.setTimeout(() => {
      this.isPlaying = false;
      if (onNoteIndexChange) onNoteIndexChange(-1, '');
      try {
        analyser.disconnect(ctx.destination);
      } catch {
        // ignore
      }
      if (onComplete) onComplete();
    }, totalDurationMs + 80);

    this.activeTimers.push(finishTimer);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const soundEngine = new SoundEngine();
