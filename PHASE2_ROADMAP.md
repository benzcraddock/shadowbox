# Phase 2 Roadmap: Intelligence Layer

Phase 1 is complete! We now have a fully functional foundation with:
- ✅ Authentication (email + Google OAuth)
- ✅ Camera access and permission handling
- ✅ Real-time pose detection with MediaPipe
- ✅ Skeleton overlay rendering at 30fps
- ✅ Training view UI with session tracking
- ✅ Database schema with RLS

## Phase 2 Goals

Add the intelligence layer to classify punches, detect defensive movements, and provide real-time form feedback.

## Task Breakdown

### 0. Stance Selection UI (MUST DO FIRST)

**Files**: `components/StanceSelector.tsx`, update user profile

**Why**: Punch classification depends on knowing if the user is orthodox or southpaw.

**Implementation**:
- Modal/dialog that appears on first training session
- Two options: Orthodox (right-handed) or Southpaw (left-handed)
- Include helpful graphics/descriptions:
  - Orthodox: "Left hand forward (jab), right hand back (cross)"
  - Southpaw: "Right hand forward (jab), left hand back (cross)"
- Save to user profile in database
- Allow changing in settings later
- Auto-detect option (future enhancement): analyze which hand extends more often

**Why This Matters**:
- Determines which hand is lead (jab) vs rear (cross)
- Critical for accurate punch type classification
- Affects all punch numbering (1=jab is lead hand, 2=cross is rear hand)

### 1. Configuration System for Form Benchmarks

**File**: `lib/config/formBenchmarks.ts`

Create a centralized, easily tunable configuration object for all form thresholds:

```typescript
export const PUNCH_THRESHOLDS = {
  jab: {
    minElbowExtension: 160, // degrees
    maxElbowExtension: 180,
    minShoulderRotation: 15,
    // ... other thresholds
  },
  // ... other punches
};

export const DEFENSE_THRESHOLDS = {
  slip: {
    minHeadDisplacement: 0.15, // 15% of shoulder width
    maxHeadDisplacement: 0.4,
    // ... other thresholds
  },
  // ... other movements
};
```

### 2. Landmark Analysis Utilities

**File**: `lib/utils/landmarkAnalysis.ts`

Helper functions to calculate angles, distances, and velocities from pose landmarks:

```typescript
- calculateAngle(point1, point2, point3): number
- calculateDistance(point1, point2): number
- calculateVelocity(currentPos, previousPos, timeDelta): number
- getShoulderMidpoint(landmarks): Point
- getHipRotation(landmarks): number
- getElbowAngle(side, landmarks): number
```

### 3. Punch Classification Engine

**File**: `lib/detection/punchClassifier.ts`

Core logic to detect and classify the 6 punch types:

```typescript
export class PunchClassifier {
  private previousLandmarks: PoseLandmarks[] = [];
  private punchBuffer: PunchEvent[] = [];

  detectPunch(currentLandmarks: PoseLandmarks[]): PunchDetectionResult | null {
    // Analyze wrist trajectory
    // Check elbow angle changes
    // Measure shoulder rotation
    // Identify punch type (1-6)
    // Return: { type, confidence, timestamp }
  }

  getPunchType(landmarks, trajectory): PunchType {
    // Decision tree or simple heuristics
    // Lead vs rear (based on which arm extended)
    // Straight vs hook vs uppercut (based on trajectory pattern)
  }
}
```

**Punch Detection Heuristics:**
- **Jab (1)**: Lead arm extension >160°, small shoulder rotation
- **Cross (2)**: Rear arm extension >160°, hip rotation ~45°
- **Lead Hook (3)**: Lead elbow ~90°, lateral motion, torso rotation
- **Rear Hook (4)**: Rear elbow ~90°, lateral motion, torso rotation
- **Lead Uppercut (5)**: Lead hand drops then rises, vertical trajectory
- **Rear Uppercut (6)**: Rear hand drops then rises, vertical trajectory

### 4. Defensive Movement Detection

**File**: `lib/detection/defenseClassifier.ts`

Detect 4 defensive movements:

```typescript
export class DefenseClassifier {
  private baselineHeadHeight: number;
  private shoulderWidth: number;

  detectDefense(currentLandmarks: PoseLandmarks[]): DefenseDetectionResult | null {
    // Track head (nose) position relative to shoulders
    // Detect:
    // - Slip Left: head moves >15% left of shoulder midpoint
    // - Slip Right: head moves >15% right of shoulder midpoint
    // - Duck: head drops >20% from baseline height
    // - Pull Back: head moves back (z-axis change)
  }

  calibrate(landmarks: PoseLandmarks[]) {
    // Set baseline standing height and shoulder width
    // Call this when user first enters training mode
  }
}
```

### 5. Form Feedback Engine

**File**: `lib/feedback/formAnalyzer.ts`

Analyze form quality and generate feedback cues:

```typescript
export class FormAnalyzer {
  analyzePunchForm(
    punchType: PunchType,
    landmarks: PoseLandmarks[]
  ): FormAnalysis {
    // Check form against benchmarks from config
    // Return: {
    //   score: 0-100,
    //   issues: string[],  // e.g., "Rotate hips more", "Return to guard"
    //   quality: 'good' | 'acceptable' | 'needs_correction'
    // }
  }

  analyzeDefenseForm(
    movementType: MovementType,
    landmarks: PoseLandmarks[]
  ): FormAnalysis {
    // Similar to punch analysis
  }

  getFormColor(quality: 'good' | 'acceptable' | 'needs_correction'): string {
    // Return color for skeleton overlay
    // good -> green, acceptable -> yellow, needs_correction -> red
  }
}
```

### 6. Integrate into Training View

**Update**: `app/(app)/train/page.tsx`

- Instantiate classifiers on component mount
- Run classification on each pose update (from `latestPose`)
- Update punch counters by type
- Show real-time feedback text overlay
- Change skeleton color based on form quality
- Log detections to state (for later database save)

### 7. Visual Feedback Overlays

**Component**: `components/FeedbackOverlay.tsx`

- Display current form cue text (bottom of camera view)
- Fade in/out animation (150ms in, 1.5s hold, fade out)
- Color-coded background based on feedback type

**Component**: `components/DefenseArrow.tsx`

- Directional arrow overlay for defensive movements
- Green/yellow/red color based on form quality
- Animate in when defense detected

### 8. Update Stats Panel

**Update**: `app/(app)/train/page.tsx`

- Display punch breakdown by type (1-6)
- Show avg form score gauge
- Add defensive movement counters
- Real-time updates as punches/movements detected

### 9. Testing & Calibration

- Test each punch type in front of camera
- Tune thresholds in `formBenchmarks.ts` based on testing
- Ensure >80% classification accuracy for punches
- Ensure >75% detection accuracy for defensive movements
- Test with both orthodox and southpaw stances

### 10. Stance Detection

**File**: `lib/detection/stanceDetector.ts`

Auto-detect orthodox vs southpaw on first pose:

```typescript
export function detectStance(landmarks: PoseLandmarks[]): Stance {
  // Compare left vs right hand forward position
  // Return 'orthodox' or 'southpaw'
}
```

## Success Criteria for Phase 2

- [ ] Punch classification working with >80% accuracy
- [ ] All 6 punch types correctly identified
- [ ] Defensive movements detected with >75% accuracy
- [ ] Form feedback appears within 200ms of detection
- [ ] Skeleton changes color based on form quality
- [ ] Stats panel updates in real-time
- [ ] Form thresholds easily tunable via config
- [ ] Works for both orthodox and southpaw stances

## Files to Create

```
lib/
├── config/
│   └── formBenchmarks.ts          # NEW
├── utils/
│   └── landmarkAnalysis.ts        # NEW
├── detection/
│   ├── punchClassifier.ts         # NEW
│   ├── defenseClassifier.ts       # NEW
│   └── stanceDetector.ts          # NEW
├── feedback/
│   └── formAnalyzer.ts            # NEW
└── types/
    └── detection.ts               # NEW (types for punch/defense events)

components/
├── FeedbackOverlay.tsx            # NEW
└── DefenseArrow.tsx               # NEW
```

## Estimated Effort

- Configuration & utilities: 2 hours
- Punch classification: 4 hours
- Defense detection: 3 hours
- Form feedback engine: 2 hours
- UI integration: 3 hours
- Testing & tuning: 4 hours

**Total: ~18 hours**

## Next Steps After Phase 2

Once Phase 2 is complete, move to **Phase 3: Progression System**:
- Combo prompt system
- Combo tracking and scoring
- Session persistence to database
- Progress dashboard with charts
