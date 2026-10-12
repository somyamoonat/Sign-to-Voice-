/**
 * word_predictor.js - Google Keyboard Style Predictive Text Engine
 * Predicts full words from fingerspelled prefix tokens.
 */

export const COMMON_VOCABULARY = [
  // High-frequency ASL & English conversational words
  'HELLO', 'HELP', 'HOW', 'HAVE', 'HERE', 'HEAR', 'HOME', 'HAPPY', 'HARD',
  'THANK', 'THANKS', 'TIME', 'THAT', 'THIS', 'THE', 'THEY', 'THERE', 'TODAY', 'TALK',
  'YES', 'YOU', 'YOUR', 'YEAR',
  'NO', 'NAME', 'NEED', 'NICE', 'NOT', 'NOW', 'NEW',
  'PLEASE', 'PEOPLE', 'PEACE', 'PROBLEM', 'PLAY',
  'WHAT', 'WHEN', 'WHERE', 'WHY', 'WHO', 'WHICH', 'WATER', 'WANT', 'WELCOME', 'WORK', 'WITH',
  'GOOD', 'GREAT', 'GO', 'GIRL', 'GIVE',
  'I', 'IS', 'IT', 'IN', 'IF', 'IMPORTANT',
  'ME', 'MY', 'MORE', 'MAN', 'MAKE', 'MUCH',
  'FINE', 'FRIEND', 'FOOD', 'FOR', 'FROM', 'FEEL', 'FAMILY',
  'LOVE', 'LIKE', 'LOOK', 'LEARN', 'LIFE', 'LITTLE',
  'SEE', 'SORRY', 'STOP', 'SIGN', 'START', 'STAY', 'SOME',
  'CAN', 'COME', 'CALL', 'CARE',
  'DO', 'DID', 'DOCTOR', 'DEAF', 'DAY', 'DOWN',
  'ALL', 'ABOUT', 'AFTER', 'AGAIN', 'ANY', 'ARE', 'ASK', 'AT',
  'BE', 'BECAUSE', 'BEFORE', 'BIG', 'BEST', 'BUT', 'BY',
  'OK', 'ONE', 'OUR', 'OUT', 'OVER',
  'VERY', 'VOICE',
  'WAIT', 'WELL', 'WILL', 'WOULD'
];

export class WordPredictor {
  constructor(vocabulary = COMMON_VOCABULARY) {
    this.vocabulary = vocabulary;
    // Map of common sign glosses / phrases
    this.phraseShortcuts = {
      'TY': 'THANK YOU',
      'THX': 'THANKS',
      'PLS': 'PLEASE',
      'ILY': 'I LOVE YOU',
      'GM': 'GOOD MORNING',
      'GN': 'GOOD NIGHT'
    };
  }

  /**
   * Return top word predictions matching the prefix (case-insensitive)
   */
  getPredictions(prefix, maxResults = 3) {
    if (!prefix || prefix.trim().length === 0) {
      // Default common quick starters
      return ['HELLO', 'HOW', 'THANK YOU'];
    }

    const cleanPrefix = prefix.trim().toUpperCase();

    // Check shortcuts first
    if (this.phraseShortcuts[cleanPrefix]) {
      return [this.phraseShortcuts[cleanPrefix]];
    }

    // Exact matches first, then prefix matches, sorted by word length
    const exact = this.vocabulary.filter(w => w === cleanPrefix);
    const prefixMatches = this.vocabulary.filter(w => w.startsWith(cleanPrefix) && w !== cleanPrefix);

    prefixMatches.sort((a, b) => a.length - b.length);

    const combined = [...exact, ...prefixMatches];
    return combined.slice(0, maxResults);
  }

  /**
   * Return whether the given string is a recognized complete word
   */
  isValidWord(word) {
    if (!word) return false;
    return this.vocabulary.includes(word.trim().toUpperCase());
  }
}
