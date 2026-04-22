import { DETECTION, FORM_SCORING, PUNCH_THRESHOLDS } from '@/lib/config/formBenchmarks';
import type { PoseLandmarks } from '@/lib/hooks/usePoseDetection';
import type { PunchType, Stance } from '@/lib/types/database';
import type { PunchEvent } from '@/lib/types/detection';
import {
  LM,
  calculateVelocity,
  elbowAngle,
  leadSide,
  rearSide,
  shoulderWidth,
  visible,
  wrist,
  type Point3D,
  type Side,
} from '@/lib/utils/landmarkAnalysis';

interface Frame {
  landmarks: PoseLandmarks[];
  timestamp: number;
}

interface ArmState {
  phase: 'idle' | 'extending' | 'retracting';
  peakElbowAngle: number;
  peakWristVelocity: number;
  peakWrist: Point3D | null;
  startWrist: Point3D | null;
  startShoulder: Point3D | null;
  cooldownUntil: number;
}

const EXTENSION_START = 90;
const STRAIGHT_MIN = 160;
const HOOK_RANGE: [number, number] = [70, 120];
const UPPERCUT_RANGE: [number, number] = [80, 140];

function newArmState(): ArmState {
  return {
    phase: 'idle',
    peakElbowAngle: 0,
    peakWristVelocity: 0,
    peakWrist: null,
    startWrist: null,
    startShoulder: null,
    cooldownUntil: 0,
  };
}

export class PunchClassifier {
  private history: Frame[] = [];
  private left = newArmState();
  private right = newArmState();
  private stance: Stance;

  constructor(stance: Stance) {
    this.stance = stance;
  }

  setStance(stance: Stance) {
    this.stance = stance;
  }

  reset() {
    this.history = [];
    this.left = newArmState();
    this.right = newArmState();
  }

  // Feed one pose frame. Returns a PunchEvent when a punch completes,
  // otherwise null. Call every frame with the latest MediaPipe landmarks.
  ingest(landmarks: PoseLandmarks[], timestamp: number): PunchEvent | null {
    const requiredPoints = [
      LM.LEFT_SHOULDER,
      LM.RIGHT_SHOULDER,
      LM.LEFT_ELBOW,
      LM.RIGHT_ELBOW,
      LM.LEFT_WRIST,
      LM.RIGHT_WRIST,
      LM.LEFT_HIP,
      LM.RIGHT_HIP,
    ];
    if (!visible(landmarks, requiredPoints, FORM_SCORING.minVisibility)) {
      this.pushFrame({ landmarks, timestamp });
      return null;
    }

    const previous = this.history[this.history.length - 1];
    this.pushFrame({ landmarks, timestamp });

    const leftEvent = this.updateArm('left', landmarks, timestamp, previous);
    const rightEvent = this.updateArm('right', landmarks, timestamp, previous);

    // If both peaked on the same frame (rare), prefer the higher-velocity one.
    if (leftEvent && rightEvent) {
      return leftEvent.peakWristVelocity >= rightEvent.peakWristVelocity
        ? leftEvent
        : rightEvent;
    }
    return leftEvent ?? rightEvent;
  }

  private pushFrame(frame: Frame) {
    this.history.push(frame);
    if (this.history.length > DETECTION.historyFrames) {
      this.history.shift();
    }
  }

  private updateArm(
    side: Side,
    landmarks: PoseLandmarks[],
    timestamp: number,
    previous: Frame | undefined
  ): PunchEvent | null {
    const state = side === 'left' ? this.left : this.right;

    if (timestamp < state.cooldownUntil) return null;

    const angle = elbowAngle(side, landmarks);
    const currentWrist = wrist(side, landmarks);
    const currentShoulder = landmarks[side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER];

    const velocity = previous
      ? calculateVelocity(
          currentWrist,
          wrist(side, previous.landmarks),
          timestamp - previous.timestamp
        )
      : 0;

    switch (state.phase) {
      case 'idle': {
        if (angle >= EXTENSION_START && velocity >= 0.5) {
          state.phase = 'extending';
          state.peakElbowAngle = angle;
          state.peakWristVelocity = velocity;
          state.peakWrist = currentWrist;
          state.startWrist = previous ? wrist(side, previous.landmarks) : currentWrist;
          state.startShoulder = currentShoulder;
        }
        return null;
      }

      case 'extending': {
        if (angle > state.peakElbowAngle) {
          state.peakElbowAngle = angle;
          state.peakWrist = currentWrist;
        }
        if (velocity > state.peakWristVelocity) {
          state.peakWristVelocity = velocity;
        }

        // Peak reached when elbow angle starts decreasing AND velocity drops.
        const retracting = angle < state.peakElbowAngle - 5 || velocity < 0.3;
        if (retracting) {
          const event = this.classifyPeak(side, state, timestamp, landmarks);
          state.phase = 'retracting';
          state.cooldownUntil = timestamp + DETECTION.cooldownMs;
          return event;
        }
        return null;
      }

      case 'retracting': {
        // Return to idle once the arm has clearly chambered back (small angle).
        if (angle < EXTENSION_START - 10) {
          Object.assign(state, newArmState());
        }
        return null;
      }
    }
  }

  private classifyPeak(
    side: Side,
    state: ArmState,
    timestamp: number,
    landmarks: PoseLandmarks[]
  ): PunchEvent | null {
    if (!state.peakWrist || !state.startWrist || !state.startShoulder) return null;

    const type = this.determinePunchType(side, state, landmarks);
    if (type === null) return null;

    const threshold = PUNCH_THRESHOLDS[type];
    const velocityOk = state.peakWristVelocity >= threshold.minWristVelocity * 0.8;
    if (!velocityOk) return null;

    const confidence = this.scoreConfidence(type, state);

    return {
      type,
      side,
      confidence,
      peakElbowAngle: state.peakElbowAngle,
      peakWristVelocity: state.peakWristVelocity,
      timestamp,
    };
  }

  private determinePunchType(
    side: Side,
    state: ArmState,
    landmarks: PoseLandmarks[]
  ): PunchType | null {
    const isLead = side === leadSide(this.stance);
    const isRear = side === rearSide(this.stance);
    const angle = state.peakElbowAngle;

    if (angle >= STRAIGHT_MIN) {
      if (isLead) return 1;
      if (isRear) return 2;
      return null;
    }

    const dx = state.peakWrist!.x - state.startWrist!.x;
    const dy = state.peakWrist!.y - state.startWrist!.y;
    const sw = shoulderWidth(landmarks) || 0.2;
    const lateral = Math.abs(dx) / sw;
    const vertical = -dy / sw; // negative y is upward in normalized image coords

    const inHookRange = angle >= HOOK_RANGE[0] && angle <= HOOK_RANGE[1];
    const inUppercutRange = angle >= UPPERCUT_RANGE[0] && angle <= UPPERCUT_RANGE[1];

    // Uppercut wins if vertical rise dominates lateral travel.
    if (inUppercutRange && vertical > lateral && vertical >= 0.1) {
      if (isLead) return 5;
      if (isRear) return 6;
    }

    if (inHookRange && lateral >= 0.15) {
      if (isLead) return 3;
      if (isRear) return 4;
    }

    return null;
  }

  private scoreConfidence(type: PunchType, state: ArmState): number {
    const threshold = PUNCH_THRESHOLDS[type];
    const angle = state.peakElbowAngle;
    const velocity = state.peakWristVelocity;

    let score = 0.6;

    const inRange =
      angle >= threshold.minElbowExtension && angle <= threshold.maxElbowExtension;
    if (inRange) score += 0.2;

    if (velocity >= threshold.minWristVelocity) score += 0.2;

    return Math.min(1, score);
  }
}
