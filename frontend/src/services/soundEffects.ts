/**
 * Sound & Voice Coach Effects for One Punch Man Challenge
 * Uses Web Audio API for crisp zero-latency synthesized sound effects
 * and SpeechSynthesis for real-time rep counting and motivational coaching.
 */

class SoundEffectsService {
  private audioCtx: AudioContext | null = null;
  public isMuted: boolean = false;
  public isVoiceEnabled: boolean = true;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Chime sound when +1 valid rep
  public playRepSuccess(repNumber?: number) {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Pleasant rising chime
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio play error:', e);
    }

    // Voice announcement of the rep count
    if (repNumber && this.isVoiceEnabled) {
      this.speakRep(repNumber);
    }
  }

  // Warning tone when posture / form is invalid
  public playFormWarning() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Fanfare when finishing workout or hitting milestone
  public playVictoryFanfare() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + idx * 0.12;

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } catch (e) {
      console.warn('Fanfare error:', e);
    }

    if (this.isVoiceEnabled) {
      this.speak("Xuất sắc! Bạn đã hoàn thành bài tập!");
    }
  }

  // Voice coach speaker
  public speak(text: string) {
    if (this.isMuted || !this.isVoiceEnabled) return;
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Cancel previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.1; // energetic
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }

  private speakRep(num: number) {
    if (!('speechSynthesis' in window)) return;
    let phrase = `${num}`;
    if (num === 10) phrase = "10! Rất tốt, tiếp tục phát huy!";
    else if (num === 25) phrase = "25! Giữ vững nhịp thở!";
    else if (num === 50) phrase = "50! Đã được nửa chặng đường!";
    else if (num === 100) phrase = "100! Thần thái Saitama xuất hiện!";
    this.speak(phrase);
  }
}

export const soundEffects = new SoundEffectsService();
