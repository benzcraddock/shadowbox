'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCamera } from '@/lib/hooks/useCamera';
import { usePoseDetection } from '@/lib/hooks/usePoseDetection';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import StanceSelector from '@/components/StanceSelector';
import DefenseArrow from '@/components/DefenseArrow';
import type { MovementType, PunchType, Stance } from '@/lib/types/database';
import { PunchClassifier } from '@/lib/detection/punchClassifier';
import { DefenseClassifier } from '@/lib/detection/defenseClassifier';
import { StanceDetector } from '@/lib/detection/stanceDetector';
import { FormAnalyzer } from '@/lib/feedback/formAnalyzer';
import type { FormQuality } from '@/lib/types/detection';
import {
  checkFraming,
  elbowAngle,
  shoulderWidth,
  type FramingStatus,
} from '@/lib/utils/landmarkAnalysis';

const PUNCH_LABELS: Record<PunchType, string> = {
  1: 'Jab',
  2: 'Cross',
  3: 'Lead Hook',
  4: 'Rear Hook',
  5: 'Lead Uppercut',
  6: 'Rear Uppercut',
};

const DEFENSE_LABELS: Record<MovementType, string> = {
  slip_left: 'Slip Left',
  slip_right: 'Slip Right',
  duck: 'Duck',
  pull_back: 'Pull Back',
};

const CUE_TTL_MS = 1800;

const emptyPunchCounts = (): Record<PunchType, number> => ({
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
});

const emptyDefenseCounts = (): Record<MovementType, number> => ({
  slip_left: 0,
  slip_right: 0,
  duck: 0,
  pull_back: 0,
});

export default function TrainPage() {
  const router = useRouter();
  const supabase = createClient();
  const [debug] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('debug') === '1'
  );
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stance, setStance] = useState<Stance | null>(null);
  const [stanceLoaded, setStanceLoaded] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [statsVisible, setStatsVisible] = useState(true);

  const [punchCounts, setPunchCounts] = useState<Record<PunchType, number>>(emptyPunchCounts);
  const [defenseCounts, setDefenseCounts] = useState<Record<MovementType, number>>(emptyDefenseCounts);
  const [formTotal, setFormTotal] = useState(0);
  const [formSampleCount, setFormSampleCount] = useState(0);
  const [cue, setCue] = useState<{ text: string; quality: FormQuality } | null>(null);
  const [defenseFlash, setDefenseFlash] = useState<{
    key: number;
    type: MovementType;
    quality: FormQuality;
  } | null>(null);
  const defenseFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [framing, setFraming] = useState<FramingStatus>('waiting');
  const framingStreakRef = useRef<{ status: FramingStatus; count: number }>({
    status: 'waiting',
    count: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const { stream, error: cameraError, loading: cameraLoading, videoRef } = useCamera();

  const skeletonColor =
    cue?.quality === 'good'
      ? '#4ADE80'
      : cue?.quality === 'acceptable'
        ? '#FACC15'
        : cue?.quality === 'needs_correction'
          ? '#EF4444'
          : '#4ADE80';

  const { ready, error: poseError, fps, latestPose } = usePoseDetection({
    videoRef,
    canvasRef,
    enabled: !!stream && !cameraLoading,
    skeletonColor,
  });

  const punchClassifierRef = useRef<PunchClassifier | null>(null);
  const defenseClassifierRef = useRef<DefenseClassifier | null>(null);
  const formAnalyzerRef = useRef<FormAnalyzer | null>(null);
  const stanceDetectorRef = useRef<StanceDetector>(new StanceDetector());
  const [suggestedStance, setSuggestedStance] = useState<Stance | null>(null);
  const cueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPunches = useMemo(
    () => Object.values(punchCounts).reduce((a, b) => a + b, 0),
    [punchCounts]
  );
  const avgFormScore = formSampleCount > 0 ? Math.round(formTotal / formSampleCount) : null;

  // Check auth status
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  // Load stance from profile in parallel — does not block the camera mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from('users')
        .select('stance')
        .eq('id', user.id)
        .single();
      if (cancelled) return;
      setStance((profile?.stance as Stance | null) ?? null);
      setStanceLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  const saveStance = async (next: Stance) => {
    if (!user) return;
    const { error } = await supabase
      .from('users')
      .update({ stance: next })
      .eq('id', user.id);
    if (error) throw error;
    setStance(next);
  };

  // Instantiate (or re-stance) classifiers whenever the chosen stance changes.
  useEffect(() => {
    if (!stance) return;
    if (!punchClassifierRef.current) {
      punchClassifierRef.current = new PunchClassifier(stance);
    } else {
      punchClassifierRef.current.setStance(stance);
    }
    if (!defenseClassifierRef.current) {
      defenseClassifierRef.current = new DefenseClassifier();
    }
    if (!formAnalyzerRef.current) {
      formAnalyzerRef.current = new FormAnalyzer(stance);
    } else {
      formAnalyzerRef.current.setStance(stance);
    }
  }, [stance]);

  // Run classifiers on each new pose frame.
  useEffect(() => {
    if (!latestPose) return;
    const { landmarks, timestamp } = latestPose;

    // While the stance selector is open, sample poses to auto-suggest a stance.
    if (stanceLoaded && !stance) {
      stanceDetectorRef.current.ingest(landmarks);
      const guess = stanceDetectorRef.current.detect();
      if (guess && guess !== suggestedStance) setSuggestedStance(guess);
      return;
    }

    if (!stance) return;

    const punchCls = punchClassifierRef.current;
    const defenseCls = defenseClassifierRef.current;
    const form = formAnalyzerRef.current;
    if (!punchCls || !defenseCls || !form) return;

    const rawFraming = checkFraming(landmarks);
    // Hysteresis: "ok" takes effect immediately, but a bad status must
    // persist ~5 frames before flipping the banner on. Prevents flicker
    // during transient visibility dips (e.g. pulling back or bobbing).
    const streak = framingStreakRef.current;
    if (rawFraming === streak.status) {
      streak.count += 1;
    } else {
      streak.status = rawFraming;
      streak.count = 1;
    }
    const effectiveFraming: FramingStatus =
      rawFraming === 'ok' || streak.count >= 5 ? rawFraming : framing;
    if (effectiveFraming !== framing) setFraming(effectiveFraming);

    // Don't classify while the user is mis-framed — walking around,
    // too close/far, or partially out of view produces false positives.
    if (effectiveFraming !== 'ok') {
      punchCls.reset();
      return;
    }

    const punchEvent = punchCls.ingest(landmarks, timestamp);
    if (punchEvent) {
      const analysis = form.analyzePunch(punchEvent, landmarks);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[punch]', {
          type: punchEvent.type,
          side: punchEvent.side,
          peakAngle: Math.round(punchEvent.peakElbowAngle),
          peakVel: punchEvent.peakWristVelocity.toFixed(2),
          score: analysis.score,
        });
      }
      setPunchCounts((prev) => ({
        ...prev,
        [punchEvent.type]: prev[punchEvent.type] + 1,
      }));
      setFormTotal((t) => t + analysis.score);
      setFormSampleCount((n) => n + 1);
      flashCue(
        `${PUNCH_LABELS[punchEvent.type]} · ${analysis.score}${analysis.issues[0] ? ` — ${analysis.issues[0]}` : ''}`,
        analysis.quality
      );
    }

    const defenseEvent = defenseCls.ingest(landmarks, timestamp);
    if (defenseEvent) {
      const analysis = form.analyzeDefense(defenseEvent, landmarks);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[defense]', {
          type: defenseEvent.type,
          confidence: defenseEvent.confidence.toFixed(2),
          score: analysis.score,
        });
      }
      setDefenseCounts((prev) => ({
        ...prev,
        [defenseEvent.type]: prev[defenseEvent.type] + 1,
      }));
      setFormTotal((t) => t + analysis.score);
      setFormSampleCount((n) => n + 1);
      flashCue(
        `${DEFENSE_LABELS[defenseEvent.type]} · ${analysis.score}${analysis.issues[0] ? ` — ${analysis.issues[0]}` : ''}`,
        analysis.quality
      );
      setDefenseFlash({
        key: Date.now(),
        type: defenseEvent.type,
        quality: analysis.quality,
      });
      if (defenseFlashTimerRef.current) clearTimeout(defenseFlashTimerRef.current);
      defenseFlashTimerRef.current = setTimeout(() => setDefenseFlash(null), 1200);
    }
  }, [latestPose, stance]);

  const flashCue = (text: string, quality: FormQuality) => {
    setCue({ text, quality });
    if (cueTimerRef.current) clearTimeout(cueTimerRef.current);
    cueTimerRef.current = setTimeout(() => setCue(null), CUE_TTL_MS);
  };

  useEffect(() => {
    return () => {
      if (cueTimerRef.current) clearTimeout(cueTimerRef.current);
      if (defenseFlashTimerRef.current) clearTimeout(defenseFlashTimerRef.current);
    };
  }, []);

  // Start session timer once stance is chosen and pose detection is live
  useEffect(() => {
    if (!sessionStartTime && ready && stream && stance) {
      setSessionStartTime(new Date());
    }
  }, [ready, stream, sessionStartTime, stance]);

  // Update elapsed time
  useEffect(() => {
    if (!sessionStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Sync canvas size with video
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const updateCanvasSize = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };

    video.addEventListener('loadedmetadata', updateCanvasSize);
    return () => video.removeEventListener('loadedmetadata', updateCanvasSize);
  }, [videoRef]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  const cueColorClass =
    cue?.quality === 'good'
      ? 'border-accent-positive text-accent-positive'
      : cue?.quality === 'acceptable'
        ? 'border-accent-neutral text-accent-neutral'
        : cue?.quality === 'needs_correction'
          ? 'border-accent-negative text-accent-negative'
          : 'border-border-subtle text-text-secondary';

  const debugMetrics = debug && latestPose
    ? {
        shoulderWidth: shoulderWidth(latestPose.landmarks).toFixed(3),
        leftElbow: Math.round(elbowAngle('left', latestPose.landmarks)),
        rightElbow: Math.round(elbowAngle('right', latestPose.landmarks)),
      }
    : null;

  const framingMessage: Record<FramingStatus, string | null> = {
    ok: null,
    waiting: null,
    too_close: 'Step back — you\'re too close to the camera',
    too_far: 'Move closer — we can\'t see your shoulders clearly',
    out_of_frame: 'Frame your whole upper body in view',
  };
  const framingBanner = ready && stance ? framingMessage[framing] : null;

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {stanceLoaded && !stance && (
        <StanceSelector
          onSelect={saveStance}
          initialStance={suggestedStance}
          subtitle={
            suggestedStance
              ? `We detected you're probably ${suggestedStance}. Confirm or pick the other.`
              : undefined
          }
        />
      )}
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-bg-surface border-b border-border-subtle">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-semibold text-text-primary">ShadowBox</h1>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">Session Time:</span>
              <span className="text-text-primary font-mono text-lg">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">Total Punches:</span>
              <span className="text-text-primary font-semibold text-lg">
                {totalPunches}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {ready && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-positive animate-pulse"></div>
              <span className="text-text-secondary text-sm">{fps} FPS</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Camera Feed (70%) */}
        <div className="flex-[0.7] relative bg-black flex items-center justify-center">
          {cameraLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-primary">
              <div className="mb-4">
                <div className="w-16 h-16 border-4 border-accent-neutral border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-text-secondary">Initializing camera...</p>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-primary">
              <div className="max-w-md text-center">
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  Camera Access Required
                </h3>
                <p className="text-text-secondary mb-4">{cameraError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-text-primary text-bg-primary rounded-[8px] hover:bg-text-secondary transition-all"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {poseError && (
            <div className="absolute top-4 left-4 right-4 p-4 bg-accent-negative-alpha/10 border border-accent-negative-alpha rounded-[8px]">
              <p className="text-sm text-accent-negative">{poseError}</p>
            </div>
          )}

          {framingBanner && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-3 bg-bg-elevated/90 backdrop-blur-sm border border-accent-neutral rounded-[8px] z-10">
              <p className="text-sm font-medium text-accent-neutral">
                {framingBanner}
              </p>
            </div>
          )}

          {debugMetrics && (
            <div className="absolute top-4 right-4 px-4 py-3 bg-bg-elevated/90 backdrop-blur-sm border border-border-subtle rounded-[8px] z-10 font-mono text-xs text-text-secondary space-y-1 pointer-events-none">
              <div>framing: <span className="text-text-primary">{framing}</span></div>
              <div>shoulder w: <span className="text-text-primary">{debugMetrics.shoulderWidth}</span></div>
              <div>L elbow: <span className="text-text-primary">{debugMetrics.leftElbow}°</span></div>
              <div>R elbow: <span className="text-text-primary">{debugMetrics.rightElbow}°</span></div>
            </div>
          )}

          {/* Video Element (hidden, used for pose detection) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-contain"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Canvas Overlay for Skeleton */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ transform: 'scaleX(-1)' }}
          />

          {defenseFlash && (
            <DefenseArrow
              key={defenseFlash.key}
              type={defenseFlash.type}
              quality={defenseFlash.quality}
            />
          )}

          {/* Feedback Overlay (bottom center) */}
          <div
            className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-bg-elevated/90 backdrop-blur-sm border rounded-[8px] transition-colors ${cueColorClass}`}
          >
            <p className="text-sm font-medium">
              {cue?.text ?? (!ready ? 'Initializing pose detection...' : 'Ready to train')}
            </p>
          </div>
        </div>

        {/* Stats Panel (30%) */}
        {statsVisible && (
          <div className="flex-[0.3] bg-bg-surface border-l border-border-subtle overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Stats</h2>
                <button
                  onClick={() => setStatsVisible(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Punch Breakdown */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
                  Punch Breakdown
                </h3>
                <div className="space-y-3">
                  {([1, 2, 3, 4, 5, 6] as PunchType[]).map((number) => (
                    <div
                      key={number}
                      className="flex items-center justify-between p-3 bg-bg-primary rounded-[8px]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-bg-elevated rounded-full text-text-primary font-semibold text-sm">
                          {number}
                        </span>
                        <span className="text-text-primary">{PUNCH_LABELS[number]}</span>
                      </div>
                      <span className="text-text-primary font-semibold">
                        {punchCounts[number]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Defense Breakdown */}
              <div className="mt-8 space-y-4">
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
                  Defensive Movements
                </h3>
                <div className="space-y-3">
                  {(Object.keys(DEFENSE_LABELS) as MovementType[]).map((type) => (
                    <div
                      key={type}
                      className="flex items-center justify-between p-3 bg-bg-primary rounded-[8px]"
                    >
                      <span className="text-text-primary">{DEFENSE_LABELS[type]}</span>
                      <span className="text-text-primary font-semibold">
                        {defenseCounts[type]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Score */}
              <div className="mt-8">
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-4">
                  Avg Form Score
                </h3>
                <div className="p-6 bg-bg-primary rounded-[8px] text-center">
                  <div className="text-5xl font-semibold text-text-primary mb-2">
                    {avgFormScore ?? '--'}
                  </div>
                  <div className="text-text-secondary text-sm">
                    Out of 100
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Stats Button (when hidden) */}
        {!statsVisible && (
          <button
            onClick={() => setStatsVisible(true)}
            className="absolute right-4 top-24 px-4 py-2 bg-bg-surface border border-border-subtle rounded-[8px] text-text-primary hover:bg-bg-elevated transition-all"
          >
            Show Stats
          </button>
        )}
      </div>
    </div>
  );
}
