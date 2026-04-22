import type { PoseLandmarks } from '@/lib/hooks/usePoseDetection';
import type { Stance } from '@/lib/types/database';

// MediaPipe Pose landmark indices (33-point model).
// Reference: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export type Side = 'left' | 'right';

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

// Angle at `vertex` formed by rays vertex→a and vertex→b, in degrees (0–180).
export function calculateAngle(a: Point2D, vertex: Point2D, b: Point2D): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = b.x - vertex.x;
  const v2y = b.y - vertex.y;

  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);

  if (m1 === 0 || m2 === 0) return 0;

  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function distance2D(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distance3D(a: Point3D, b: Point3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

// Velocity in normalized units per second (MediaPipe landmarks are 0–1).
export function calculateVelocity(
  current: Point3D,
  previous: Point3D,
  deltaMs: number
): number {
  if (deltaMs <= 0) return 0;
  return distance3D(current, previous) / (deltaMs / 1000);
}

export function midpoint(a: Point3D, b: Point3D): Point3D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

export function shoulderMidpoint(landmarks: PoseLandmarks[]): Point3D {
  return midpoint(landmarks[LM.LEFT_SHOULDER], landmarks[LM.RIGHT_SHOULDER]);
}

export function hipMidpoint(landmarks: PoseLandmarks[]): Point3D {
  return midpoint(landmarks[LM.LEFT_HIP], landmarks[LM.RIGHT_HIP]);
}

export function shoulderWidth(landmarks: PoseLandmarks[]): number {
  return distance2D(landmarks[LM.LEFT_SHOULDER], landmarks[LM.RIGHT_SHOULDER]);
}

// Shoulder line rotation around the vertical axis, in degrees.
// Uses the x/z plane so left-right twist (e.g. throwing a cross) registers.
export function shoulderRotation(landmarks: PoseLandmarks[]): number {
  const l = landmarks[LM.LEFT_SHOULDER];
  const r = landmarks[LM.RIGHT_SHOULDER];
  const dx = r.x - l.x;
  const dz = r.z - l.z;
  return (Math.atan2(dz, dx) * 180) / Math.PI;
}

export function hipRotation(landmarks: PoseLandmarks[]): number {
  const l = landmarks[LM.LEFT_HIP];
  const r = landmarks[LM.RIGHT_HIP];
  const dx = r.x - l.x;
  const dz = r.z - l.z;
  return (Math.atan2(dz, dx) * 180) / Math.PI;
}

export function elbowAngle(side: Side, landmarks: PoseLandmarks[]): number {
  const [shoulder, elbow, wrist] =
    side === 'left'
      ? [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST]
      : [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST];
  return calculateAngle(landmarks[shoulder], landmarks[elbow], landmarks[wrist]);
}

export function wrist(side: Side, landmarks: PoseLandmarks[]): Point3D {
  return landmarks[side === 'left' ? LM.LEFT_WRIST : LM.RIGHT_WRIST];
}

export function shoulder(side: Side, landmarks: PoseLandmarks[]): Point3D {
  return landmarks[side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER];
}

export function elbow(side: Side, landmarks: PoseLandmarks[]): Point3D {
  return landmarks[side === 'left' ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW];
}

export function head(landmarks: PoseLandmarks[]): Point3D {
  return landmarks[LM.NOSE];
}

// Lead = the hand that's forward in the chosen stance.
// Orthodox: left hand leads (jab). Southpaw: right hand leads.
export function leadSide(stance: Stance): Side {
  return stance === 'orthodox' ? 'left' : 'right';
}

export function rearSide(stance: Stance): Side {
  return stance === 'orthodox' ? 'right' : 'left';
}

// True when the given landmarks have enough visibility to trust them.
export function visible(
  landmarks: PoseLandmarks[],
  indices: number[],
  min = 0.5
): boolean {
  return indices.every((i) => (landmarks[i]?.visibility ?? 0) >= min);
}

export type FramingStatus =
  | 'ok'
  | 'too_close'
  | 'too_far'
  | 'out_of_frame'
  | 'waiting';

// The sweet spot for shoulder width in normalized image coords.
// Below → user is too far (shoulders look narrow). Above → too close.
const FRAME_SHOULDER_MIN = 0.13;
const FRAME_SHOULDER_MAX = 0.42;

// Upper body points we need visible to trust classification.
// Hips are excluded — framing tight to chest is fine, and tight framing is
// common when the user wants space to throw punches.
const FRAME_REQUIRED_POINTS = [
  LM.NOSE,
  LM.LEFT_SHOULDER,
  LM.RIGHT_SHOULDER,
  LM.LEFT_ELBOW,
  LM.RIGHT_ELBOW,
  LM.LEFT_WRIST,
  LM.RIGHT_WRIST,
];

export function checkFraming(
  landmarks: PoseLandmarks[] | null | undefined
): FramingStatus {
  if (!landmarks || landmarks.length === 0) return 'waiting';
  if (!visible(landmarks, FRAME_REQUIRED_POINTS, 0.3)) return 'out_of_frame';

  const width = shoulderWidth(landmarks);
  if (width < FRAME_SHOULDER_MIN) return 'too_far';
  if (width > FRAME_SHOULDER_MAX) return 'too_close';

  return 'ok';
}
