import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  Square,
  RotateCcw,
  AlertTriangle,
  Dumbbell,
  ShieldAlert,
  CheckCircle2,
  Volume2,
  VolumeX,
  ArrowLeft,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import UserLayout from "../../components/user/UserLayout";

import squatImage from "../../assets/squate.png";
import plankImage from "../../assets/plank.png";
import armRaiseImage from "../../assets/arm_raise.png";
import sideBendImage from "../../assets/side_bend.png";

const EXERCISES = {
  squats: {
    name: "Squats",
    image: squatImage,
  },
  plank: {
    name: "Plank",
    image: plankImage,
  },
  arm_raise: {
    name: "Arm Raise",
    image: armRaiseImage,
  },
  side_bend: {
    name: "Side Bend",
    image: sideBendImage,
  },
};

const BLOCKED_VOICE_MESSAGES = new Set([
  "",
  "Click Start to begin session",
  "Position yourself in front of the camera",
  "Position yourself fully in front of the camera",
  "Session stopped",
  "Ready to start",
]);

const POSE_API_URL = (import.meta.env.VITE_POSE_API_URL || "").replace(
  /\/$/,
  "",
);

const SAME_MESSAGE_COOLDOWN = 4000;
const DIFFERENT_MESSAGE_COOLDOWN = 2500;
const MIN_MESSAGE_LENGTH = 3;

const FEEDBACK_DISPLAY_MIN_GAP = 900;

export default function WorkoutSession() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();

  const currentEx = EXERCISES[exerciseId] || {
    name: "Exercise",
    image: "",
  };

  const sessionIdRef = useRef(
    "session_" +
      // eslint-disable-next-line react-hooks/purity
      Math.random().toString(36).substring(2, 11) +
      "_" +
      // eslint-disable-next-line react-hooks/purity
      Date.now(),
  );

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const isActiveRef = useRef(false);
  const frameTimerRef = useRef(null);
  const processingFrameRef = useRef(false);

  const [hasPermission, setHasPermission] = useState(() => {
    return localStorage.getItem("posefit_cam_permission") === "granted";
  });

  const [isActive, setIsActive] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [reps, setReps] = useState(0);
  const [angle, setAngle] = useState(0.0);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState("Ready to start");
  const [warning, setWarning] = useState("");
  const [displayFeedback, setDisplayFeedback] = useState("Ready to start");
  const [displayWarning, setDisplayWarning] = useState("");
  const feedbackDisplayRef = useRef({
    text: "Ready to start",
    time: 0,
    timer: null,
  });
  const warningDisplayRef = useRef({ text: "", time: 0, timer: null });
  const [direction, setDirection] = useState("none");
  const [serverOnline, setServerOnline] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [personDetected, setPersonDetected] = useState(false);

  const lastSpokenRef = useRef({
    text: "",
    time: 0,
  });

  const speechTimerRef = useRef(null);

  useEffect(() => {
    axios
      .get(`${POSE_API_URL}/status?session_id=${sessionIdRef.current}`)
      .then(() => {
        setServerOnline(true);
      })
      .catch(() => {
        setServerOnline(false);
      });

    // eslint-disable-next-line react-hooks/immutability
    return () => cleanupSession();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isMuted) return;
    
    const msg = (warning || feedback || "").trim();

    if (BLOCKED_VOICE_MESSAGES.has(msg)) return;

    if (msg.length < MIN_MESSAGE_LENGTH) return;

    if (!isActiveRef.current) return;

    const now = Date.now();
    const lastSpoken = lastSpokenRef.current;

    const isSameMessage = msg === lastSpoken.text;
    const timeSinceLastSpeech = now - lastSpoken.time;

    const requiredCooldown = isSameMessage
      ? SAME_MESSAGE_COOLDOWN
      : DIFFERENT_MESSAGE_COOLDOWN;

    if (timeSinceLastSpeech < requiredCooldown) {
      return;
    }

    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }

    const speakMessage = () => {
      if (isMuted || !isActiveRef.current) return;

      const currentTime = Date.now();

      if (
        msg === lastSpokenRef.current.text &&
        currentTime - lastSpokenRef.current.time < SAME_MESSAGE_COOLDOWN
      ) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(msg);

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = "en-US";

      window.speechSynthesis.speak(utterance);

      lastSpokenRef.current = {
        text: msg,
        time: currentTime,
      };
    };

    speechTimerRef.current = setTimeout(speakMessage, 150);

    return () => {
      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
        speechTimerRef.current = null;
      }
    };
  }, [feedback, warning, isMuted]);

  const stopSpeech = () => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }

    window.speechSynthesis.cancel();

    lastSpokenRef.current = {
      text: "",
      time: 0,
    };
  };

  const scheduleDisplayUpdate = (ref, setter, newText, isPriority) => {
    if (newText === ref.current.text) return;

    const now = Date.now();
    const elapsed = now - ref.current.time;

    if (ref.current.timer) {
      clearTimeout(ref.current.timer);
      ref.current.timer = null;
    }

    if (isPriority || elapsed >= FEEDBACK_DISPLAY_MIN_GAP) {
      ref.current.text = newText;
      ref.current.time = now;
      setter(newText);
      return;
    }

    const wait = FEEDBACK_DISPLAY_MIN_GAP - elapsed;

    ref.current.timer = setTimeout(() => {
      ref.current.text = newText;
      ref.current.time = Date.now();
      ref.current.timer = null;
      setter(newText);
    }, wait);
  };

  const scheduleNextFrame = () => {
    if (!isActiveRef.current) return;

    if (frameTimerRef.current) {
      clearTimeout(frameTimerRef.current);
    }

    frameTimerRef.current = setTimeout(() => {
      sendNextFrame();
    }, 50);
  };

  const sendNextFrame = async () => {
    if (!isActiveRef.current) return;

    if (processingFrameRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      scheduleNextFrame();
      return;
    }

    processingFrameRef.current = true;

    try {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        processingFrameRef.current = false;
        scheduleNextFrame();
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);

      const base64Image = canvas.toDataURL("image/jpeg", 0.6);

      const res = await axios.post(`${POSE_API_URL}/process_frame`, {
        session_id: sessionIdRef.current,
        exercise: exerciseId,
        image: base64Image,
      });

      if (isActiveRef.current && res.data) {
        const newFeedback = res.data.feedback || "Ready";
        const newWarning = res.data.warning || "";
        const isRepEvent = newFeedback.toLowerCase().includes("counted");
        const backendProgress = res.data.progress_percent;
        const fallbackProgress = Math.min(
          100,
          Math.round((Math.abs(res.data.angle ?? 0) / 90) * 100),
        );

        setReps(res.data.reps ?? 0);
        setAngle(res.data.angle ?? 0.0);
        setProgress(
          backendProgress !== undefined ? backendProgress : fallbackProgress,
        );
        setFeedback(newFeedback);
        setWarning(newWarning);
        setDirection(res.data.direction || "none");

        scheduleDisplayUpdate(
          feedbackDisplayRef,
          setDisplayFeedback,
          newFeedback,
          isRepEvent,
        );
        scheduleDisplayUpdate(
          warningDisplayRef,
          setDisplayWarning,
          newWarning,
          isRepEvent,
        );

        setPersonDetected(res.data.person_detected ?? false);

        if (res.data.image) {
          setProcessedImage(res.data.image);
        }

        setServerOnline(true);
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        isActiveRef.current = false;
        setIsActive(false);
        stopSpeech();
      } else {
        console.error("Frame processing error:", err);
      }
    } finally {
      processingFrameRef.current = false;

      if (isActiveRef.current) {
        scheduleNextFrame();
      }
    }
  };

  const cleanupSession = async () => {
    isActiveRef.current = false;
    processingFrameRef.current = false;

    if (frameTimerRef.current) {
      clearTimeout(frameTimerRef.current);
      frameTimerRef.current = null;
    }

    stopSpeech();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      await axios.post(`${POSE_API_URL}/stop`, {
        session_id: sessionIdRef.current,
      });
    } catch (_) {}
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
        },
      });

      stream.getTracks().forEach((track) => track.stop());

      setHasPermission(true);

      localStorage.setItem("posefit_cam_permission", "granted");

      toast.success("Camera permitted!");
    } catch {
      toast.error("Camera permission denied in browser settings.");
    }
  };

  const handleStart = async () => {
    if (!hasPermission) {
      await requestCamera();
      return;
    }

    if (isActiveRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      await axios.post(`${POSE_API_URL}/start`, {
        session_id: sessionIdRef.current,
        exercise: exerciseId,
      });

      processingFrameRef.current = false;
      isActiveRef.current = true;

      setIsActive(true);
      setPersonDetected(false);
      setProcessedImage(null);
      setServerOnline(true);

      setReps(0);
      setAngle(0.0);
      setProgress(0);
      setFeedback("Position yourself in front of the camera");
      setWarning("");
      setDirection("none");

      if (feedbackDisplayRef.current.timer) {
        clearTimeout(feedbackDisplayRef.current.timer);
      }
      if (warningDisplayRef.current.timer) {
        clearTimeout(warningDisplayRef.current.timer);
      }
      feedbackDisplayRef.current = {
        text: "Position yourself in front of the camera",
        time: Date.now(),
        timer: null,
      };
      warningDisplayRef.current = { text: "", time: Date.now(), timer: null };
      setDisplayFeedback("Position yourself in front of the camera");
      setDisplayWarning("");

      lastSpokenRef.current = {
        text: "",
        time: 0,
      };

      toast.success(`${currentEx.name} tracking started.`);

      scheduleNextFrame();
    } catch (err) {
      console.error("Start tracking error:", err);

      isActiveRef.current = false;
      processingFrameRef.current = false;

      setIsActive(false);

      stopSpeech();

      if (frameTimerRef.current) {
        clearTimeout(frameTimerRef.current);
        frameTimerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());

        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      if (err?.response) {
        setServerOnline(false);
        toast.error("Python pose service is offline.");
      } else {
        toast.error("Could not access camera in browser.");
      }
    }
  };

  const handleStop = async () => {
    isActiveRef.current = false;
    processingFrameRef.current = false;

    if (frameTimerRef.current) {
      clearTimeout(frameTimerRef.current);
      frameTimerRef.current = null;
    }

    stopSpeech();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setProcessedImage(null);

    try {
      await axios.post(`${POSE_API_URL}/stop`, {
        session_id: sessionIdRef.current,
      });
    } catch (_) {}

    setIsActive(false);
    setProgress(0);
    setFeedback("Session stopped");
    setWarning("");
    setDirection("none");
    setPersonDetected(false);

    if (feedbackDisplayRef.current.timer) {
      clearTimeout(feedbackDisplayRef.current.timer);
    }
    if (warningDisplayRef.current.timer) {
      clearTimeout(warningDisplayRef.current.timer);
    }
    feedbackDisplayRef.current = {
      text: "Session stopped",
      time: Date.now(),
      timer: null,
    };
    warningDisplayRef.current = { text: "", time: Date.now(), timer: null };
    setDisplayFeedback("Session stopped");
    setDisplayWarning("");

    toast.info("Session stopped.");
  };

  const handleReset = async () => {
    try {
      await axios.post(`${POSE_API_URL}/reset`, {
        session_id: sessionIdRef.current,
      });

      stopSpeech();

      setReps(0);
      setAngle(0.0);
      setProgress(0);
      setFeedback("Ready to start");
      setWarning("");
      setDirection("none");
      setPersonDetected(false);

      if (feedbackDisplayRef.current.timer) {
        clearTimeout(feedbackDisplayRef.current.timer);
      }
      if (warningDisplayRef.current.timer) {
        clearTimeout(warningDisplayRef.current.timer);
      }
      feedbackDisplayRef.current = {
        text: "Ready to start",
        time: Date.now(),
        timer: null,
      };
      warningDisplayRef.current = { text: "", time: Date.now(), timer: null };
      setDisplayFeedback("Ready to start");
      setDisplayWarning("");

      toast.success("Counter reset.");
    } catch {
      toast.error("Failed to reset.");
    }
  };

  const absAngle = Math.abs(angle);
  
  const percentage = Math.min(100, Math.max(0, Math.round(progress)));
  const isPerfect = percentage >= 100 && !warning;

  if (!hasPermission) {
    return (
      <UserLayout>
        <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-8 font-sans">
          <div className="w-full max-w-md rounded-card border border-brand-light/60 bg-surface/85 p-8 text-center shadow-card-hover backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-card bg-brand-light/40 text-brand-dark shadow-card">
              <Camera size={32} />
            </div>

            <div className="mt-6 space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-gray-800">
                Camera Permission Required
              </h2>

              <p className="text-xs leading-relaxed text-gray-500">
                PoseFit needs your camera to track your{" "}
                <span className="font-bold text-gray-800">
                  {currentEx.name}
                </span>{" "}
                posture in real time.
              </p>
            </div>

            <button
              onClick={requestCamera}
              className="btn-primary mt-6 w-full py-4"
            >
              Allow Camera Access
            </button>

            <button
              onClick={() => navigate("/user/workout")}
              className="mt-4 text-xs font-semibold text-gray-400 transition-colors hover:text-brand-dark"
            >
              Back to exercises
            </button>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-transparent p-4 font-sans sm:p-6 md:p-8">
        <div className="space-y-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/user/workout")}
                className="rounded-btn p-2 text-gray-400 transition-all hover:bg-brand-light/25 hover:text-gray-800"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
                  <Dumbbell className="h-6 w-6 text-brand-dark sm:h-7 sm:w-7" />

                  {currentEx.name}

                  <span className="rounded-btn bg-brand-light/40 px-3 py-1 text-base font-bold text-brand-dark sm:px-4 sm:text-lg">
                    Posture Check
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  const next = !isMuted;

                  setIsMuted(next);

                  if (next) {
                    stopSpeech();
                  }
                }}
                className={`flex items-center gap-2 rounded-btn border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  isMuted
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : "border-brand-light bg-brand-light/30 text-brand-dark"
                }`}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}

                <span>{isMuted ? "Muted" : "Voice On"}</span>
              </button>

              <span
                className={`flex items-center gap-2 rounded-btn border px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                  serverOnline
                    ? "border-brand-light bg-brand-light/30 text-brand-dark"
                    : "border-rose-200 bg-rose-50 text-rose-600"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    serverOnline ? "bg-brand" : "bg-rose-500"
                  }`}
                />

                {serverOnline ? "AI Online" : "AI Offline"}
              </span>
            </div>
          </div>

          {!serverOnline && (
            <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-card border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              <ShieldAlert size={20} />

              <span>
                Python service is offline. Please run{" "}
                <code className="rounded bg-rose-100 px-1 font-mono font-bold">
                  python app.py
                </code>{" "}
                in python-pose-service folder.
              </span>
            </div>
          )}

          <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            <div className="relative flex min-h-[460px] flex-col justify-center overflow-hidden rounded-card border border-brand-light/50 bg-surface/70 shadow-card backdrop-blur-xl lg:col-span-8 md:min-h-[520px]">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`aspect-video h-full w-full object-cover ${
                  isActive && !processedImage ? "block" : "hidden"
                }`}
              />

              <canvas ref={canvasRef} className="hidden" />

              {isActive ? (
                <>
                  {processedImage && (
                    <img
                      src={processedImage}
                      alt="Camera Stream"
                      className="aspect-video h-full w-full object-cover"
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-5 p-12 text-center">
                  {currentEx.image && (
                    <div className="h-44 w-72 overflow-hidden rounded-card border border-brand-light/40 shadow-card">
                      <img
                        src={currentEx.image}
                        alt={currentEx.name}
                        className="h-full w-full object-cover opacity-80"
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-extrabold uppercase tracking-wide text-gray-800">
                      Camera Ready
                    </h3>

                    <p className="mt-1 text-xs text-gray-400">
                      Position your full body in view and start detection.
                    </p>
                  </div>

                  <button
                    onClick={handleStart}
                    disabled={!serverOnline}
                    className="btn-primary flex items-center gap-2 py-3 px-8 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play size={14} />
                    Start Detection
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between gap-4 lg:col-span-4">
              <div className="rounded-card border border-brand-light/50 bg-surface/80 p-6 text-center shadow-card backdrop-blur-xl">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-dark">
                  {exerciseId === "plank"
                    ? "Hold Time (Seconds)"
                    : "Total Repetitions"}
                </span>

                <div className="text-7xl font-extrabold tracking-tight text-gray-800">
                  {reps}
                </div>

                <span className="inline-block rounded-btn bg-brand-light/40 px-4 py-1 text-xs font-bold uppercase text-brand-dark">
                  {currentEx.name}
                </span>
              </div>

              <div className="flex flex-col items-center space-y-4 rounded-card border border-brand-light/50 bg-surface/80 p-6 shadow-card backdrop-blur-xl">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-dark">
                  Form & Angle
                </span>

                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg
                    className="h-full w-full -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="transparent"
                    />

                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={warning ? "#ef4444" : "#16845b"}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-extrabold text-gray-800">
                      {absAngle}°
                    </span>

                    <span
                      className={`text-[9px] font-bold uppercase ${
                        isPerfect ? "text-brand-dark" : "text-gray-400"
                      }`}
                    >
                      {isPerfect
                        ? "Perfect!"
                        : direction !== "none"
                        ? direction
                        : "tilt"}
                    </span>
                  </div>
                </div>

                <div className="w-full text-center">
                  {displayWarning ? (
                    <div className="flex items-center justify-center gap-2 rounded-btn border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-600">
                      <AlertTriangle size={15} />
                      <span>{displayWarning}</span>
                    </div>
                  ) : isActive && !personDetected ? (
                    <div className="flex items-center justify-center gap-2 rounded-btn border border-accent-orange bg-accent-orange/40 p-3 text-xs font-bold text-accent-orange-dark">
                      <AlertTriangle size={15} />
                      <span>Position yourself in front of camera</span>
                    </div>
                  ) : direction !== "none" || isPerfect ? (
                    <div className="flex items-center justify-center gap-2 rounded-btn border border-brand-light bg-brand-light/30 p-3 text-xs font-bold text-brand-dark">
                      <CheckCircle2 size={15} />
                      <span>{displayFeedback}</span>
                    </div>
                  ) : (
                    <div className="rounded-btn border border-gray-200 bg-white/60 p-3 text-xs font-bold text-gray-600">
                      {displayFeedback}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 rounded-card border border-brand-light/50 bg-surface/80 p-4 shadow-card backdrop-blur-xl">
                {isActive ? (
                  <button
                    onClick={handleStop}
                    className="flex flex-1 items-center justify-center gap-2 rounded-btn border border-rose-200 bg-rose-50 py-3.5 text-xs font-bold uppercase tracking-wider text-rose-600 transition-all hover:bg-rose-100"
                  >
                    <Square size={14} />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    disabled={!serverOnline}
                    className="flex flex-1 items-center justify-center gap-2 rounded-btn bg-gray-800 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:-translate-y-0.5 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play size={14} />
                    Start
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="flex flex-1 items-center justify-center gap-2 rounded-btn border border-gray-200 bg-white/60 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-700 transition-all hover:bg-white"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}