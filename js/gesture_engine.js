/**
 * gesture_engine.js - Real-time ASL (American Sign Language) Conversational Classifier
 * Supports:
 * - Dynamic Conversational Signs: HELLO, THANK YOU, YES, NO, SORRY
 * - Two-Hand Signs: NO (Crossed index fingers), HELP, EXCELLENT, STOP
 * - Single-Hand Conversational Signs: OK, FUCK YOU, I LOVE YOU, GOOD, BAD, PLEASE, WATER, STOP
 * - Practical Controls: SPACE, BACKSPACE
 */

import {
  distance3D,
  distance2D,
  getVector,
  angleBetweenVectors,
  getPalmScale,
  getHandCentroid,
  analyzeFingers
} from './landmarks.js';

export class GestureEngine {
  constructor() {
    // Temporal buffer for movement/dynamic recognition (last 30 frames)
    this.motionHistory = [];
    this.maxHistoryLength = 30;

    // Last registered gesture timestamp to debounce
    this.lastDetection = null;

    // Words-Only mode: only recognize conversational words & phrases, preventing random single letters (D, C, etc.)
    this.wordsOnly = true;
  }

  /**
   * Push current frame to temporal buffer
   */
  updateHistory(landmarks, handedness = 'Right') {
    const now = performance.now();
    const centroid = getHandCentroid(landmarks);
    const wrist = landmarks[0];
    const indexTip = landmarks[8];

    this.motionHistory.push({
      timestamp: now,
      centroid,
      wrist: { x: wrist.x, y: wrist.y, z: wrist.z || 0 },
      indexTip: { x: indexTip.x, y: indexTip.y, z: indexTip.z || 0 },
      handedness
    });

    if (this.motionHistory.length > this.maxHistoryLength) {
      this.motionHistory.shift();
    }
  }

  /**
   * Analyze motion dynamics (velocity, oscillation, direction)
   */
  computeMotionDynamics() {
    if (this.motionHistory.length < 8) {
      return { vx: 0, vy: 0, vz: 0, oscillationsX: 0, oscillationsY: 0, totalDisplacement: 0 };
    }

    const n = this.motionHistory.length;
    const first = this.motionHistory[0];
    const last = this.motionHistory[n - 1];
    const dt = (last.timestamp - first.timestamp) / 1000; // seconds

    if (dt <= 0) return { vx: 0, vy: 0, vz: 0, oscillationsX: 0, oscillationsY: 0, totalDisplacement: 0 };

    const vx = (last.centroid.x - first.centroid.x) / dt;
    const vy = (last.centroid.y - first.centroid.y) / dt;
    const vz = (last.centroid.z - first.centroid.z) / dt;

    // Count direction reversals in X (waving)
    let reversalsX = 0;
    let reversalsY = 0;
    let prevDiffX = 0;
    let prevDiffY = 0;

    for (let i = 1; i < n; i++) {
      const dx = this.motionHistory[i].centroid.x - this.motionHistory[i - 1].centroid.x;
      const dy = this.motionHistory[i].centroid.y - this.motionHistory[i - 1].centroid.y;

      if (Math.abs(dx) > 0.008) {
        if (prevDiffX !== 0 && Math.sign(dx) !== Math.sign(prevDiffX)) {
          reversalsX++;
        }
        prevDiffX = dx;
      }

      if (Math.abs(dy) > 0.008) {
        if (prevDiffY !== 0 && Math.sign(dy) !== Math.sign(prevDiffY)) {
          reversalsY++;
        }
        prevDiffY = dy;
      }
    }

    // Count index tip direction reversals in X (wagging/hovering index finger right and left)
    let indexReversalsX = 0;
    let prevIndexDiffX = 0;

    for (let i = 1; i < n; i++) {
      const idxDx = this.motionHistory[i].indexTip.x - this.motionHistory[i - 1].indexTip.x;
      if (Math.abs(idxDx) > 0.005) {
        if (prevIndexDiffX !== 0 && Math.sign(idxDx) !== Math.sign(prevIndexDiffX)) {
          indexReversalsX++;
        }
        prevIndexDiffX = idxDx;
      }
    }

    const totalDisplacement = Math.hypot(
      last.centroid.x - first.centroid.x,
      last.centroid.y - first.centroid.y
    );

    return {
      vx, vy, vz,
      oscillationsX: reversalsX,
      oscillationsY: reversalsY,
      indexOscillationsX: indexReversalsX,
      totalDisplacement
    };
  }

  /**
   * Main classifier for a single or double hand result
   */
  classify(results) {
    if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return null;
    }

    const numHands = results.multiHandLandmarks.length;
    const primaryLandmarks = results.multiHandLandmarks[0];
    const handedness = results.multiHandedness && results.multiHandedness[0]
      ? results.multiHandedness[0].label
      : 'Right';

    this.updateHistory(primaryLandmarks, handedness);
    const motion = this.computeMotionDynamics();

    // Check two-handed signs first (e.g., HELP)
    if (numHands >= 2) {
      const twoHandSign = this.classifyTwoHands(results.multiHandLandmarks);
      if (twoHandSign) return twoHandSign;
    }

    // Dynamic motion gestures
    const dynamicSign = this.classifyDynamicSigns(primaryLandmarks, motion);
    if (dynamicSign) return dynamicSign;

    // Only suppress static letters during rapid fast swipes (speed > 1.2)
    const speed = Math.hypot(motion.vx, motion.vy);
    if (speed > 1.2) {
      return null;
    }

    // Static ASL signs & letters
    return this.classifyStaticSigns(primaryLandmarks, handedness);
  }

  /**
   * Two-handed conversational gestures
   */
  classifyTwoHands(handsList) {
    const hand1 = handsList[0];
    const hand2 = handsList[1];

    const f1 = analyzeFingers(hand1);
    const f2 = analyzeFingers(hand2);

    // NO (Two-Hand): 2 fingers of different hands crossed to form an "X"
    const isHand1IndexExtended = f1.index.isExtended && (!f1.pinky.isExtended || f1.pinky.isCurled);
    const isHand2IndexExtended = f2.index.isExtended && (!f2.pinky.isExtended || f2.pinky.isCurled);

    if (isHand1IndexExtended && isHand2IndexExtended) {
      const avgScale = (f1.scale + f2.scale) / 2;
      const tip1 = hand1[8];
      const tip2 = hand2[8];
      const pip1 = hand1[6];
      const pip2 = hand2[6];
      const dip1 = hand1[7];
      const dip2 = hand2[7];

      const distTips = distance3D(tip1, tip2) / avgScale;
      const distDips = distance3D(dip1, dip2) / avgScale;
      const distCross1 = distance3D(tip1, pip2) / avgScale;
      const distCross2 = distance3D(tip2, pip1) / avgScale;
      const distCross3 = distance3D(tip1, dip2) / avgScale;
      const distCross4 = distance3D(tip2, dip1) / avgScale;
      const minDistance = Math.min(distTips, distDips, distCross1, distCross2, distCross3, distCross4);

      const v1 = getVector(hand1[5], hand1[8]);
      const v2 = getVector(hand2[5], hand2[8]);
      const crossAngle = angleBetweenVectors(v1, v2);

      // Two fingers crossing / intersecting at an angle
      if (minDistance < 0.70 && crossAngle > 20 && crossAngle < 165) {
        return {
          text: 'NO',
          category: 'conversational',
          confidence: 0.98,
          description: 'Two hands: 2 fingers of different hands crossed in an X (No)'
        };
      }
    }

    // HELP gesture: One hand is a flat base palm, other hand is a thumbs-up on top moving up
    const isHand1FlatBase = f1.index.isExtended && f1.middle.isExtended && f1.ring.isExtended && f1.pinky.isExtended;
    const isHand2ThumbUp = f2.thumb.isUp && f2.index.isCurled && f2.middle.isCurled && f2.ring.isCurled && f2.pinky.isCurled;

    const isHand2FlatBase = f2.index.isExtended && f2.middle.isExtended && f2.ring.isExtended && f2.pinky.isExtended;
    const isHand1ThumbUp = f1.thumb.isUp && f1.index.isCurled && f1.middle.isCurled && f1.ring.isCurled && f1.pinky.isCurled;

    if ((isHand1FlatBase && isHand2ThumbUp) || (isHand2FlatBase && isHand1ThumbUp)) {
      return {
        text: 'HELP',
        category: 'conversational',
        confidence: 0.94,
        description: 'Both hands: Thumbs-up resting on flat palm (Help)'
      };
    }

    // Double Thumbs Up = GREAT / EXCELLENT
    if (f1.thumb.isUp && f2.thumb.isUp && f1.index.isCurled && f2.index.isCurled) {
      return {
        text: 'EXCELLENT',
        category: 'conversational',
        confidence: 0.95,
        description: 'Two thumbs up (Excellent / Great)'
      };
    }

    // STOP (Two-Hand): One flat base palm, other flat hand chopping down vertically onto it
    if (isHand1FlatBase && isHand2FlatBase && Math.abs(hand1[0].y - hand2[0].y) > 0.08) {
      return {
        text: 'STOP',
        category: 'conversational',
        confidence: 0.93,
        description: 'One flat hand chopping onto other flat palm (Stop)'
      };
    }

    return null;
  }

  /**
   * Dynamic Movement Classifications (Wave, Nod, Swipe, Chin-to-Chest)
   */
  classifyDynamicSigns(landmarks, motion) {
    const f = analyzeFingers(landmarks);
    const allExtended = f.index.isExtended && f.middle.isExtended && f.ring.isExtended && f.pinky.isExtended;
    const allCurled = f.index.isCurled && f.middle.isCurled && f.ring.isCurled && f.pinky.isCurled;

    // HELLO / WAVE: All fingers extended + lateral side-to-side oscillations
    if (allExtended && motion.oscillationsX >= 2) {
      return {
        text: 'HELLO',
        category: 'conversational',
        confidence: 0.96,
        description: 'Waving hand back and forth (Hello / Greetings)'
      };
    }

    // YES: Fist with up-down bobbing / nodding oscillations
    if (allCurled && motion.oscillationsY >= 2) {
      return {
        text: 'YES',
        category: 'conversational',
        confidence: 0.94,
        description: 'Fist nodding up and down (Yes / Agreement)'
      };
    }

    // BACKSPACE: Quick horizontal swipe left
    if ((motion.vx < -0.32 && motion.totalDisplacement > 0.12) || motion.vx < -0.55) {
      return {
        text: 'BACKSPACE',
        category: 'control',
        confidence: 0.92,
        description: 'Swipe hand left (Delete character)'
      };
    }

    // SORRY: Index finger extended, hovering / wagging side-to-side (right and left)
    const isPointingIndex = f.index.isExtended && (!f.middle.isExtended || f.middle.isCurled) && !f.ring.isExtended && !f.pinky.isExtended;
    if (isPointingIndex) {
      if (motion.indexOscillationsX >= 1 || motion.oscillationsX >= 1 || Math.abs(motion.vx) > 0.08) {
        return {
          text: 'SORRY',
          category: 'conversational',
          confidence: 0.98,
          description: 'Index finger hovering right and left (Sorry)'
        };
      }
    }

    // THANK YOU: Flat hand starting near chin/face moving outward toward camera
    if (allExtended && motion.vy > 0.14 && motion.totalDisplacement > 0.10 && landmarks[8].y > 0.22) {
      return {
        text: 'THANK YOU',
        category: 'conversational',
        confidence: 0.92,
        description: 'Flat hand moving forward and down (Thank You)'
      };
    }

    return null;
  }

  /**
   * Curated Static ASL Conversational Signs & Controls
   */
  classifyStaticSigns(landmarks, handedness) {
    const f = analyzeFingers(landmarks);
    const wrist = landmarks[0];
    const scale = f.scale;

    const { thumb, index, middle, ring, pinky, pinches } = f;

    // ----------------------------------------------------
    // 1. CONVERSATIONAL / COMMON SIGNS
    // ----------------------------------------------------

    // "OK": Thumb & Index touching in circle, Middle, Ring, Pinky extended upright
    const okPinchDist = Math.min(
      pinches.thumbIndex,
      distance3D(landmarks[4], landmarks[7]) / scale,
      distance3D(landmarks[3], landmarks[8]) / scale
    );
    const okFingersUp = middle.isExtended && (pinky.isExtended || ring.isExtended || !pinky.isCurled);
    if (okPinchDist < 0.40 && okFingersUp) {
      return {
        text: 'OK',
        category: 'conversational',
        confidence: 0.98,
        description: 'Thumb & Index touching in circle with other 3 fingers upright (OK)'
      };
    }

    // "MIDDLE FINGER" / "FUCK YOU": Middle finger extended straight up, all other fingers curled into fist
    if (middle.isExtended && index.isCurled && ring.isCurled && pinky.isCurled && landmarks[12].y < landmarks[10].y) {
      return {
        text: 'FUCK YOU',
        category: 'conversational',
        confidence: 1.00,
        description: 'Middle finger extended upright with fist closed (Fuck You)'
      };
    }

    // "I LOVE YOU": Thumb, Index, Pinky extended; Middle & Ring curled
    if (thumb.isExtended && index.isExtended && !middle.isExtended && !ring.isExtended && pinky.isExtended) {
      return {
        text: 'I LOVE YOU',
        category: 'conversational',
        confidence: 0.97,
        description: 'ASL "I Love You" sign (Thumb, Index, Pinky extended)'
      };
    }

    // "THUMBS UP" / GOOD: Fist with thumb pointed straight up
    if (thumb.isUp && index.isCurled && middle.isCurled && ring.isCurled && pinky.isCurled) {
      return {
        text: 'GOOD',
        category: 'conversational',
        confidence: 0.95,
        description: 'Thumbs Up (Good / Agree)'
      };
    }

    // "THUMBS DOWN" / BAD: Fist with thumb pointed straight down
    if (landmarks[4].y > landmarks[2].y + scale * 0.4 && index.isCurled && middle.isCurled && ring.isCurled && pinky.isCurled) {
      return {
        text: 'BAD',
        category: 'conversational',
        confidence: 0.92,
        description: 'Thumbs Down (Bad / Disagree)'
      };
    }

    // "PLEASE": Thumb and Pinky extended (Shaka/Phone handshape), Middle 3 fingers curled
    if (thumb.isExtended && pinky.isExtended && !index.isExtended && !middle.isExtended && !ring.isExtended) {
      return {
        text: 'PLEASE',
        category: 'conversational',
        confidence: 0.98,
        description: 'Thumb & Pinky extended (Please)'
      };
    }

    // "WATER": "W" handshape near chin/mouth area
    if (index.isExtended && middle.isExtended && ring.isExtended && !pinky.isExtended && landmarks[8].y < 0.35) {
      return {
        text: 'WATER',
        category: 'conversational',
        confidence: 0.94,
        description: 'W handshape held near chin/mouth (Water)'
      };
    }

    // "STOP": Flat vertical open palm facing camera
    if (index.isExtended && middle.isExtended && ring.isExtended && pinky.isExtended) {
      const vPalm = getVector(landmarks[0], landmarks[9]);
      if (Math.abs(vPalm.y) > Math.abs(vPalm.x) * 1.2 && landmarks[12].y < landmarks[0].y) {
        return {
          text: 'STOP',
          category: 'conversational',
          confidence: 0.95,
          description: 'Open flat hand vertical facing camera (Stop)'
        };
      }
    }

    // "SPACE": Flat palm held horizontally
    if (index.isExtended && middle.isExtended && ring.isExtended && pinky.isExtended) {
      const vPalm = getVector(landmarks[0], landmarks[9]);
      if (Math.abs(vPalm.x) > Math.abs(vPalm.y) * 1.1) {
        return {
          text: 'SPACE',
          category: 'control',
          confidence: 0.95,
          description: 'Flat palm horizontal (Space / Next Word)'
        };
      }
    }

    return null;
  }
}
