'use client';

import { useEffect, useRef, useState } from 'react';
import { useCamera } from '@/lib/hooks/useCamera';
import { usePoseDetection } from '@/lib/hooks/usePoseDetection';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import StanceSelector from '@/components/StanceSelector';
import type { Stance } from '@/lib/types/database';

export default function TrainPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stance, setStance] = useState<Stance | null>(null);
  const [stanceLoaded, setStanceLoaded] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [punchCount, setPunchCount] = useState(0);
  const [statsVisible, setStatsVisible] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const { stream, error: cameraError, loading: cameraLoading, videoRef } = useCamera();
  const { ready, error: poseError, fps, latestPose } = usePoseDetection({
    videoRef,
    canvasRef,
    enabled: !!stream && !cameraLoading,
  });

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

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle logout
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

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {stanceLoaded && !stance && <StanceSelector onSelect={saveStance} />}
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
                {punchCount}
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

          {/* Feedback Overlay (bottom center) */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-bg-elevated/90 backdrop-blur-sm border border-border-subtle rounded-[8px]">
            <p className="text-text-secondary text-sm">
              {!ready ? 'Initializing pose detection...' : 'Ready to train'}
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
                  {[
                    { name: 'Jab', number: 1, count: 0 },
                    { name: 'Cross', number: 2, count: 0 },
                    { name: 'Lead Hook', number: 3, count: 0 },
                    { name: 'Rear Hook', number: 4, count: 0 },
                    { name: 'Lead Uppercut', number: 5, count: 0 },
                    { name: 'Rear Uppercut', number: 6, count: 0 },
                  ].map((punch) => (
                    <div
                      key={punch.number}
                      className="flex items-center justify-between p-3 bg-bg-primary rounded-[8px]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-bg-elevated rounded-full text-text-primary font-semibold text-sm">
                          {punch.number}
                        </span>
                        <span className="text-text-primary">{punch.name}</span>
                      </div>
                      <span className="text-text-primary font-semibold">
                        {punch.count}
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
                    --
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
