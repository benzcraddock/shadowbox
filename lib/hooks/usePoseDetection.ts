'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export interface PoseLandmarks {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseDetectionResult {
  landmarks: PoseLandmarks[];
  worldLandmarks: PoseLandmarks[];
  timestamp: number;
}

interface UsePoseDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  enabled: boolean;
}

export function usePoseDetection({ videoRef, canvasRef, enabled }: UsePoseDetectionProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [latestPose, setLatestPose] = useState<PoseDetectionResult | null>(null);

  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

  // Initialize MediaPipe Pose Landmarker
  useEffect(() => {
    let mounted = true;

    const initializePoseDetection = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (mounted) {
          poseLandmarkerRef.current = poseLandmarker;
          setReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize pose detection');
          console.error('Pose detection initialization error:', err);
        }
      }
    };

    initializePoseDetection();

    return () => {
      mounted = false;
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
    };
  }, []);

  // Render skeleton on canvas
  const renderSkeleton = useCallback(
    (landmarks: any[]) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (landmarks && landmarks.length > 0) {
        const drawingUtils = new DrawingUtils(ctx);

        // Draw landmarks with custom styling
        drawingUtils.drawLandmarks(landmarks, {
          radius: 4,
          color: '#4ADE80',
          fillColor: 'rgba(74, 222, 128, 0.8)',
        });

        drawingUtils.drawConnectors(
          landmarks,
          PoseLandmarker.POSE_CONNECTIONS,
          {
            color: '#4ADE80',
            lineWidth: 2,
          }
        );
      }
    },
    [canvasRef, videoRef]
  );

  // Main detection loop
  const detectPose = useCallback(async () => {
    const video = videoRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (!video || !poseLandmarker || !enabled || !ready) return;

    if (video.readyState >= 2) {
      const now = Date.now();
      const results = poseLandmarker.detectForVideo(video, now);

      if (results.landmarks && results.landmarks.length > 0) {
        const poseResult: PoseDetectionResult = {
          landmarks: results.landmarks[0].map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          })),
          worldLandmarks: results.worldLandmarks[0].map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          })),
          timestamp: now,
        };

        setLatestPose(poseResult);
        renderSkeleton(results.landmarks[0]);
      }

      // Calculate FPS
      const counter = fpsCounterRef.current;
      counter.frames++;
      if (now - counter.lastTime >= 1000) {
        setFps(counter.frames);
        counter.frames = 0;
        counter.lastTime = now;
      }

      lastFrameTimeRef.current = now;
    }

    animationFrameRef.current = requestAnimationFrame(detectPose);
  }, [videoRef, enabled, ready, renderSkeleton]);

  // Start/stop detection loop
  useEffect(() => {
    if (enabled && ready) {
      detectPose();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, ready, detectPose]);

  return {
    ready,
    error,
    fps,
    latestPose,
  };
}
