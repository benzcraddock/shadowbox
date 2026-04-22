import type { MovementType, PunchType } from '@/lib/types/database';

export interface PunchThreshold {
  minElbowExtension: number;
  maxElbowExtension: number;
  minShoulderRotation: number;
  minHipRotation: number;
  minWristVelocity: number;
  maxElbowAngleForHook?: number;
  minElbowAngleForHook?: number;
  verticalTrajectoryMin?: number;
}

export const PUNCH_THRESHOLDS: Record<PunchType, PunchThreshold> = {
  1: {
    minElbowExtension: 160,
    maxElbowExtension: 180,
    minShoulderRotation: 10,
    minHipRotation: 5,
    minWristVelocity: 1.0,
  },
  2: {
    minElbowExtension: 160,
    maxElbowExtension: 180,
    minShoulderRotation: 25,
    minHipRotation: 30,
    minWristVelocity: 1.2,
  },
  3: {
    minElbowExtension: 70,
    maxElbowExtension: 120,
    minShoulderRotation: 25,
    minHipRotation: 20,
    minWristVelocity: 1.0,
    minElbowAngleForHook: 70,
    maxElbowAngleForHook: 120,
  },
  4: {
    minElbowExtension: 70,
    maxElbowExtension: 120,
    minShoulderRotation: 30,
    minHipRotation: 30,
    minWristVelocity: 1.2,
    minElbowAngleForHook: 70,
    maxElbowAngleForHook: 120,
  },
  5: {
    minElbowExtension: 80,
    maxElbowExtension: 140,
    minShoulderRotation: 15,
    minHipRotation: 15,
    minWristVelocity: 1.0,
    verticalTrajectoryMin: 0.1,
  },
  6: {
    minElbowExtension: 80,
    maxElbowExtension: 140,
    minShoulderRotation: 25,
    minHipRotation: 25,
    minWristVelocity: 1.2,
    verticalTrajectoryMin: 0.1,
  },
};

export interface DefenseThreshold {
  minHeadDisplacement: number;
  maxHeadDisplacement: number;
  minHeadDrop?: number;
  maxHeadDrop?: number;
  minHeadZShift?: number;
  minDurationMs: number;
}

export const DEFENSE_THRESHOLDS: Record<MovementType, DefenseThreshold> = {
  slip_left: {
    minHeadDisplacement: 0.15,
    maxHeadDisplacement: 0.5,
    minDurationMs: 100,
  },
  slip_right: {
    minHeadDisplacement: 0.15,
    maxHeadDisplacement: 0.5,
    minDurationMs: 100,
  },
  duck: {
    minHeadDisplacement: 0,
    maxHeadDisplacement: 0.15,
    minHeadDrop: 0.2,
    maxHeadDrop: 0.45,
    minDurationMs: 100,
  },
  pull_back: {
    minHeadDisplacement: 0,
    maxHeadDisplacement: 0.2,
    minHeadZShift: 0.08,
    minDurationMs: 100,
  },
};

export const FORM_SCORING = {
  good: 80,
  acceptable: 60,
  guardReturnMs: 500,
  minVisibility: 0.5,
};

export const DETECTION = {
  minFramesForPunch: 3,
  maxFramesBetweenPunchPhases: 15,
  cooldownMs: 250,
  historyFrames: 30,
};
