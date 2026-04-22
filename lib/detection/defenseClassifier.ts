import { DEFENSE_THRESHOLDS, DETECTION, FORM_SCORING } from '@/lib/config/formBenchmarks';
import type { PoseLandmarks } from '@/lib/hooks/usePoseDetection';
import type { MovementType } from '@/lib/types/database';
import type { DefenseEvent } from '@/lib/types/detection';
import {
  LM,
  head,
  shoulderMidpoint,
  shoulderWidth,
  visible,
} from '@/lib/utils/landmarkAnalysis';

interface Baseline {
  headY: number;
  headZ: number;
  shoulderMidX: number;
  shoulderWidth: number;
}

interface MoveState {
  active: MovementType | null;
  peakMagnitude: number;
  startedAt: number;
}

const CALIBRATION_FRAMES = 15;

export class DefenseClassifier {
  private calibrationBuffer: PoseLandmarks[][] = [];
  private baseline: Baseline | null = null;
  private state: MoveState = { active: null, peakMagnitude: 0, startedAt: 0 };
  private cooldownUntil = 0;

  reset() {
    this.calibrationBuffer = [];
    this.baseline = null;
    this.state = { active: null, peakMagnitude: 0, startedAt: 0 };
    this.cooldownUntil = 0;
  }

  get isCalibrated() {
    return this.baseline !== null;
  }

  calibrate(landmarks: PoseLandmarks[]) {
    if (!visible(landmarks, [LM.NOSE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER], 0.6)) {
      return;
    }
    this.calibrationBuffer.push(landmarks);
    if (this.calibrationBuffer.length >= CALIBRATION_FRAMES) {
      this.baseline = this.computeBaseline(this.calibrationBuffer);
      this.calibrationBuffer = [];
    }
  }

  private computeBaseline(frames: PoseLandmarks[][]): Baseline {
    let sumHeadY = 0;
    let sumHeadZ = 0;
    let sumShoulderMidX = 0;
    let sumShoulderWidth = 0;
    for (const lm of frames) {
      sumHeadY += lm[LM.NOSE].y;
      sumHeadZ += lm[LM.NOSE].z;
      sumShoulderMidX += shoulderMidpoint(lm).x;
      sumShoulderWidth += shoulderWidth(lm);
    }
    const n = frames.length;
    return {
      headY: sumHeadY / n,
      headZ: sumHeadZ / n,
      shoulderMidX: sumShoulderMidX / n,
      shoulderWidth: sumShoulderWidth / n,
    };
  }

  ingest(landmarks: PoseLandmarks[], timestamp: number): DefenseEvent | null {
    if (!this.baseline) {
      this.calibrate(landmarks);
      return null;
    }

    if (timestamp < this.cooldownUntil) return null;

    if (
      !visible(
        landmarks,
        [LM.NOSE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
        FORM_SCORING.minVisibility
      )
    ) {
      return null;
    }

    const nose = head(landmarks);
    const sw = this.baseline.shoulderWidth || shoulderWidth(landmarks) || 0.2;

    const lateral = (nose.x - this.baseline.shoulderMidX) / sw;
    const drop = (nose.y - this.baseline.headY) / sw;
    const zShift = nose.z - this.baseline.headZ;

    const candidate = this.classifyPose(lateral, drop, zShift);
    const magnitude = this.candidateMagnitude(candidate, lateral, drop, zShift);

    if (!candidate) {
      // Movement ended — if we were tracking one long enough, fire it.
      if (this.state.active && timestamp - this.state.startedAt >= DEFENSE_THRESHOLDS[this.state.active].minDurationMs) {
        const event: DefenseEvent = {
          type: this.state.active,
          confidence: this.scoreConfidence(this.state.active, this.state.peakMagnitude),
          timestamp,
        };
        this.state = { active: null, peakMagnitude: 0, startedAt: 0 };
        this.cooldownUntil = timestamp + DETECTION.cooldownMs;
        return event;
      }
      this.state = { active: null, peakMagnitude: 0, startedAt: 0 };
      return null;
    }

    if (candidate === this.state.active) {
      if (magnitude > this.state.peakMagnitude) {
        this.state.peakMagnitude = magnitude;
      }
    } else {
      this.state = { active: candidate, peakMagnitude: magnitude, startedAt: timestamp };
    }

    return null;
  }

  private classifyPose(
    lateral: number,
    drop: number,
    zShift: number
  ): MovementType | null {
    const absLateral = Math.abs(lateral);

    const slip = DEFENSE_THRESHOLDS.slip_left;
    if (absLateral >= slip.minHeadDisplacement && absLateral <= slip.maxHeadDisplacement) {
      // "Slip left" from the fighter's perspective = head moves over lead-side shoulder.
      // In image coords (mirrored video), left in the video = user's right physically.
      // We keep the sign convention simple: lateral < 0 → slip_left, lateral > 0 → slip_right.
      return lateral < 0 ? 'slip_left' : 'slip_right';
    }

    const duck = DEFENSE_THRESHOLDS.duck;
    if (
      drop >= (duck.minHeadDrop ?? 0.2) &&
      drop <= (duck.maxHeadDrop ?? 0.45) &&
      absLateral <= duck.maxHeadDisplacement
    ) {
      return 'duck';
    }

    const pull = DEFENSE_THRESHOLDS.pull_back;
    if (
      zShift >= (pull.minHeadZShift ?? 0.08) &&
      absLateral <= pull.maxHeadDisplacement
    ) {
      return 'pull_back';
    }

    return null;
  }

  private candidateMagnitude(
    candidate: MovementType | null,
    lateral: number,
    drop: number,
    zShift: number
  ): number {
    switch (candidate) {
      case 'slip_left':
      case 'slip_right':
        return Math.abs(lateral);
      case 'duck':
        return drop;
      case 'pull_back':
        return zShift;
      default:
        return 0;
    }
  }

  private scoreConfidence(type: MovementType, magnitude: number): number {
    const t = DEFENSE_THRESHOLDS[type];
    const min = t.minHeadDisplacement || t.minHeadDrop || t.minHeadZShift || 0.1;
    const max = t.maxHeadDisplacement || t.maxHeadDrop || min * 3;
    const span = Math.max(0.001, max - min);
    const normalized = Math.min(1, Math.max(0, (magnitude - min) / span));
    return 0.6 + 0.4 * normalized;
  }
}
