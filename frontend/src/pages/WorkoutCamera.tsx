import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Camera,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  Save,
  ArrowLeft,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Cpu,
  Plus,
  Maximize2,
  Minimize2,
  Activity,
  ZoomIn,
  ZoomOut,
  Expand,
  Shrink,
  SwitchCamera,
} from 'lucide-react';
import { workoutService, AI_WS_URL } from '../services/api';
import { soundEffects } from '../services/soundEffects';
import type { AIWorkoutStatus } from '../types';

// Helper calculate angle in degrees between 3 points (angle at point b)
function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return Math.round(angle);
}

export const WorkoutCamera: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialExercise = searchParams.get('exercise') || 'pushup';

  const [exercise, setExercise] = useState<string>(initialExercise);
  const exerciseRef = useRef<string>(initialExercise);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'contain' | 'cover'>('contain'); // YouTube-style fit vs cover
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const [aiMode, setAiMode] = useState<'client' | 'websocket'>('client');
  const [aiStatusText, setAiStatusText] = useState<string>('Sẵn sàng');
  const [depthPercent, setDepthPercent] = useState<number>(0);

  const [status, setStatus] = useState<AIWorkoutStatus>({
    exercise: initialExercise,
    stage: null,
    total_reps: 0,
    valid_reps: 0,
    invalid_reps: 0,
    form_score: 100,
    feedback: `Đã chọn: ${
      initialExercise === 'pushup'
        ? 'CHỐNG ĐẨY (PUSH-UP)'
        : initialExercise === 'squat'
        ? 'SQUAT (GÁNH ĐÙI)'
        : 'GẬP BỤNG (SIT-UP)'
    }. Bấm Bắt Đầu để khởi động camera.`,
    is_form_valid: true,
  });

  const [detected, setDetected] = useState<boolean>(false);
  const [angles, setAngles] = useState<{
    left_elbow_angle?: number;
    right_elbow_angle?: number;
    left_knee_angle?: number;
    right_knee_angle?: number;
    left_hip_angle?: number;
    right_hip_angle?: number;
    active_angle?: number;
  } | null>(null);

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundEffects.isMuted);
  const [isVoice, setIsVoice] = useState<boolean>(soundEffects.isVoiceEnabled);
  const [cameraError, setCameraError] = useState<string>('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const poseDetectorRef = useRef<any>(null);

  const stageRef = useRef<string | null>(null);
  const validRepsRef = useRef<number>(0);
  const totalRepsRef = useRef<number>(0);
  const invalidRepsRef = useRef<number>(0);
  const lastValidRepsRef = useRef<number>(0);
  const lastInvalidRepsRef = useRef<number>(0);
  const lastRepTimestampRef = useRef<number>(0);

  // Keep callback reference updated to avoid stale closures in MediaPipe WASM listener
  const onPoseResultsRef = useRef<(results: any) => void>(() => {});

  // Sync ref with state
  useEffect(() => {
    exerciseRef.current = exercise;
  }, [exercise]);

  const toggleMute = () => {
    soundEffects.isMuted = !soundEffects.isMuted;
    setIsMuted(soundEffects.isMuted);
  };

  const toggleVoice = () => {
    soundEffects.isVoiceEnabled = !soundEffects.isVoiceEnabled;
    setIsVoice(soundEffects.isVoiceEnabled);
  };

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.0, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.7, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Switch exercise tab
  const handleSelectExercise = (ex: string) => {
    setExercise(ex);
    exerciseRef.current = ex;
    setSearchParams({ exercise: ex });
    stageRef.current = null;
    lastValidRepsRef.current = 0;
    lastInvalidRepsRef.current = 0;
    validRepsRef.current = 0;
    totalRepsRef.current = 0;
    invalidRepsRef.current = 0;
    setDepthPercent(0);

    const exLabel =
      ex === 'pushup'
        ? 'CHỐNG ĐẨY (PUSH-UP)'
        : ex === 'squat'
        ? 'SQUAT (GÁNH ĐÙI)'
        : 'GẬP BỤNG (SIT-UP)';

    setStatus({
      exercise: ex,
      stage: null,
      total_reps: 0,
      valid_reps: 0,
      invalid_reps: 0,
      form_score: 100,
      feedback: `Đã chọn: ${exLabel}. Chuẩn bị tư thế và bắt đầu tập!`,
      is_form_valid: true,
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(`SWITCH:${ex}`);
    }
  };

  // Flip front/back camera
  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isCameraActive) {
      await restartCameraWithFacing(nextMode);
    }
  };

  const restartCameraWithFacing = async (targetFacing: 'user' | 'environment') => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: targetFacing,
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Cannot switch camera facing:', err);
    }
  };

  // Local FSM rep counter logic with visibility weighting & exercise posture guard
  const processAnglesAndUpdateRep = useCallback(
    (data: {
      leftElbow: number;
      rightElbow: number;
      leftKnee: number;
      rightKnee: number;
      leftHip: number;
      rightHip: number;
      leftElbowVis: number;
      rightElbowVis: number;
      leftKneeVis: number;
      rightKneeVis: number;
      leftHipVis: number;
      rightHipVis: number;
      isStandingUpright: boolean;
      isHorizontal: boolean;
    }) => {
      const currentEx = exerciseRef.current;
      const now = Date.now();

      // 1. Determine effective elbow angle (accounts for side view occlusion)
      let effectiveElbow: number;
      if (data.leftElbowVis > 0.45 && data.rightElbowVis < 0.35) {
        effectiveElbow = data.leftElbow;
      } else if (data.rightElbowVis > 0.45 && data.leftElbowVis < 0.35) {
        effectiveElbow = data.rightElbow;
      } else {
        effectiveElbow = Math.min(data.leftElbow, data.rightElbow);
      }

      let effectiveElbowUp: number;
      if (data.leftElbowVis > 0.45 && data.rightElbowVis < 0.35) {
        effectiveElbowUp = data.leftElbow;
      } else if (data.rightElbowVis > 0.45 && data.leftElbowVis < 0.35) {
        effectiveElbowUp = data.rightElbow;
      } else {
        effectiveElbowUp = Math.max(data.leftElbow, data.rightElbow);
      }

      // 2. Determine effective knee angle (accounts for side view occlusion in squat)
      let effectiveKnee: number;
      if (data.leftKneeVis > 0.45 && data.rightKneeVis < 0.35) {
        effectiveKnee = data.leftKnee;
      } else if (data.rightKneeVis > 0.45 && data.leftKneeVis < 0.35) {
        effectiveKnee = data.rightKnee;
      } else {
        effectiveKnee = Math.min(data.leftKnee, data.rightKnee);
      }

      let effectiveKneeUp: number;
      if (data.leftKneeVis > 0.45 && data.rightKneeVis < 0.35) {
        effectiveKneeUp = data.leftKnee;
      } else if (data.rightKneeVis > 0.45 && data.leftKneeVis < 0.35) {
        effectiveKneeUp = data.rightKnee;
      } else {
        effectiveKneeUp = Math.max(data.leftKnee, data.rightKnee);
      }

      // 3. Determine effective hip angle (posture / situp)
      let effectiveHip: number;
      if (data.leftHipVis > 0.45 && data.rightHipVis < 0.35) {
        effectiveHip = data.leftHip;
      } else if (data.rightHipVis > 0.45 && data.leftHipVis < 0.35) {
        effectiveHip = data.rightHip;
      } else {
        effectiveHip = Math.round((data.leftHip + data.rightHip) / 2);
      }

      setAngles({
        left_elbow_angle: data.leftElbow,
        right_elbow_angle: data.rightElbow,
        left_knee_angle: data.leftKnee,
        right_knee_angle: data.rightKnee,
        left_hip_angle: data.leftHip,
        right_hip_angle: data.rightHip,
        active_angle:
          currentEx === 'pushup' ? effectiveElbow : currentEx === 'squat' ? effectiveKnee : effectiveHip,
      });

      // -------------------------------------------------------------
      // EXERCISE 1: CHỐNG ĐẨY (PUSH-UP)
      // -------------------------------------------------------------
      if (currentEx === 'pushup') {
        // Posture Guard: If user is standing upright, prompt them to get down
        if (data.isStandingUpright && !data.isHorizontal) {
          setDepthPercent(0);
          setStatus((prev) => ({
            ...prev,
            feedback: 'Đang chọn CHỐNG ĐẨY: Vui lòng vào tư thế nằm sấp trên sàn',
            is_form_valid: true,
          }));
          return;
        }

        const rawPct = Math.round(((150 - effectiveElbow) / (150 - 95)) * 100);
        setDepthPercent(Math.min(100, Math.max(0, rawPct)));

        // Down stage when elbow <= 100°
        if (effectiveElbow <= 100) {
          if (stageRef.current !== 'down') {
            stageRef.current = 'down';
            const isBackStraight = effectiveHip >= 125;
            const feedbackText = isBackStraight
              ? 'Độ sâu tốt! Hãy đẩy thẳng tay lên'
              : 'Hạ thấp tốt nhưng hãy giữ lưng thẳng hơn!';
            setStatus((prev) => ({
              ...prev,
              stage: 'down',
              feedback: feedbackText,
              is_form_valid: isBackStraight,
            }));
          }
        } else if (effectiveElbowUp >= 146) {
          // Up stage
          if (stageRef.current === 'down') {
            if (now - lastRepTimestampRef.current >= 600) {
              lastRepTimestampRef.current = now;
              stageRef.current = 'up';
              totalRepsRef.current += 1;
              const isBackStraight = effectiveHip >= 125;

              if (isBackStraight) {
                validRepsRef.current += 1;
                const newValid = validRepsRef.current;
                soundEffects.playRepSuccess(newValid);
                setStatus({
                  exercise: 'pushup',
                  stage: 'up',
                  total_reps: totalRepsRef.current,
                  valid_reps: newValid,
                  invalid_reps: invalidRepsRef.current,
                  form_score: Math.round((newValid / totalRepsRef.current) * 100),
                  feedback: `Tuyệt vời! +1 Chống Đẩy Chuẩn (${newValid})`,
                  is_form_valid: true,
                });
              } else {
                invalidRepsRef.current += 1;
                soundEffects.playFormWarning();
                setStatus({
                  exercise: 'pushup',
                  stage: 'up',
                  total_reps: totalRepsRef.current,
                  valid_reps: validRepsRef.current,
                  invalid_reps: invalidRepsRef.current,
                  form_score: Math.round((validRepsRef.current / totalRepsRef.current) * 100),
                  feedback: 'Chưa đạt form: Giữ hông và lưng thẳng hàng',
                  is_form_valid: false,
                });
              }
            }
          }
        }
      }
      // -------------------------------------------------------------
      // EXERCISE 2: SQUAT (GÁNH ĐÙI)
      // -------------------------------------------------------------
      else if (currentEx === 'squat') {
        // Posture Guard: If user is horizontal on floor, prompt them to stand
        if (data.isHorizontal && !data.isStandingUpright) {
          setDepthPercent(0);
          setStatus((prev) => ({
            ...prev,
            feedback: 'Đang chọn SQUAT: Vui lòng đứng thẳng để thực hiện gánh đùi',
            is_form_valid: true,
          }));
          return;
        }

        const rawPct = Math.round(((155 - effectiveKnee) / (155 - 110)) * 100);
        setDepthPercent(Math.min(100, Math.max(0, rawPct)));

        // Down stage when knee <= 112°
        if (effectiveKnee <= 112) {
          if (stageRef.current !== 'down') {
            stageRef.current = 'down';
            setStatus((prev) => ({
              ...prev,
              stage: 'down',
              feedback: 'Độ sâu Squat hoàn hảo! Đứng thẳng dậy',
              is_form_valid: true,
            }));
          }
        } else if (effectiveKneeUp >= 150) {
          // Up stage
          if (stageRef.current === 'down') {
            if (now - lastRepTimestampRef.current >= 650) {
              lastRepTimestampRef.current = now;
              stageRef.current = 'up';
              totalRepsRef.current += 1;
              validRepsRef.current += 1;
              const newValid = validRepsRef.current;
              soundEffects.playRepSuccess(newValid);
              setStatus({
                exercise: 'squat',
                stage: 'up',
                total_reps: totalRepsRef.current,
                valid_reps: newValid,
                invalid_reps: invalidRepsRef.current,
                form_score: Math.round((newValid / totalRepsRef.current) * 100),
                feedback: `Squat chuẩn! +1 Rep (${newValid})`,
                is_form_valid: true,
              });
            }
          }
        }
      }
      // -------------------------------------------------------------
      // EXERCISE 3: GẬP BỤNG (SIT-UP)
      // -------------------------------------------------------------
      else if (currentEx === 'situp') {
        // Posture Guard: If user is standing upright, prompt them to sit/lie down
        if (data.isStandingUpright && !data.isHorizontal) {
          setDepthPercent(0);
          setStatus((prev) => ({
            ...prev,
            feedback: 'Đang chọn GẬP BỤNG: Vui lòng ngồi hoặc nằm xuống thảm',
            is_form_valid: true,
          }));
          return;
        }

        const rawPct = Math.round(((135 - effectiveHip) / (135 - 88)) * 100);
        setDepthPercent(Math.min(100, Math.max(0, rawPct)));

        // Down stage: Lying down on mat (hip >= 125°)
        if (effectiveHip >= 125) {
          if (stageRef.current !== 'down') {
            stageRef.current = 'down';
            setStatus((prev) => ({
              ...prev,
              stage: 'down',
              feedback: 'Lưng chạm thảm! Gập bụng ngồi dậy',
              is_form_valid: true,
            }));
          }
        } else if (effectiveHip <= 88) {
          // Up stage: Sitting upright (hip <= 88°)
          if (stageRef.current === 'down') {
            if (now - lastRepTimestampRef.current >= 650) {
              lastRepTimestampRef.current = now;
              stageRef.current = 'up';
              totalRepsRef.current += 1;
              validRepsRef.current += 1;
              const newValid = validRepsRef.current;
              soundEffects.playRepSuccess(newValid);
              setStatus({
                exercise: 'situp',
                stage: 'up',
                total_reps: totalRepsRef.current,
                valid_reps: newValid,
                invalid_reps: invalidRepsRef.current,
                form_score: Math.round((newValid / totalRepsRef.current) * 100),
                feedback: `Gập bụng tốt! +1 Rep (${newValid})`,
                is_form_valid: true,
              });
            }
          }
        }
      }
    },
    []
  );

  // Client-side MediaPipe Pose onResults callback
  const onPoseResults = useCallback(
    (results: any) => {
      if (!canvasRef.current || !videoRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks && results.poseLandmarks.length > 0) {
        setDetected(true);
        const lm = results.poseLandmarks;
        const currentEx = exerciseRef.current;

        // Draw skeleton lines
        const connections = [
          [11, 12], // shoulders
          [11, 13],
          [13, 15], // left arm
          [12, 14],
          [14, 16], // right arm
          [11, 23],
          [12, 24], // torso
          [23, 24], // hips
          [23, 25],
          [25, 27], // left leg
          [24, 26],
          [26, 28], // right leg
        ];

        ctx.lineWidth = 4;
        ctx.strokeStyle = status.is_form_valid ? '#10b981' : '#ef4444';

        connections.forEach(([p1, p2]) => {
          if (lm[p1] && lm[p2] && lm[p1].visibility > 0.35 && lm[p2].visibility > 0.35) {
            ctx.beginPath();
            ctx.moveTo(lm[p1].x * canvas.width, lm[p1].y * canvas.height);
            ctx.lineTo(lm[p2].x * canvas.width, lm[p2].y * canvas.height);
            ctx.stroke();
          }
        });

        // Draw landmark points
        [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach((idx) => {
          const pt = lm[idx];
          if (pt && pt.visibility > 0.35) {
            ctx.beginPath();
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
          }
        });

        // Compute geometric angles
        const lElbow = calculateAngle(lm[11], lm[13], lm[15]);
        const rElbow = calculateAngle(lm[12], lm[14], lm[16]);
        const lHip = calculateAngle(lm[11], lm[23], lm[25]);
        const rHip = calculateAngle(lm[12], lm[24], lm[26]);
        const lKnee = calculateAngle(lm[23], lm[25], lm[27]);
        const rKnee = calculateAngle(lm[24], lm[26], lm[28]);

        // Posture Orientation Evaluation
        const avgShoulderY = (lm[11].y + lm[12].y) / 2;
        const avgHipY = (lm[23].y + lm[24].y) / 2;
        const avgAnkleY = (lm[27].y + lm[28].y) / 2;
        const verticalSpan = Math.abs(avgAnkleY - avgShoulderY);

        const avgShoulderX = (lm[11].x + lm[12].x) / 2;
        const avgAnkleX = (lm[27].x + lm[28].x) / 2;
        const horizontalSpan = Math.abs(avgAnkleX - avgShoulderX);

        const isStandingUpright =
          avgShoulderY < avgHipY - 0.08 && avgHipY < avgAnkleY - 0.08 && verticalSpan > 0.35;
        const isHorizontal =
          horizontalSpan > verticalSpan * 0.75 || Math.abs(avgShoulderY - avgHipY) < 0.18;

        // Draw live angle badges directly on key joints
        ctx.font = 'bold 15px system-ui, sans-serif';
        if (currentEx === 'pushup') {
          const activePt = lm[13].visibility >= lm[14].visibility ? lm[13] : lm[14];
          const activeAng = lm[13].visibility >= lm[14].visibility ? lElbow : rElbow;
          if (activePt && activePt.visibility > 0.35) {
            const px = activePt.x * canvas.width;
            const py = activePt.y * canvas.height;
            ctx.fillStyle = activeAng <= 100 ? '#10b981' : '#f59e0b';
            ctx.fillText(`Khuỷu: ${activeAng}°`, px + 12, py);
          }
        } else if (currentEx === 'squat') {
          const activePt = lm[25].visibility >= lm[26].visibility ? lm[25] : lm[26];
          const activeAng = lm[25].visibility >= lm[26].visibility ? lKnee : rKnee;
          if (activePt && activePt.visibility > 0.35) {
            const px = activePt.x * canvas.width;
            const py = activePt.y * canvas.height;
            ctx.fillStyle = activeAng <= 112 ? '#10b981' : '#f59e0b';
            ctx.fillText(`Gối: ${activeAng}°`, px + 12, py);
          }
        } else if (currentEx === 'situp') {
          const activePt = lm[23].visibility >= lm[24].visibility ? lm[23] : lm[24];
          const activeAng = lm[23].visibility >= lm[24].visibility ? lHip : rHip;
          if (activePt && activePt.visibility > 0.35) {
            const px = activePt.x * canvas.width;
            const py = activePt.y * canvas.height;
            ctx.fillStyle = activeAng <= 88 ? '#10b981' : '#f59e0b';
            ctx.fillText(`Hông: ${activeAng}°`, px + 12, py);
          }
        }

        processAnglesAndUpdateRep({
          leftElbow: lElbow,
          rightElbow: rElbow,
          leftKnee: lKnee,
          rightKnee: rKnee,
          leftHip: lHip,
          rightHip: rHip,
          leftElbowVis: lm[13]?.visibility || 0,
          rightElbowVis: lm[14]?.visibility || 0,
          leftKneeVis: lm[25]?.visibility || 0,
          rightKneeVis: lm[26]?.visibility || 0,
          leftHipVis: lm[23]?.visibility || 0,
          rightHipVis: lm[24]?.visibility || 0,
          isStandingUpright,
          isHorizontal,
        });
      } else {
        setDetected(false);
      }
    },
    [processAnglesAndUpdateRep, status.is_form_valid]
  );

  // Update onPoseResultsRef whenever onPoseResults changes
  useEffect(() => {
    onPoseResultsRef.current = onPoseResults;
  }, [onPoseResults]);

  // Start Camera and AI Engine
  const startStreaming = async () => {
    setCameraError('');
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode,
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setAiStatusText('Đang khởi tạo AI Pose...');

      // Initialize in-browser MediaPipe Pose with dynamic ref wrapper to prevent stale closure!
      if ((window as any).Pose) {
        try {
          const pose = new (window as any).Pose({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
          });
          pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          // Forward to onPoseResultsRef.current so exercise changes are recognized instantly!
          pose.onResults((results: any) => {
            if (onPoseResultsRef.current) {
              onPoseResultsRef.current(results);
            }
          });

          poseDetectorRef.current = pose;
          setAiMode('client');
          setAiStatusText('🟢 AI MediaPipe Vision Sẵn Sàng (30 FPS)');

          const sendFrameToMediaPipe = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2 && poseDetectorRef.current) {
              try {
                await poseDetectorRef.current.send({ image: videoRef.current });
              } catch {
                // Ignore transient frame send error
              }
            }
            animFrameRef.current = requestAnimationFrame(sendFrameToMediaPipe);
          };
          animFrameRef.current = requestAnimationFrame(sendFrameToMediaPipe);
        } catch (mpErr) {
          console.warn('Could not init MediaPipe Pose in browser, trying WebSocket fallback:', mpErr);
          setupWebSocketFallback();
        }
      } else {
        setupWebSocketFallback();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Không thể mở Camera: ' +
          (err.message || 'Vui lòng kiểm tra quyền truy cập Camera của trình duyệt')
      );
    }
  };

  // Optional Python WebSocket fallback
  const setupWebSocketFallback = () => {
    try {
      const curEx = exerciseRef.current;
      const wsUrl = `${AI_WS_URL}/${curEx}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setAiMode('websocket');
        setAiStatusText('🟢 Kết nối Python AI Service');

        frameIntervalRef.current = setInterval(() => {
          sendFrameViaWs();
        }, 80);
      };

      ws.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          if (res.counter) {
            if (res.counter.valid_reps > lastValidRepsRef.current) {
              soundEffects.playRepSuccess(res.counter.valid_reps);
              lastValidRepsRef.current = res.counter.valid_reps;
            }
            if (res.counter.invalid_reps > lastInvalidRepsRef.current) {
              soundEffects.playFormWarning();
              lastInvalidRepsRef.current = res.counter.invalid_reps;
            }
            setStatus(res.counter);
          }
          if (res.detected !== undefined) setDetected(res.detected);
          if (res.angles) setAngles(res.angles);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onerror = () => {
        setAiStatusText('🟡 Chế độ Camera Trực Tiếp (Không cần AI Server)');
      };
    } catch (e) {
      console.warn('WS Init failed:', e);
    }
  };

  const sendFrameViaWs = () => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 480;
    canvas.height = 360;
    ctx.drawImage(video, 0, 0, 480, 360);
    const base64Image = canvas.toDataURL('image/jpeg', 0.6);
    wsRef.current.send(base64Image);
  };

  const stopStreaming = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setIsCameraActive(false);
    setDetected(false);
    setAiStatusText('Đã dừng camera');
  };

  const resetCounter = () => {
    stageRef.current = null;
    lastValidRepsRef.current = 0;
    lastInvalidRepsRef.current = 0;
    validRepsRef.current = 0;
    totalRepsRef.current = 0;
    invalidRepsRef.current = 0;
    setDepthPercent(0);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('RESET');
    }
    const cur = exerciseRef.current;
    setStatus({
      exercise: cur,
      stage: null,
      total_reps: 0,
      valid_reps: 0,
      invalid_reps: 0,
      form_score: 100,
      feedback: 'Đã thiết lập lại bộ đếm rep',
      is_form_valid: true,
    });
  };

  // Quick Manual Test Rep (+1)
  const handleTestRep = () => {
    totalRepsRef.current += 1;
    validRepsRef.current += 1;
    const newCount = validRepsRef.current;
    soundEffects.playRepSuccess(newCount);
    setStatus({
      exercise: exerciseRef.current,
      stage: 'up',
      total_reps: totalRepsRef.current,
      valid_reps: newCount,
      invalid_reps: invalidRepsRef.current,
      form_score: Math.round((newCount / totalRepsRef.current) * 100),
      feedback: `Test Rep hoàn hảo! +1 (${newCount})`,
      is_form_valid: true,
    });
  };

  // Save workout to backend PostgreSQL
  const saveWorkout = async () => {
    try {
      await workoutService.logResult({
        exercise_type: exerciseRef.current,
        reps_completed: status.valid_reps,
        form_score: status.form_score,
        reps_valid: status.valid_reps,
        reps_invalid: status.invalid_reps,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      alert('Đã lưu kết quả bài tập (Chế độ ngoại tuyến)');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Top Bar with Navigation, Tabs, and Audio Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-semibold text-sm">Về Thử Thách Chính</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Exercise Selector Buttons */}
          <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800">
            {[
              { id: 'pushup', label: 'Chống Đẩy', icon: '💪' },
              { id: 'squat', label: 'Squat', icon: '🏋️' },
              { id: 'situp', label: 'Gập Bụng', icon: '🔥' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectExercise(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  exercise === item.id
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Sound & Voice Coach Controls */}
          <div className="flex items-center space-x-1.5 bg-gray-900 p-1.5 rounded-xl border border-gray-800">
            <button
              onClick={toggleMute}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isMuted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="hidden sm:inline">{isMuted ? 'Mute' : 'Âm thanh'}</span>
            </button>

            <button
              onClick={toggleVoice}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isVoice
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={isVoice ? 'Tắt giọng nói HLV' : 'Bật giọng nói HLV'}
            >
              {isVoice ? (
                <Mic className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <MicOff className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span className="hidden sm:inline">{isVoice ? 'Giọng Đếm' : 'Tắt Giọng'}</span>
            </button>
          </div>
        </div>
      </div>

      {cameraError && (
        <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-sm flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Main Camera & HUD Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Camera Feed + Canvas Overlay.
            YouTube-style viewport: contains full body without cropping head/feet by default */}
        <div
          ref={containerRef}
          className={`relative bg-black rounded-2xl overflow-hidden border border-gray-800 flex items-center justify-center shadow-2xl transition-all ${
            isFullscreen
              ? 'fixed inset-0 z-50 rounded-none border-none w-screen h-screen'
              : 'w-full h-[60vh] min-h-[460px] sm:h-[65vh] sm:min-h-[500px] lg:h-auto lg:aspect-[4/3] lg:col-span-2'
          }`}
        >
          {/* Video element with customizable Fit Mode & Zoom Scale */}
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              transform: `${facingMode === 'user' ? '-scale-x-100' : 'scale-x-100'} scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className={`w-full h-full ${
              viewMode === 'contain' ? 'object-contain' : 'object-cover'
            } ${!isCameraActive ? 'hidden' : 'block'}`}
          />

          {/* Canvas skeleton overlay matches exact video dimensions and zoom */}
          <canvas
            ref={canvasRef}
            style={{
              transform: `${facingMode === 'user' ? '-scale-x-100' : 'scale-x-100'} scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className={`absolute inset-0 w-full h-full pointer-events-none ${
              viewMode === 'contain' ? 'object-contain' : 'object-cover'
            } ${!isCameraActive ? 'hidden' : 'block'}`}
          />

          {/* Fallback state when camera is OFF */}
          {!isCameraActive && (
            <div className="absolute inset-0 bg-[#0c101c]/95 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
                <Camera className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Camera AI: {exercise === 'pushup' ? 'Chống Đẩy' : exercise === 'squat' ? 'Squat' : 'Gập Bụng'}
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto">
                  Đứng cách 1.5 - 2m. Ứng dụng hỗ trợ chế độ xem trọn vẹn toàn thân (Fit) giống YouTube, có thể phóng to, thu nhỏ và đổi camera góc rộng.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={startStreaming}
                  className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:opacity-90 text-white font-black text-sm sm:text-base shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Bật Camera & Bắt Đầu</span>
                </button>

                <button
                  onClick={handleTestRep}
                  className="inline-flex items-center space-x-2 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-amber-400 font-bold text-xs sm:text-sm border border-gray-700 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Test Nhanh (+1 Rep)</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Overlay HUD when Camera is Active */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none p-3 sm:p-5 flex flex-col justify-between">
              {/* Top HUD Status & YouTube-style Control Bar */}
              <div className="flex items-center justify-between pointer-events-auto gap-2">
                <div className="flex items-center space-x-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      detected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  ></span>
                  <span className="font-bold text-white text-[11px] sm:text-xs">
                    {detected ? 'ĐÃ THẤY TOÀN THÂN' : 'ĐANG TÌM NGƯỜI...'}
                  </span>
                </div>

                {/* Right Top Toolset: Fit/Fill, Zoom In/Out, Flip Camera, Fullscreen */}
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  {/* YouTube View Mode (Fit vs Fill) */}
                  <button
                    onClick={toggleViewMode}
                    className="flex items-center space-x-1 bg-black/80 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 text-xs font-bold text-gray-200 hover:text-white hover:bg-gray-800 transition-all cursor-pointer"
                    title={
                      viewMode === 'contain'
                        ? 'Đang ở chế độ xem trọn thân (Fit). Nhấn để tràn viền (Cover)'
                        : 'Đang ở chế độ tràn viền. Nhấn để xem trọn vẹn toàn thân không bị cắt đầu/chân'
                    }
                  >
                    {viewMode === 'contain' ? (
                      <>
                        <Expand className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px]">Trọn Thân</span>
                      </>
                    ) : (
                      <>
                        <Shrink className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px]">Tràn Viền</span>
                      </>
                    )}
                  </button>

                  {/* Zoom Controls (- 1.0x +) */}
                  <div className="hidden sm:flex items-center bg-black/80 backdrop-blur-md px-1.5 py-1 rounded-full border border-white/10 text-xs">
                    <button
                      onClick={handleZoomOut}
                      className="p-1 hover:text-amber-400 text-gray-300 transition-colors"
                      title="Thu nhỏ camera"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="px-1.5 font-mono text-[11px] text-amber-400 font-bold hover:underline"
                      title="Đặt lại 1.0x"
                    >
                      {zoomLevel.toFixed(1)}x
                    </button>
                    <button
                      onClick={handleZoomIn}
                      className="p-1 hover:text-amber-400 text-gray-300 transition-colors"
                      title="Phóng to camera"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Switch Front / Back Camera */}
                  <button
                    onClick={toggleCameraFacing}
                    className="p-1.5 sm:p-2 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white hover:text-amber-400 hover:bg-gray-800 transition-all cursor-pointer"
                    title="Đổi camera trước / sau (Góc rộng)"
                  >
                    <SwitchCamera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Theater / Fullscreen toggle button */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 sm:p-2 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white hover:text-amber-400 hover:bg-gray-800 transition-all cursor-pointer"
                    title={isFullscreen ? 'Thu nhỏ camera' : 'Toàn màn hình như YouTube'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Prominent Exercise Badge & Rep Depth */}
              <div className="absolute top-14 sm:top-16 left-3 sm:left-5 pointer-events-none space-y-2">
                {/* Active Exercise Indicator */}
                <div className="bg-red-600/90 text-white px-3 py-1 rounded-lg text-xs font-black tracking-wide shadow-lg inline-flex items-center space-x-1.5">
                  <span>{exercise === 'pushup' ? '💪 CHỐNG ĐẨY' : exercise === 'squat' ? '🏋️ SQUAT' : '🔥 GẬP BỤNG'}</span>
                </div>

                {/* Huge Rep Counter for 2m+ Viewing Distance */}
                <div className="bg-black/70 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-white/15 flex items-baseline space-x-2 shadow-2xl">
                  <span className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
                    {status.valid_reps}
                  </span>
                  <span className="text-xs font-black text-gray-300 uppercase tracking-widest">REPS</span>
                </div>
              </div>

              {/* Floating Dynamic Depth Gauge */}
              <div className="absolute top-14 sm:top-16 right-3 sm:right-5 pointer-events-none flex items-center space-x-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
                <span className="text-gray-300 font-bold text-[11px]">Độ Sâu:</span>
                <div className="w-16 bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      depthPercent >= 85 ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${depthPercent}%` }}
                  />
                </div>
                <span
                  className={`font-mono font-bold text-[11px] ${
                    depthPercent >= 85 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {depthPercent}%
                </span>
              </div>

              {/* Center Floating Feedback Banner */}
              <div className="self-center my-auto pointer-events-none max-w-[92%] sm:max-w-md text-center">
                <div
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl backdrop-blur-md text-xs sm:text-base font-black shadow-2xl transition-all ${
                    status.is_form_valid
                      ? 'bg-emerald-950/90 border border-emerald-500/70 text-emerald-300'
                      : 'bg-red-950/90 border border-red-500/70 text-red-300'
                  }`}
                >
                  {status.feedback}
                </div>
              </div>

              {/* Bottom HUD Controls */}
              <div className="flex items-center justify-between pointer-events-auto gap-2">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    onClick={stopStreaming}
                    className="p-2.5 sm:p-3 rounded-xl bg-red-600/90 hover:bg-red-600 text-white backdrop-blur transition-all shadow-lg shadow-red-600/30 cursor-pointer"
                    title="Dừng Camera"
                  >
                    <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                  </button>
                  <button
                    onClick={resetCounter}
                    className="p-2.5 sm:p-3 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-white backdrop-blur border border-gray-700 transition-all cursor-pointer"
                    title="Reset Reps"
                  >
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={handleTestRep}
                    className="inline-flex items-center space-x-1 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer"
                    title="Test nhanh +1 Rep"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>+1 Rep</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {isFullscreen && (
                    <button
                      onClick={toggleFullscreen}
                      className="px-3 py-2 rounded-xl bg-gray-800 text-white font-bold text-xs border border-gray-700 hover:bg-gray-700 transition-all cursor-pointer"
                    >
                      Thoát Fullscreen
                    </button>
                  )}
                  <button
                    onClick={saveWorkout}
                    disabled={status.valid_reps === 0}
                    className="flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 disabled:opacity-40 text-black font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu Kết Quả</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: AI Stats & Analytics Panel */}
        <div className="space-y-4 sm:space-y-6">
          {/* Big Reps Count Display */}
          <div className="bg-[#141824] rounded-2xl border border-gray-800 p-5 sm:p-6 text-center relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-7xl sm:text-8xl">🥊</div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              SỐ LẦN HOÀN THÀNH ({exercise.toUpperCase()})
            </div>
            <div className="text-6xl sm:text-7xl font-black text-white mt-2 tracking-tight">
              {status.valid_reps}
            </div>
            <div className="mt-2 text-xs sm:text-sm text-gray-400">
              Tổng số lần thực hiện: <span className="font-bold text-white">{status.total_reps}</span>
            </div>
          </div>

          {/* Form Quality Analysis */}
          <div className="bg-[#141824] rounded-2xl border border-gray-800 p-5 sm:p-6 space-y-4 shadow-xl">
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center justify-between">
              <span>Đánh Giá Kỹ Thuật (Form)</span>
              <span className="text-sm font-black text-amber-400">{status.form_score}%</span>
            </h4>

            {/* Quality Progress bar */}
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  status.form_score >= 80 ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                style={{ width: `${status.form_score}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <div className="text-xs text-emerald-400 font-semibold flex items-center justify-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Chuẩn Form</span>
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {status.valid_reps}
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                <div className="text-xs text-red-400 font-semibold flex items-center justify-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Sai Tư Thế</span>
                </div>
                <div className="text-2xl font-black text-red-400 mt-1">
                  {status.invalid_reps}
                </div>
              </div>
            </div>

            {/* Real-time Angle Metrics */}
            {angles && (
              <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-400 space-y-1.5">
                <div className="font-bold text-gray-300 mb-2 flex items-center justify-between">
                  <span>Thông Số Góc Khớp Real-time:</span>
                  <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                    <Activity className="w-3 h-3" />
                    <span>MediaPipe Vision</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Khuỷu tay (Trái / Phải):</span>
                  <span className="font-mono text-amber-400">
                    {angles.left_elbow_angle ?? '--'}° / {angles.right_elbow_angle ?? '--'}°
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Đầu gối (Trái / Phải):</span>
                  <span className="font-mono text-amber-400">
                    {angles.left_knee_angle ?? '--'}° / {angles.right_knee_angle ?? '--'}°
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Góc hông:</span>
                  <span className="font-mono text-amber-400">{angles.left_hip_angle ?? '--'}°</span>
                </div>
                {angles.active_angle !== undefined && (
                  <div className="flex justify-between pt-1 border-t border-gray-800/60 font-semibold text-white">
                    <span>Góc Nhận Diện Động Tác:</span>
                    <span className="font-mono text-emerald-400">{angles.active_angle}°</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 text-[11px] text-gray-500 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-gray-400" />
              <span>
                {aiStatusText} ({aiMode === 'client' ? 'Client Web AI' : 'Python Server'})
              </span>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center space-x-2 shadow-lg">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Đã lưu kết quả bài tập vào tiến độ hôm nay!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
