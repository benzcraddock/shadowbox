'use client';

import { useEffect, useRef, useState } from 'react';
import { useCamera } from '@/lib/hooks/useCamera';
import { usePoseDetection } from '@/lib/hooks/usePoseDetection';

export default function DemoPage() {
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [statsVisible, setStatsVisible] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const { stream, error: cameraError, loading: cameraLoading, videoRef } = useCamera();
  const { ready, error: poseError, fps } = usePoseDetection({
    videoRef,
    canvasRef,
    enabled: !!stream && !cameraLoading,
  });

  // Start session timer
  useEffect(() => {
    if (!sessionStartTime && ready && stream) {
      setSessionStartTime(new Date());
    }
  }, [ready, stream, sessionStartTime]);

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

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-bg-surface border-b border-border-subtle">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-semibold text-text-primary">ShadowBox Demo</h1>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">Session Time:</span>
              <span className="text-text-primary font-mono text-lg">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <div className="px-3 py-1 bg-accent-neutral/20 border border-accent-neutral/40 rounded-full">
              <span className="text-accent-neutral text-xs font-medium">DEMO MODE - No Auth Required</span>
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
              {!ready ? 'Initializing pose detection...' : 'Wave your arms to test pose detection!'}
            </p>
          </div>
        </div>

        {/* Stats Panel (30%) */}
        {statsVisible && (
          <div className="flex-[0.3] bg-bg-surface border-l border-border-subtle overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Demo Stats</h2>
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

              <div className="mb-6 p-4 bg-accent-neutral/10 border border-accent-neutral/30 rounded-[8px]">
                <p className="text-sm text-text-secondary mb-2">
                  This is a demo mode to test the camera and pose detection without setting up Supabase.
                </p>
                <p className="text-xs text-text-secondary">
                  Punch classification coming in Phase 2!
                </p>
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
                  System Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-bg-primary rounded-[8px]">
                    <span className="text-text-primary">Camera</span>
                    <span className={`font-semibold ${stream ? 'text-accent-positive' : 'text-text-secondary'}`}>
                      {stream ? '✓ Active' : cameraLoading ? 'Loading...' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-primary rounded-[8px]">
                    <span className="text-text-primary">Pose Detection</span>
                    <span className={`font-semibold ${ready ? 'text-accent-positive' : 'text-text-secondary'}`}>
                      {ready ? '✓ Ready' : 'Initializing...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-primary rounded-[8px]">
                    <span className="text-text-primary">Frame Rate</span>
                    <span className="text-text-primary font-semibold">
                      {fps} FPS
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-8">
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-4">
                  What to Try
                </h3>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="text-accent-positive">•</span>
                    <span>Wave your arms and watch the skeleton track your movement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-positive">•</span>
                    <span>Try throwing punches (classification coming in Phase 2)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-positive">•</span>
                    <span>Check the FPS counter to verify 30fps performance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-positive">•</span>
                    <span>Notice how the skeleton overlay follows your body in real-time</span>
                  </li>
                </ul>
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
