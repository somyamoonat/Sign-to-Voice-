/**
 * speech_engine.js - Text-to-Speech (TTS) & Audio Feedback
 * Built on the browser Web Speech API for zero latency and offline capability.
 */

export class SpeechEngine {
  constructor(options = {}) {
    this.synth = window.speechSynthesis || null;
    this.voices = [];
    this.selectedVoice = null;
    this.rate = options.rate || 1.0;
    this.pitch = options.pitch || 1.0;
    this.volume = options.volume || 1.0;
    this.isMuted = false;
    this.isSpeaking = false;

    // Callbacks for visualizer & UI state
    this.onStartSpeaking = null;
    this.onEndSpeaking = null;

    this.onVoicesLoaded = null;

    // Web Audio Context for UI audio cues (chimes)
    this.audioCtx = null;

    this.initVoices();
  }

  getAccentLabel(lang) {
    if (!lang) return '🌐 Other';
    const l = lang.toLowerCase();
    if (l.startsWith('en-us')) return '🇺🇸 US English';
    if (l.startsWith('en-gb')) return '🇬🇧 British English';
    if (l.startsWith('en-in')) return '🇮🇳 Indian English';
    if (l.startsWith('en-au')) return '🇦🇺 Australian English';
    if (l.startsWith('en-ca')) return '🇨🇦 Canadian English';
    if (l.startsWith('en-ie')) return '🇮🇪 Irish English';
    if (l.startsWith('en-za')) return '🇿🇦 South African English';
    if (l.startsWith('en-nz')) return '🇳🇿 New Zealand English';
    if (l.startsWith('en')) return '🌐 English';
    if (l.startsWith('hi')) return '🇮🇳 Hindi';
    if (l.startsWith('es')) return '🇪🇸 Spanish';
    if (l.startsWith('fr')) return '🇫🇷 French';
    if (l.startsWith('de')) return '🇩🇪 German';
    if (l.startsWith('ja')) return '🇯🇵 Japanese';
    return `🌐 ${lang}`;
  }

  initVoices() {
    if (!this.synth) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      return;
    }

    const loadVoices = () => {
      this.voices = this.synth.getVoices();
      if (!this.voices || this.voices.length === 0) return;

      const savedURI = localStorage.getItem('signpulse_voice');
      if (savedURI) {
        this.selectedVoice = this.voices.find(v => v.voiceURI === savedURI || v.name === savedURI) || null;
      }

      if (!this.selectedVoice) {
        // Prefer natural voices
        this.selectedVoice = this.voices.find(v =>
          (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Daniel') || v.name.includes('Rishi')) &&
          v.lang.startsWith('en')
        ) || this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
      }

      if (typeof this.onVoicesLoaded === 'function') {
        this.onVoicesLoaded(this.voices);
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  getAvailableVoices() {
    return this.voices;
  }

  setVoice(voiceURI) {
    const v = this.voices.find(item => item.voiceURI === voiceURI || item.name === voiceURI);
    if (v) {
      this.selectedVoice = v;
      try {
        localStorage.setItem('signpulse_voice', voiceURI);
      } catch (err) {}
    }
  }

  speak(text, { force = false } = {}) {
    if (!this.synth || this.isMuted || !text || text.trim() === '') {
      return;
    }

    if (this.synth.speaking && !force) {
      // Don't interrupt unless force requested
      return;
    }

    if (this.synth.speaking && force) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text.trim());
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (typeof this.onStartSpeaking === 'function') {
        this.onStartSpeaking(text);
      }
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (typeof this.onEndSpeaking === 'function') {
        this.onEndSpeaking();
      }
    };

    utterance.onerror = (e) => {
      console.error('TTS Utterance Error:', e);
      this.isSpeaking = false;
      if (typeof this.onEndSpeaking === 'function') {
        this.onEndSpeaking();
      }
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      if (typeof this.onEndSpeaking === 'function') {
        this.onEndSpeaking();
      }
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.stop();
    return this.isMuted;
  }

  /**
   * Play modern synthetic audio feedback (recognition lock-in chime)
   */
  playLockTone() {
    if (this.isMuted) return;
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      // Pleasant double chirp
      const now = this.audioCtx.currentTime;
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      // AudioContext policy fallback
    }
  }
}
