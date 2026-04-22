import type { MovementType, PunchType } from '@/lib/types/database';
import type { Side } from '@/lib/utils/landmarkAnalysis';

export interface PunchEvent {
  type: PunchType;
  side: Side;
  confidence: number;
  peakElbowAngle: number;
  peakWristVelocity: number;
  timestamp: number;
}

export interface DefenseEvent {
  type: MovementType;
  confidence: number;
  timestamp: number;
}

export type FormQuality = 'good' | 'acceptable' | 'needs_correction';

export interface FormAnalysis {
  score: number;
  issues: string[];
  quality: FormQuality;
}
