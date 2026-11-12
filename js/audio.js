/**
 * FOCUS FLOW — Audio Synthesizer (Web Audio API)
 * Generates harmonic, gentle notification chimes and haptic-like sound feedback without external audio files.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.7;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setSettings(enabled, volume) {
    this.enabled = Boolean(enabled);
    if (typeof volume === 'number') {
      this.volume = Math.max(0, Math.min(1, volume));
    }
  }

  // Soft click / tap sound
  playClick() {
    if (!this.enabled || this.volume <= 0) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

      gain.gain.setValueAtTime(this.volume * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  // Uplifting chime when a task is completed
  playTaskComplete() {
    if (!this.enabled || this.volume <= 0) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 harmonic triad
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteTime = now + idx * 0.07;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.linearRampToValueAtTime(this.volume * 0.22, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.35);
      });
    } catch (e) {}
  }

  // Zen singing bowl chime when Pomodoro focus session finishes
  playTimerComplete() {
    if (!this.enabled || this.volume <= 0) return;
    this.init();
    if (!this.ctx) return;

    try {
      const chord = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      const now = this.ctx.currentTime;

      chord.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.18, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 1.4);
      });
    } catch (e) {}
  }
}

export const soundEffects = new SoundEffects();
