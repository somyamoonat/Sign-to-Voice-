/**
 * ui_controller.js - Clean Canvas HUD Rendering and Video Overlays
 * Strictly draws clean hand skeleton lines and tracking brackets.
 * No mirrored canvas text and no center screen prompts.
 */

export class UIController {
  constructor({ canvasElement, videoElement, onMetricsUpdate = null }) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.video = videoElement;
    this.onMetricsUpdate = onMetricsUpdate;

    // State
    this.currentGesture = null;
    this.holdProgress = 0;

    // Performance tracking
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.fps = 30;
    this.inferenceTimeMs = 12;

    // Options
    this.showSkeleton = true;
    this.showBoundingBox = true;
    this.showLandmarkDots = true;
  }

  setHoldProgress(progress, gesture) {
    this.holdProgress = progress;
    this.currentGesture = gesture;
  }

  updateMetrics(inferenceTimeMs) {
    this.inferenceTimeMs = Math.round(inferenceTimeMs);
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsTime;

    if (elapsed >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsTime = now;

      if (this.onMetricsUpdate) {
        this.onMetricsUpdate(this.fps, this.inferenceTimeMs);
      }
    }
  }

  /**
   * Render clean HUD elements over camera feed
   */
  renderFrame(results) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      // Nothing drawn when no hand is present (no middle screen text)
      return;
    }

    // Process each detected hand
    for (let h = 0; h < results.multiHandLandmarks.length; h++) {
      const landmarks = results.multiHandLandmarks[h];

      // Draw clean skeleton lines
      if (this.showSkeleton) {
        this.drawHandSkeleton(landmarks, width, height);
      }

      // Draw clean landmark dots
      if (this.showLandmarkDots) {
        this.drawLandmarkDots(landmarks, width, height);
      }

      // Draw tracking brackets around hand
      if (this.showBoundingBox) {
        this.drawHandHUD(landmarks, width, height);
      }
    }
  }

  /**
   * Crisp white skeleton line connections
   */
  drawHandSkeleton(landmarks, w, h) {
    const ctx = this.ctx;

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [9, 13], [13, 14], [14, 15], [15, 16],// Ring
      [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [0, 17]                               // Palm base
    ];

    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';

    for (const [i, j] of connections) {
      const p1 = landmarks[i];
      const p2 = landmarks[j];

      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Clean landmark joint dots
   */
  drawLandmarkDots(landmarks, w, h) {
    const ctx = this.ctx;
    ctx.save();

    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      const x = p.x * w;
      const y = p.y * h;

      ctx.beginPath();
      const isTip = [4, 8, 12, 16, 20].includes(i);
      ctx.fillStyle = isTip ? '#22c55e' : '#ffffff';

      ctx.arc(x, y, isTip ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Clean bounding box corner brackets around hand
   */
  drawHandHUD(landmarks, w, h) {
    const ctx = this.ctx;

    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const p of landmarks) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const pad = 0.04;
    const bx = Math.max(0, (minX - pad) * w);
    const by = Math.max(0, (minY - pad) * h);
    const bw = Math.min(w - bx, (maxX - minX + pad * 2) * w);
    const bh = Math.min(h - by, (maxY - minY + pad * 2) * h);

    ctx.save();

    // Corner brackets
    ctx.strokeStyle = this.holdProgress >= 0.95 ? '#22c55e' : 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.75;

    const cornerLen = Math.min(18, bw * 0.25);

    // Top-left
    ctx.beginPath();
    ctx.moveTo(bx, by + cornerLen);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + cornerLen, by);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(bx + bw - cornerLen, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw, by + cornerLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(bx, by + bh - cornerLen);
    ctx.lineTo(bx, by + bh);
    ctx.lineTo(bx + cornerLen, by + bh);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(bx + bw - cornerLen, by + bh);
    ctx.lineTo(bx + bw, by + bh);
    ctx.lineTo(bx + bw, by + bh - cornerLen);
    ctx.stroke();

    ctx.restore();
  }
}
