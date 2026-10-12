/**
 * landmarks.js - Geometric & Spatial Analysis for 21 3D Hand Landmarks
 * MediaPipe Hand Landmark Indices:
 * 0: Wrist
 * 1-4: Thumb (CMC, MCP, IP, TIP)
 * 5-8: Index (MCP, PIP, DIP, TIP)
 * 9-12: Middle (MCP, PIP, DIP, TIP)
 * 13-16: Ring (MCP, PIP, DIP, TIP)
 * 17-20: Pinky (MCP, PIP, DIP, TIP)
 */

export const LANDMARK_NAMES = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20
};

/**
 * 3D Euclidean distance between two landmarks
 */
export function distance3D(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.hypot(dx, dy, dz);
}

/**
 * 2D Euclidean distance (screen projection)
 */
export function distance2D(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Vector between two points: p2 - p1
 */
export function getVector(p1, p2) {
  return {
    x: p2.x - p1.x,
    y: p2.y - p1.y,
    z: (p2.z || 0) - (p1.z || 0)
  };
}

/**
 * Angle in degrees between two 3D vectors
 */
export function angleBetweenVectors(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.hypot(v1.x, v1.y, v1.z);
  const mag2 = Math.hypot(v2.x, v2.y, v2.z);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Calculate Palm Scale (distance between Wrist and Middle MCP)
 * Used to normalize all spatial distances so gestures are invariant to camera zoom/distance.
 */
export function getPalmScale(landmarks) {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const d = distance3D(wrist, middleMcp);
  return d > 0.001 ? d : 1.0;
}

/**
 * Calculate Hand Centroid (mean position of palm landmarks)
 */
export function getHandCentroid(landmarks) {
  const palmIndices = [0, 1, 5, 9, 13, 17];
  let sx = 0, sy = 0, sz = 0;
  for (const idx of palmIndices) {
    sx += landmarks[idx].x;
    sy += landmarks[idx].y;
    sz += landmarks[idx].z || 0;
  }
  return {
    x: sx / palmIndices.length,
    y: sy / palmIndices.length,
    z: sz / palmIndices.length
  };
}

/**
 * Analyze finger status:
 * Returns boolean states for each finger:
 * - isExtended: tip is further from wrist than PIP joint by palm scale ratio
 * - isCurled: tip is tucked close to MCP
 * - isPointingUp: vertical vector is negative (y goes down on screen)
 */
export function analyzeFingers(landmarks) {
  const wrist = landmarks[0];
  const scale = getPalmScale(landmarks);

  // Helper: check extension for 4 fingers (Index, Middle, Ring, Pinky)
  const checkFinger = (mcpIdx, pipIdx, dipIdx, tipIdx) => {
    const mcp = landmarks[mcpIdx];
    const pip = landmarks[pipIdx];
    const tip = landmarks[tipIdx];

    const distWristTip = distance3D(wrist, tip);
    const distWristPip = distance3D(wrist, pip);
    const distMcpTip = distance3D(mcp, tip);

    // Tip further than pip relative to wrist, and straight joint angle
    const v1 = getVector(mcp, pip);
    const v2 = getVector(pip, tip);
    const jointAngle = angleBetweenVectors(v1, v2);

    const isExtended = distWristTip > distWristPip * 1.12 && jointAngle < 45;
    const isCurled = distMcpTip < scale * 0.55 || distWristTip < distWristPip * 0.95;
    const isBent = !isExtended && !isCurled;

    return { isExtended, isCurled, isBent, jointAngle, distWristTip: distWristTip / scale };
  };

  const index = checkFinger(5, 6, 7, 8);
  const middle = checkFinger(9, 10, 11, 12);
  const ring = checkFinger(13, 14, 15, 16);
  const pinky = checkFinger(17, 18, 19, 20);

  // Thumb analysis (unique articulation)
  const thumbCmc = landmarks[1];
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];

  const thumbDistFromIndexMcp = distance3D(thumbTip, indexMcp) / scale;
  const thumbDistFromWrist = distance3D(thumbTip, wrist) / scale;
  const thumbV1 = getVector(thumbCmc, thumbMcp);
  const thumbV2 = getVector(thumbIp, thumbTip);
  const thumbStraightAngle = angleBetweenVectors(thumbV1, thumbV2);

  // Thumb extended away from palm
  const isThumbExtended = thumbDistFromIndexMcp > 0.65 && thumbDistFromWrist > 0.85;
  const isThumbFolded = thumbDistFromIndexMcp < 0.45;
  const isThumbUp = (thumbTip.y < thumbMcp.y) && isThumbExtended && (thumbTip.y < indexMcp.y);

  // Pinches
  const pinchThumbIndex = distance3D(thumbTip, landmarks[8]) / scale;
  const pinchThumbMiddle = distance3D(thumbTip, landmarks[12]) / scale;
  const pinchThumbRing = distance3D(thumbTip, landmarks[16]) / scale;
  const pinchThumbPinky = distance3D(thumbTip, landmarks[20]) / scale;

  return {
    thumb: {
      isExtended: isThumbExtended,
      isFolded: isThumbFolded,
      isUp: isThumbUp,
      distFromIndexMcp: thumbDistFromIndexMcp,
      distFromWrist: thumbDistFromWrist
    },
    index,
    middle,
    ring,
    pinky,
    pinches: {
      thumbIndex: pinchThumbIndex,
      thumbMiddle: pinchThumbMiddle,
      thumbRing: pinchThumbRing,
      thumbPinky: pinchThumbPinky
    },
    scale
  };
}
