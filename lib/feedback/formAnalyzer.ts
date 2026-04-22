import { DEFENSE_THRESHOLDS, FORM_SCORING, PUNCH_THRESHOLDS } from '@/lib/config/formBenchmarks';
import type { PoseLandmarks } from '@/lib/hooks/usePoseDetection';
import type { MovementType, PunchType, Stance } from '@/lib/types/database';
import type { FormAnalysis, FormQuality, PunchEvent, DefenseEvent } from '@/lib/types/detection';
import {
  head,
  hipRotation,
  leadSide,
  rearSide,
  shoulder,
  shoulderMidpoint,
  shoulderRotation,
  shoulderWidth,
  wrist,
} from '@/lib/utils/landmarkAnalysis';

interface Check {
  weight: number;
  passed: boolean;
  cue: string;
}

function qualityFor(score: number): FormQuality {
  if (score >= FORM_SCORING.good) return 'good';
  if (score >= FORM_SCORING.acceptable) return 'acceptable';
  return 'needs_correction';
}

function aggregate(checks: Check[]): FormAnalysis {
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const earned = checks
    .filter((c) => c.passed)
    .reduce((sum, c) => sum + c.weight, 0);
  const score = totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100);
  const issues = checks.filter((c) => !c.passed && c.cue).map((c) => c.cue);
  return { score, issues, quality: qualityFor(score) };
}

export class FormAnalyzer {
  private stance: Stance;

  constructor(stance: Stance) {
    this.stance = stance;
  }

  setStance(stance: Stance) {
    this.stance = stance;
  }

  analyzePunch(event: PunchEvent, landmarks: PoseLandmarks[]): FormAnalysis {
    const threshold = PUNCH_THRESHOLDS[event.type];
    const isStraight = event.type === 1 || event.type === 2;
    const isHook = event.type === 3 || event.type === 4;
    const isUppercut = event.type === 5 || event.type === 6;
    const isRear = event.side === rearSide(this.stance);

    const shoulderRot = Math.abs(shoulderRotation(landmarks));
    const hipRot = Math.abs(hipRotation(landmarks));
    const guardUp = this.isOffHandGuardUp(event, landmarks);

    const checks: Check[] = [];

    if (isStraight) {
      checks.push({
        weight: 3,
        passed:
          event.peakElbowAngle >= threshold.minElbowExtension &&
          event.peakElbowAngle <= threshold.maxElbowExtension,
        cue: 'Fully extend the arm',
      });
    } else if (isHook) {
      checks.push({
        weight: 3,
        passed:
          event.peakElbowAngle >= (threshold.minElbowAngleForHook ?? 70) &&
          event.peakElbowAngle <= (threshold.maxElbowAngleForHook ?? 120),
        cue: 'Keep the elbow at 90° on hooks',
      });
    } else if (isUppercut) {
      checks.push({
        weight: 3,
        passed:
          event.peakElbowAngle >= threshold.minElbowExtension &&
          event.peakElbowAngle <= threshold.maxElbowExtension,
        cue: 'Drive up through the uppercut',
      });
    }

    checks.push({
      weight: 2,
      passed: shoulderRot >= threshold.minShoulderRotation,
      cue: 'Turn your shoulders into the punch',
    });

    checks.push({
      weight: isRear ? 2 : 1,
      passed: hipRot >= threshold.minHipRotation,
      cue: 'Rotate your hips',
    });

    checks.push({
      weight: 2,
      passed: event.peakWristVelocity >= threshold.minWristVelocity,
      cue: 'Punch with more snap',
    });

    checks.push({
      weight: 2,
      passed: guardUp,
      cue: 'Keep your other hand up',
    });

    return aggregate(checks);
  }

  analyzeDefense(event: DefenseEvent, landmarks: PoseLandmarks[]): FormAnalysis {
    const threshold = DEFENSE_THRESHOLDS[event.type];
    const sw = shoulderWidth(landmarks) || 0.2;
    const mid = shoulderMidpoint(landmarks);
    const nose = head(landmarks);

    const lateral = Math.abs(nose.x - mid.x) / sw;
    const drop = (nose.y - mid.y) / sw;

    const checks: Check[] = [];

    if (event.type === 'slip_left' || event.type === 'slip_right') {
      checks.push({
        weight: 3,
        passed:
          lateral >= threshold.minHeadDisplacement &&
          lateral <= threshold.maxHeadDisplacement,
        cue: lateral < threshold.minHeadDisplacement ? 'Slip farther off the centerline' : 'Do not overextend the slip',
      });
      checks.push({
        weight: 2,
        passed: drop > -0.1,
        cue: 'Stay level — do not bob up',
      });
    }

    if (event.type === 'duck') {
      checks.push({
        weight: 3,
        passed:
          drop >= (threshold.minHeadDrop ?? 0.2) &&
          drop <= (threshold.maxHeadDrop ?? 0.45),
        cue: drop < (threshold.minHeadDrop ?? 0.2) ? 'Bend the knees deeper' : 'Do not overduck',
      });
      checks.push({
        weight: 2,
        passed: lateral <= threshold.maxHeadDisplacement,
        cue: 'Duck straight down, not to the side',
      });
    }

    if (event.type === 'pull_back') {
      checks.push({
        weight: 3,
        passed: event.confidence >= 0.7,
        cue: 'Pull farther back from the punch',
      });
      checks.push({
        weight: 2,
        passed: lateral <= threshold.maxHeadDisplacement,
        cue: 'Pull straight back, not to the side',
      });
    }

    checks.push({
      weight: 1,
      passed: this.handsNearFace(landmarks),
      cue: 'Keep your hands up while moving',
    });

    return aggregate(checks);
  }

  getFormColor(quality: FormQuality): string {
    switch (quality) {
      case 'good':
        return '#4ADE80';
      case 'acceptable':
        return '#FACC15';
      case 'needs_correction':
        return '#EF4444';
    }
  }

  private isOffHandGuardUp(event: PunchEvent, landmarks: PoseLandmarks[]): boolean {
    const offSide = event.side === 'left' ? 'right' : 'left';
    const offWrist = wrist(offSide, landmarks);
    const offShoulder = shoulder(offSide, landmarks);
    const nose = head(landmarks);
    const sw = shoulderWidth(landmarks) || 0.2;

    // Off-hand wrist should be at or above the shoulder, within ~1 shoulder-width of the chin.
    const aboveShoulder = offWrist.y <= offShoulder.y + 0.05;
    const nearFace = Math.hypot(offWrist.x - nose.x, offWrist.y - nose.y) <= sw * 1.3;
    return aboveShoulder && nearFace;
  }

  private handsNearFace(landmarks: PoseLandmarks[]): boolean {
    const sw = shoulderWidth(landmarks) || 0.2;
    const nose = head(landmarks);
    const lw = wrist('left', landmarks);
    const rw = wrist('right', landmarks);
    const near = (p: { x: number; y: number }) =>
      Math.hypot(p.x - nose.x, p.y - nose.y) <= sw * 1.4;
    return near(lw) && near(rw);
  }
}
