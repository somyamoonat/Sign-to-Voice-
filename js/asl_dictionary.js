/**
 * asl_dictionary.js - Curated Reference Database for High-Accuracy Conversational Signs & Controls
 */

export const ASL_SIGNS = [
  // Conversational Gestures
  {
    name: 'HELLO',
    category: 'Conversational',
    badge: 'Dynamic',
    description: 'Open hand with all fingers extended, waving gently side to side.',
    icon: '👋',
    tips: 'Wave your open palm side-to-side across the camera.'
  },
  {
    name: 'THANK YOU',
    category: 'Conversational',
    badge: 'Dynamic',
    description: 'Flat open hand near chin, moving smoothly forward and slightly downward.',
    icon: '🙏',
    tips: 'Move flat palm forward from chin towards the camera.'
  },
  {
    name: 'I LOVE YOU',
    category: 'Conversational',
    badge: 'Iconic',
    description: 'Thumb, Index, and Pinky extended outward; Middle and Ring fingers curled down.',
    icon: '🤟',
    tips: 'Combine I, L, and Y fingers into one single iconic sign.'
  },
  {
    name: 'FUCK YOU',
    category: 'Conversational',
    badge: 'Expressive',
    description: 'Middle finger extended upright with all other fingers curled tightly into a closed fist.',
    icon: '🖕',
    tips: 'Hold your fist closed and extend only your middle finger straight up.'
  },
  {
    name: 'YES',
    category: 'Conversational',
    badge: 'Dynamic',
    description: 'Closed fist bobbing up and down gently like a nodding head.',
    icon: '✊',
    tips: 'Make a fist and nod it vertically twice.'
  },
  {
    name: 'NO',
    category: 'Conversational',
    badge: 'Two-Hand',
    description: 'Cross index fingers of both hands to form an "X" cross.',
    icon: '❌',
    tips: 'Extend index fingers on both hands and cross them like an X.'
  },
  {
    name: 'PLEASE',
    category: 'Conversational',
    badge: 'Static',
    description: 'Thumb and pinky finger extended outward, middle three fingers curled in.',
    icon: '🤙',
    tips: 'Extend thumb and pinky finger (shaka / phone sign) for Please.'
  },
  {
    name: 'SORRY',
    category: 'Conversational',
    badge: 'Dynamic',
    description: 'Index finger extended, hovering/wagging side-to-side (right and left).',
    icon: '☝️',
    tips: 'Point index finger up and hover/wag it right and left for Sorry.'
  },
  {
    name: 'GOOD',
    category: 'Conversational',
    badge: 'Static',
    description: 'Thumbs up gesture with thumb pointing straight upward.',
    icon: '👍',
    tips: 'Closed fist with thumb extended vertically.'
  },
  {
    name: 'BAD',
    category: 'Conversational',
    badge: 'Static',
    description: 'Thumbs down gesture with thumb pointing straight downward.',
    icon: '👎',
    tips: 'Closed fist with thumb pointing down.'
  },
  {
    name: 'OK',
    category: 'Conversational',
    badge: 'Static',
    description: 'Thumb and index finger touching in a circle; middle, ring, pinky straight.',
    icon: '👌',
    tips: 'Pinch index and thumb into a ring with 3 fingers up.'
  },
  {
    name: 'HELP',
    category: 'Conversational',
    badge: 'Two-Hand',
    description: 'One flat palm facing upward with a thumbs-up fist placed on top.',
    icon: '🤝',
    tips: 'Rest a thumbs-up fist atop a flat open palm.'
  },
  {
    name: 'STOP',
    category: 'Conversational',
    badge: 'Two-Hand / Single',
    description: 'Flat vertical open palm facing camera or one flat hand chopping onto flat palm.',
    icon: '🛑',
    tips: 'Hold open hand vertical facing camera or chop into palm.'
  },
  {
    name: 'WATER',
    category: 'Conversational',
    badge: 'Static',
    description: 'W handshape held near chin or lower lip.',
    icon: '💧',
    tips: 'Form letter W (3 middle fingers upright) near chin.'
  },
  {
    name: 'EXCELLENT',
    category: 'Conversational',
    badge: 'Two-Hand',
    description: 'Two thumbs up held side by side.',
    icon: '🌟',
    tips: 'Give two thumbs up to the camera.'
  },

  // Practical Controls
  {
    name: 'SPACE',
    category: 'Controls',
    badge: 'Action',
    description: 'Flat open palm held horizontally.',
    icon: '␣',
    tips: 'Turn open hand sideways to insert a space.'
  },
  {
    name: 'BACKSPACE',
    category: 'Controls',
    badge: 'Action',
    description: 'Hand swipe horizontally to the left.',
    icon: '⌫',
    tips: 'Swipe hand swiftly left to instantly erase previous word.'
  }
];
