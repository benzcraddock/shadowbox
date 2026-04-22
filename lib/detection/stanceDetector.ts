import type { PoseLandmarks } from '@/lib/hooks/usePoseDetection';
import type { Stance } from '@/lib/types/database';
import { LM, visible } from '@/lib/utils/landmarkAnalysis';

interface Sample {
  leftWristZ: number;
  rightWristZ: number;
}

const MIN_SAMPLES = 20;

// Detects stance from a rolling window of pose frames.
// Heuristic: the lead hand sits closer to the camera (smaller MediaPipe z,
// which is measured relative to hip midpoint). In orthodox the left hand
// leads; in southpaw the right hand leads.
export class StanceDetector {
  private samples: Sample[] = [];

  reset() {
    this.samples = [];
  }

  ingest(landmarks: PoseLandmarks[]) {
    if (
      !visible(
        landmarks,
        [LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
        0.5
      )
    ) {
      return;
    }
    this.samples.push({
      leftWristZ: landmarks[LM.LEFT_WRIST].z,
      rightWristZ: landmarks[LM.RIGHT_WRIST].z,
    });
    if (this.samples.length > 60) {
      this.samples.shift();
    }
  }

  get hasEnoughData() {
    return this.samples.length >= MIN_SAMPLES;
  }

  detect(): Stance | null {
    if (!this.hasEnoughData) return null;
    let leftSum = 0;
    let rightSum = 0;
    for (const s of this.samples) {
      leftSum += s.leftWristZ;
      rightSum += s.rightWristZ;
    }
    const avgLeft = leftSum / this.samples.length;
    const avgRight = rightSum / this.samples.length;

    // Tie margin: if the z values are close, don't guess.
    if (Math.abs(avgLeft - avgRight) < 0.03) return null;

    return avgLeft < avgRight ? 'orthodox' : 'southpaw';
  }
}
