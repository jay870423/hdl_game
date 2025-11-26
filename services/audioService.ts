
// A simple Web Audio API wrapper for 8-bit retro sounds

class AudioService {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  isMuted: boolean = false;
  bgmInterval: number | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3; // Default volume
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
    }
    return this.isMuted;
  }

  // --- Sound Synthesis ---

  playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  playNoise(duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    // Simple Lowpass filter for explosion thud
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start();
  }

  // --- SFX Presets ---

  shoot() {
    // Short high pitch drop
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  jump() {
    if (!this.ctx) return;
    // Rising tone
    this.playTone(150, 'square', 0.2);
    // Actually slide the pitch manually for better effect
    if(this.ctx) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
  }

  explode() {
    this.playNoise(0.3);
  }

  bossHit() {
    this.playTone(100, 'sawtooth', 0.1);
  }

  powerup() {
    // Fanfare
    [440, 554, 659, 880].forEach((f, i) => {
      this.playTone(f, 'square', 0.1, i * 0.1);
    });
  }

  // --- Music (Simple Sequencer) ---
  
  startBGM(level: number) {
    this.stopBGM();
    if (!this.ctx) return;
    
    const tempo = 150 + (level * 10); // Faster per level
    const interval = 60 / tempo * 1000 / 2; // 8th notes
    
    // Basslines
    const baseFreq = level % 2 === 0 ? 110 : 82; // A or E
    let step = 0;
    
    this.bgmInterval = window.setInterval(() => {
        if (!this.ctx || this.isMuted) return;

        // Bass
        if (step % 2 === 0) {
           const f = step % 8 === 0 ? baseFreq : baseFreq * 1.5;
           this.playTone(f, 'triangle', 0.1);
        }
        
        // Hi-hat noise
        if (step % 4 === 2) {
            // this.playNoise(0.05); // High freq noise hard to do simply, skip to save cpu
        }

        // Melody (Sparse)
        if (step % 16 === 0) {
            this.playTone(baseFreq * 4, 'square', 0.1);
        }

        step++;
    }, interval);
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const audio = new AudioService();
