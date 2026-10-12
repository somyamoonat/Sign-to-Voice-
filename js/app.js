/**
 * app.js - Application Orchestrator for Real-Time ASL to Text & Voice
 */

import { GestureEngine } from './gesture_engine.js';
import { SentenceBuilder } from './sentence_builder.js';
import { SpeechEngine } from './speech_engine.js';
import { UIController } from './ui_controller.js';
import { ASL_SIGNS } from './asl_dictionary.js';

class SignApp {
  constructor() {
    this.viewportContainer = document.getElementById('viewportContainer');
    this.videoElement = document.getElementById('webcam');
    this.canvasElement = document.getElementById('hudCanvas');

    // UI Elements
    this.captionText = document.getElementById('captionText');
    this.placeholderText = document.getElementById('placeholderText');
    this.lastDetectedBadge = document.getElementById('lastDetectedBadge');
    this.historyList = document.getElementById('historyList');

    // Controls
    this.btnSpeak = document.getElementById('btnSpeak');
    this.btnClear = document.getElementById('btnClear');
    this.btnBackspace = document.getElementById('btnBackspace');
    this.btnMute = document.getElementById('btnMute');
    this.btnToggleVideo = document.getElementById('btnToggleVideo');
    this.btnResumeVideo = document.getElementById('btnResumeVideo');
    this.videoOffOverlay = document.getElementById('videoOffOverlay');
    this.btnFullscreen = document.getElementById('btnFullscreen');
    this.btnOverlayFullscreen = document.getElementById('btnOverlayFullscreen');
    this.btnClearHistory = document.getElementById('btnClearHistory');
    this.fpsText = document.getElementById('fpsText');
    this.latencyText = document.getElementById('latencyText');
    this.predictiveBar = document.getElementById('predictiveBar');
    this.voiceSelect = document.getElementById('voiceSelect');

    // Modals
    this.dictionaryModal = document.getElementById('dictionaryModal');
    this.btnDictionary = document.getElementById('btnDictionary');
    this.btnCloseDictionary = document.getElementById('btnCloseDictionary');
    this.dictionaryGrid = document.getElementById('dictionaryGrid');
    this.dictSearchInput = document.getElementById('dictSearchInput');
    this.dictCategoryFilters = document.getElementById('dictCategoryFilters');

    // Reference modal state
    this.activeDictCategory = 'all';
    this.activeDictSearch = '';

    // State
    this.autoSpeak = true;
    this.isVideoActive = true;
    this.cameraInstance = null;
    this.handsInstance = null;

    // Initialize Subsystems
    this.initEngines();
    this.bindEvents();
    this.renderDictionary();
  }

  initEngines() {
    // 1. Text to Speech with Accent and Voice Support
    this.speech = new SpeechEngine();
    this.speech.onVoicesLoaded = (voices) => {
      this.populateVoiceSelect(voices);
    };
    if (this.speech.voices && this.speech.voices.length > 0) {
      this.populateVoiceSelect(this.speech.voices);
    }

    // 2. Gesture Recognizer
    this.gestureEngine = new GestureEngine();

    // 3. Sentence Builder with Gboard Word Predictions
    this.sentenceBuilder = new SentenceBuilder({
      letterHoldMs: 420,
      phraseHoldMs: 350,
      onHoldProgress: (progress, gesture) => {
        this.ui.setHoldProgress(progress, gesture);
        if (gesture) {
          this.lastDetectedBadge.textContent = gesture.text;
          this.lastDetectedBadge.classList.add('visible');
        } else {
          this.lastDetectedBadge.classList.remove('visible');
        }
      },
      onPredictionsChanged: (predictions) => {
        this.renderPredictions(predictions);
      },
      onTokenCommitted: (token, formattedSentence, gesture) => {
        this.speech.playLockTone();
        this.updateCaptionUI(formattedSentence);

        if (this.autoSpeak && gesture.category === 'conversational') {
          const phrase = this.sentenceBuilder.formatNaturalGrammar(token);
          this.speech.speak(phrase);
        }
      }
    });

    // 4. UI & Canvas HUD Controller
    this.ui = new UIController({
      canvasElement: this.canvasElement,
      videoElement: this.videoElement,
      onMetricsUpdate: (fps, latencyMs) => {
        if (this.fpsText) this.fpsText.textContent = `${fps} FPS`;
        if (this.latencyText) this.latencyText.textContent = `${latencyMs}ms`;
      }
    });
  }

  bindEvents() {
    // Speak Button
    this.btnSpeak?.addEventListener('click', () => {
      const sentence = this.sentenceBuilder.getFormattedSentence();
      if (sentence) {
        this.speech.speak(sentence, { force: true });
        this.sentenceBuilder.finishSentence();
        this.updateCaptionUI('');
        this.updateHistoryUI();
      }
    });

    // Clear Button
    this.btnClear?.addEventListener('click', () => {
      this.sentenceBuilder.clear();
      this.updateCaptionUI('');
    });

    // Backspace Button
    this.btnBackspace?.addEventListener('click', () => {
      this.sentenceBuilder.backspace();
      this.updateCaptionUI(this.sentenceBuilder.getFormattedSentence());
    });

    // Video On/Off Toggle
    this.btnToggleVideo?.addEventListener('click', () => {
      this.toggleVideo();
    });

    this.btnResumeVideo?.addEventListener('click', () => {
      this.toggleVideo(true);
    });

    // Fullscreen Toggles
    this.btnFullscreen?.addEventListener('click', () => this.toggleFullscreen());
    this.btnOverlayFullscreen?.addEventListener('click', () => this.toggleFullscreen());

    const onFullscreenChange = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (this.viewportContainer) {
        this.viewportContainer.classList.toggle('is-fullscreen', isFs);
      }
      const fsLabel = isFs ? '✕ Exit Fullscreen' : '⛶ Fullscreen';
      if (this.btnFullscreen) this.btnFullscreen.textContent = fsLabel;
      if (this.btnOverlayFullscreen) this.btnOverlayFullscreen.textContent = isFs ? '✕' : '⛶';

      // Resize canvas to match video dimensions
      setTimeout(() => {
        const vw = this.videoElement.videoWidth || 640;
        const vh = this.videoElement.videoHeight || 480;
        this.canvasElement.width = vw;
        this.canvasElement.height = vh;
      }, 100);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    // Mute/Unmute Toggle
    this.btnMute?.addEventListener('click', () => {
      const isMuted = this.speech.toggleMute();
      this.btnMute.classList.toggle('muted', isMuted);
      this.btnMute.textContent = isMuted ? '🔇 Voice Off' : '🔊 Voice On';
    });

    // Clear History Button
    this.btnClearHistory?.addEventListener('click', () => {
      this.sentenceBuilder.history = [];
      this.updateHistoryUI();
    });

    // Dictionary Modal
    this.btnDictionary?.addEventListener('click', () => {
      this.dictionaryModal.classList.add('open');
      if (this.dictSearchInput) {
        setTimeout(() => this.dictSearchInput.focus(), 100);
      }
    });

    this.btnCloseDictionary?.addEventListener('click', () => {
      this.dictionaryModal.classList.remove('open');
    });

    // Close modal on backdrop click
    this.dictionaryModal?.addEventListener('click', (e) => {
      if (e.target === this.dictionaryModal) {
        this.dictionaryModal.classList.remove('open');
      }
    });

    // Category Filter Buttons
    this.dictCategoryFilters?.addEventListener('click', (e) => {
      const btn = e.target.closest('.dict-filter-btn');
      if (!btn) return;
      this.dictCategoryFilters.querySelectorAll('.dict-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.activeDictCategory = btn.dataset.category || 'all';
      this.renderDictionary(this.activeDictCategory, this.activeDictSearch);
    });

    // Search Input
    this.dictSearchInput?.addEventListener('input', (e) => {
      this.activeDictSearch = (e.target.value || '').trim().toLowerCase();
      this.renderDictionary(this.activeDictCategory, this.activeDictSearch);
    });

    // Voice & Accent Selection Change
    this.voiceSelect?.addEventListener('change', (e) => {
      const selectedUri = e.target.value;
      if (selectedUri) {
        this.speech.setVoice(selectedUri);
        // Play brief voice preview
        this.speech.speak('Voice accent set.', { force: true });
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.sentenceBuilder.addSpace();
        this.updateCaptionUI(this.sentenceBuilder.getFormattedSentence());
      } else if (e.code === 'Backspace') {
        this.sentenceBuilder.backspace();
        this.updateCaptionUI(this.sentenceBuilder.getFormattedSentence());
      } else if (e.code === 'Enter') {
        this.btnSpeak?.click();
      } else if (e.code === 'KeyF' && !e.metaKey && !e.ctrlKey) {
        this.toggleFullscreen();
      }
    });
  }

  populateVoiceSelect(voices) {
    if (!this.voiceSelect || !voices || voices.length === 0) return;

    // Group voices by accent / language
    const groups = {};
    for (const v of voices) {
      const accent = this.speech.getAccentLabel(v.lang);
      if (!groups[accent]) groups[accent] = [];
      groups[accent].push(v);
    }

    this.voiceSelect.innerHTML = '';

    // Prioritized order: US, UK, India, Australia, Canada, Ireland, others
    const priority = [
      '🇺🇸 US English',
      '🇬🇧 British English',
      '🇮🇳 Indian English',
      '🇦🇺 Australian English',
      '🇨🇦 Canadian English',
      '🇮🇪 Irish English'
    ];

    const sortedAccents = Object.keys(groups).sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    for (const accent of sortedAccents) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = accent;
      for (const v of groups[accent]) {
        const option = document.createElement('option');
        option.value = v.voiceURI;
        // Clean display name
        const cleanName = v.name
          .replace(/(Google|Microsoft|Apple)\s*/gi, '')
          .replace(/\s*\([^)]*\)/g, '')
          .trim() || v.name;
        option.textContent = cleanName;

        if (this.speech.selectedVoice && (this.speech.selectedVoice.voiceURI === v.voiceURI || this.speech.selectedVoice.name === v.name)) {
          option.selected = true;
        }
        optgroup.appendChild(option);
      }
      this.voiceSelect.appendChild(optgroup);
    }
  }

  toggleFullscreen() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFs) {
      const el = this.viewportContainer;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(err => console.warn('Fullscreen failed:', err));
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn('Exit fullscreen failed:', err));
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  async toggleVideo(enable) {
    const shouldEnable = typeof enable === 'boolean' ? enable : !this.isVideoActive;
    if (shouldEnable) {
      await this.startCamera();
    } else {
      await this.stopCamera();
    }
  }

  async startCamera() {
    this.isVideoActive = true;
    if (this.videoOffOverlay) this.videoOffOverlay.style.display = 'none';
    if (this.btnToggleVideo) {
      this.btnToggleVideo.textContent = '📹 Camera On';
      this.btnToggleVideo.classList.remove('muted');
    }

    try {
      if (typeof window.Camera !== 'undefined') {
        this.cameraInstance = new window.Camera(this.videoElement, {
          onFrame: async () => {
            if (this.handsInstance && this.isVideoActive && this.videoElement.readyState >= 2) {
              await this.handsInstance.send({ image: this.videoElement });
            }
          },
          width: 1280,
          height: 720
        });
        await this.cameraInstance.start();
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        this.videoElement.srcObject = stream;
        await this.videoElement.play();

        if (!this.frameLoopRunning) {
          this.frameLoopRunning = true;
          const processVideoFrame = async () => {
            if (this.videoElement && this.videoElement.readyState >= 2 && this.isVideoActive && this.handsInstance) {
              await this.handsInstance.send({ image: this.videoElement });
            }
            if (this.frameLoopRunning) {
              requestAnimationFrame(processVideoFrame);
            }
          };
          requestAnimationFrame(processVideoFrame);
        }
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
    }
  }

  async stopCamera() {
    this.isVideoActive = false;
    this.frameLoopRunning = false;

    // 1. Physically stop Camera instance if active
    if (this.cameraInstance) {
      try {
        await this.cameraInstance.stop();
      } catch (err) {
        console.warn('cameraInstance.stop error:', err);
      }
      this.cameraInstance = null;
    }

    // 2. Physically release all hardware MediaStreamTracks so the MacBook green LED shuts off
    const stream = this.videoElement.srcObject;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          console.warn('Track stop error:', err);
        }
      });
      this.videoElement.srcObject = null;
    }

    // 3. Clear canvas & hide detection badge
    if (this.canvasElement) {
      const ctx = this.canvasElement.getContext('2d');
      ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    if (this.videoOffOverlay) this.videoOffOverlay.style.display = 'flex';
    if (this.btnToggleVideo) {
      this.btnToggleVideo.textContent = '📹 Camera Off';
      this.btnToggleVideo.classList.add('muted');
    }
    if (this.lastDetectedBadge) {
      this.lastDetectedBadge.classList.remove('visible');
    }
  }

  renderPredictions(predictions) {
    if (!this.predictiveBar) return;
    this.predictiveBar.innerHTML = '';
    if (!predictions || predictions.length === 0) return;

    predictions.forEach((word, idx) => {
      const chip = document.createElement('button');
      chip.className = `predictive-chip ${idx === 0 ? 'top-match' : ''}`;
      chip.textContent = word;
      chip.title = `Auto-complete "${word}" (or hold Space)`;
      chip.addEventListener('click', () => {
        this.sentenceBuilder.acceptPrediction(word);
        this.updateCaptionUI(this.sentenceBuilder.getFormattedSentence());
      });
      this.predictiveBar.appendChild(chip);
    });
  }

  updateCaptionUI(text) {
    if (!this.captionText) return;
    const hasText = text && text.trim().length > 0;
    this.captionText.textContent = text || '';
    if (this.placeholderText) {
      this.placeholderText.style.display = hasText ? 'none' : 'inline';
    }
  }

  updateHistoryUI() {
    if (!this.historyList) return;
    const history = this.sentenceBuilder.getHistory();
    this.historyList.innerHTML = '';

    if (history.length === 0) {
      this.historyList.innerHTML = '<div class="empty-state">Spoken sentences will be recorded here for reference.</div>';
      return;
    }

    history.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div class="history-content">
          <p class="history-text">"${item.text}"</p>
          <span class="history-time">${item.timestamp}</span>
        </div>
        <button class="btn-replay" title="Replay">🔊</button>
      `;
      el.querySelector('.btn-replay').addEventListener('click', () => {
        this.speech.speak(item.text, { force: true });
      });
      this.historyList.appendChild(el);
    });
  }

  renderDictionary(category = 'all', searchQuery = '') {
    if (!this.dictionaryGrid) return;
    this.dictionaryGrid.innerHTML = '';

    const query = searchQuery.trim().toLowerCase();

    const filtered = ASL_SIGNS.filter((sign) => {
      // Category filter
      const matchesCategory = category === 'all' || 
        sign.category.toLowerCase() === category.toLowerCase() ||
        (category === 'Alphabet' && sign.category === 'Alphabet') ||
        (category === 'Numbers' && sign.category === 'Numbers');

      if (!matchesCategory) return false;

      // Text query filter
      if (!query) return true;
      return sign.name.toLowerCase().includes(query) ||
             (sign.description && sign.description.toLowerCase().includes(query)) ||
             (sign.tips && sign.tips.toLowerCase().includes(query)) ||
             (sign.badge && sign.badge.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
      this.dictionaryGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 2.5rem 1rem; text-align: center; color: var(--text-muted);">
          <p style="font-size: 1.1rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 0.25rem;">No matching gestures found</p>
          <p style="font-size: 0.8rem;">Try searching for another letter, word, or sign name.</p>
        </div>
      `;
      return;
    }

    filtered.forEach((sign) => {
      const card = document.createElement('div');
      card.className = 'dict-card';
      card.innerHTML = `
        <div class="dict-card-header">
          <span class="dict-icon" title="${sign.name} Symbol">${sign.icon}</span>
          <span class="dict-badge">${sign.badge || sign.category}</span>
        </div>
        <h4 class="dict-name">${sign.name}</h4>
        <p class="dict-desc">${sign.description}</p>
        <div class="dict-instruction-box">
          <span class="instruction-tag">HOW TO DO IT</span>
          <span class="instruction-text">${sign.tips}</span>
        </div>
      `;
      this.dictionaryGrid.appendChild(card);
    });
  }

  setStatus(text, state) {
    // Safe no-op for status changes
  }

  /**
   * Start MediaPipe Hands and Camera
   */
  async start() {
    try {
      if (typeof window.Hands === 'undefined') {
        throw new Error('MediaPipe Hands library not loaded from CDN.');
      }

      this.handsInstance = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.handsInstance.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.65
      });

      this.handsInstance.onResults((results) => {
        const t0 = performance.now();

        // 1. Ensure canvas internal resolution perfectly matches webcam video resolution
        if (this.videoElement.videoWidth > 0 &&
           (this.canvasElement.width !== this.videoElement.videoWidth ||
            this.canvasElement.height !== this.videoElement.videoHeight)) {
          this.canvasElement.width = this.videoElement.videoWidth;
          this.canvasElement.height = this.videoElement.videoHeight;
        }

        // 2. Safe gesture classification
        try {
          const gesture = this.gestureEngine.classify(results);
          this.sentenceBuilder.processDetection(gesture);
        } catch (err) {
          console.error('Error during gesture classification:', err);
        }

        // 3. Safe canvas skeleton and landmark rendering
        try {
          this.ui.renderFrame(results);
        } catch (err) {
          console.error('Error during canvas rendering:', err);
        }

        const t1 = performance.now();
        this.ui.updateMetrics(t1 - t0);
      });

      const updateCanvasSize = () => {
        const vw = this.videoElement.videoWidth || 640;
        const vh = this.videoElement.videoHeight || 480;
        this.canvasElement.width = vw;
        this.canvasElement.height = vh;
      };

      this.videoElement.addEventListener('loadedmetadata', updateCanvasSize);

      await this.startCamera();
      this.updateCaptionUI('');
    } catch (err) {
      console.error('Failed to initialize webcam or MediaPipe:', err);
    }
  }
}

// Auto-launch when page DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new SignApp();
  app.start();
  window.signApp = app;
});
