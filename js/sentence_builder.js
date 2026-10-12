/**
 * sentence_builder.js - Stabilizer, Debounce Buffer & Predictive Text Assembler
 * Emulates Google Keyboard (Gboard) by predicting full words rather than raw letter spam.
 */

import { WordPredictor } from './word_predictor.js';

export class SentenceBuilder {
  constructor({
    letterHoldMs = 420,
    phraseHoldMs = 350,
    onTokenCommitted = null,
    onHoldProgress = null,
    onPredictionsChanged = null
  } = {}) {
    this.letterHoldMs = letterHoldMs;
    this.phraseHoldMs = phraseHoldMs;
    this.onTokenCommitted = onTokenCommitted;
    this.onHoldProgress = onHoldProgress;
    this.onPredictionsChanged = onPredictionsChanged;

    this.predictor = new WordPredictor();

    // Holding state
    this.currentCandidate = null;
    this.candidateStartTime = 0;
    this.lastSeenTime = 0;
    this.lastCommittedToken = null;
    this.lastCommitTime = 0;
    this.lastBackspaceTime = 0;
    this.suppressLettersUntil = 0;

    // Text state
    this.currentWord = '';
    this.fullSentence = '';
    this.history = [];
    this.currentPredictions = [];
  }

  /**
   * Process incoming frame classification
   */
  processDetection(gesture) {
    const now = performance.now();

    if (!gesture) {
      // Allow a 160ms grace window for camera jitter / single dropped frame
      if (this.currentCandidate && (now - this.lastSeenTime > 160)) {
        this.currentCandidate = null;
        if (this.onHoldProgress) this.onHoldProgress(0, null);
        this.lastCommittedToken = null;
      }
      return;
    }

    // Immediate action for BACKSPACE swipe: execute immediately with 380ms debounce
    if (gesture.text === 'BACKSPACE') {
      if (now - this.lastBackspaceTime > 380) {
        this.lastBackspaceTime = now;
        this.commitToken(gesture);
        if (this.onHoldProgress) {
          this.onHoldProgress(1.0, gesture);
          setTimeout(() => {
            if (this.onHoldProgress) this.onHoldProgress(0, null);
          }, 200);
        }
      }
      return;
    }

    // Suppress random letters right after completing a conversational gesture
    if (gesture.category === 'alphabet' && now < this.suppressLettersUntil) {
      if (this.currentCandidate) {
        this.currentCandidate = null;
        if (this.onHoldProgress) this.onHoldProgress(0, null);
      }
      return;
    }

    // Required hold time
    const requiredHold = gesture.category === 'alphabet' ? this.letterHoldMs : this.phraseHoldMs;

    // If same gesture continues
    if (this.currentCandidate && this.currentCandidate.text === gesture.text) {
      this.lastSeenTime = now;
      const elapsed = now - this.candidateStartTime;
      const progress = Math.min(1.0, elapsed / requiredHold);

      if (this.onHoldProgress) {
        this.onHoldProgress(progress, gesture);
      }

      if (elapsed >= requiredHold) {
        if (this.lastCommittedToken !== gesture.text) {
          this.commitToken(gesture);
          this.lastCommittedToken = gesture.text;
          this.lastCommitTime = now;
        }
      }
    } else {
      // New gesture candidate started
      this.currentCandidate = gesture;
      this.candidateStartTime = now;
      this.lastSeenTime = now;
      if (this.onHoldProgress) {
        this.onHoldProgress(0.08, gesture);
      }
    }
  }

  /**
   * Commit verified gesture
   */
  commitToken(gesture) {
    const token = gesture.text;
    const now = performance.now();

    if (token === 'BACKSPACE') {
      this.backspace();
    } else if (token === 'SPACE') {
      this.addSpace();
    } else if (token === 'CLEAR') {
      this.clear();
    } else if (gesture.category === 'conversational') {
      // Conversational phrases are committed as full words
      if (this.currentWord.length > 0) {
        this.fullSentence = this.fullSentence.slice(0, -this.currentWord.length);
        this.currentWord = '';
      }

      if (this.fullSentence.length > 0 && !this.fullSentence.endsWith(' ')) {
        this.fullSentence += ' ';
      }
      this.fullSentence += token;
      this.currentWord = '';
      this.updatePredictions();
    } else {
      // Direct words/controls
      if (this.fullSentence.length > 0 && !this.fullSentence.endsWith(' ')) {
        this.fullSentence += ' ';
      }
      this.fullSentence += token;
      this.currentWord = '';
      this.updatePredictions();
    }

    if (this.onTokenCommitted) {
      this.onTokenCommitted(token, this.getFormattedSentence(), gesture);
    }
  }

  updatePredictions() {
    if (this.currentWord.length > 0) {
      this.currentPredictions = this.predictor.getPredictions(this.currentWord, 3);
    } else {
      this.currentPredictions = [];
    }

    if (this.onPredictionsChanged) {
      this.onPredictionsChanged(this.currentPredictions);
    }
  }

  /**
   * Accept a predicted word from Google-style prediction bar
   */
  acceptPrediction(word) {
    if (!word) return;

    if (this.currentWord.length > 0) {
      // Replace the partial prefix with the completed word
      this.fullSentence = this.fullSentence.slice(0, -this.currentWord.length);
    }

    if (this.fullSentence.length > 0 && !this.fullSentence.endsWith(' ')) {
      this.fullSentence += ' ';
    }

    this.fullSentence += word;
    this.currentWord = '';
    this.updatePredictions();

    if (this.onTokenCommitted) {
      this.onTokenCommitted(word, this.getFormattedSentence(), { category: 'conversational' });
    }
  }

  addSpace() {
    // If user has a typed prefix and there is a top prediction, auto-complete it on space!
    if (this.currentWord.length > 0 && this.currentPredictions.length > 0) {
      this.acceptPrediction(this.currentPredictions[0]);
      return;
    }

    if (this.fullSentence.length > 0 && !this.fullSentence.endsWith(' ')) {
      this.fullSentence += ' ';
    }
    this.currentWord = '';
    this.updatePredictions();
  }

  backspace() {
    if (this.fullSentence.length > 0) {
      this.fullSentence = this.fullSentence.slice(0, -1);
      const lastSpaceIndex = this.fullSentence.lastIndexOf(' ');
      if (lastSpaceIndex !== -1) {
        this.currentWord = this.fullSentence.slice(lastSpaceIndex + 1);
      } else {
        this.currentWord = this.fullSentence;
      }
      this.updatePredictions();
    }
  }

  clear() {
    this.fullSentence = '';
    this.currentWord = '';
    this.updatePredictions();
  }

  getRawSentence() {
    return this.fullSentence;
  }

  getFormattedSentence() {
    if (!this.fullSentence || this.fullSentence.trim().length === 0) {
      return '';
    }

    let text = this.fullSentence.trim();
    text = text.charAt(0).toUpperCase() + text.slice(1);
    return text;
  }

  finishSentence() {
    const sentence = this.getFormattedSentence();
    if (sentence) {
      this.history.unshift({
        text: sentence,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      this.clear();
      return sentence;
    }
    return '';
  }

  getHistory() {
    return this.history;
  }

  formatNaturalGrammar(rawText) {
    if (!rawText) return '';
    let text = rawText.trim();

    const phraseMap = {
      'HELLO': 'Hello!',
      'THANK YOU': 'Thank you!',
      'I LOVE YOU': 'I love you!',
      'FUCK YOU': 'Fuck you!',
      'OK': 'Okay!',
      'HELP': 'I need help, please.',
      'PLEASE': 'Please.',
      'YES': 'Yes, absolutely.',
      'NO': 'No, thank you.',
      'GOOD': 'Good.',
      'BAD': 'Bad.',
      'STOP': 'Please stop.',
      'WATER': 'Can I have some water?',
      'SORRY': 'I am sorry.',
      'EXCELLENT': 'Excellent!'
    };

    if (phraseMap[text.toUpperCase()]) {
      return phraseMap[text.toUpperCase()];
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
