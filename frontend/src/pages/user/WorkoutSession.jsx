import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  Square,
  RotateCcw,
  AlertTriangle,
  Activity,
  Dumbbell,
  ShieldAlert,
  CheckCircle2,
  Volume2,
  VolumeX,
  ArrowLeft,
  Camera,
  CameraOff,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const EXERCISES = {
  squats: {
    name: "Squats",
    image:
      "https://images.unsplash.com/photo-1434608519344-49d77a699e1d?q=80&w=1000&auto=format&fit=crop",
  },
  plank: {
    name: "Plank",
    image:
      "https://images.unsplash.com/photo-1566241477600-ac026ad43874?q=80&w=1000&auto=format&fit=crop",
  },
  arm_raise: {
    name: "Arm Raise",
    image:
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=1000&auto=format&fit=crop",
  },
  side_bend: {
    name: "Side Bend",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1000&auto=format&fit=crop",
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

export default function WorkoutSession() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const currentEx = EXERCISES[exerciseId] || { name: "Exercise", image: "" };

  const [hasPermission, setHasPermission] = useState(() => {
    return localStorage.getItem("posefit_cam_permission") === "granted";
  });
  const [isActive, setIsActive] = useState(false);
  const [reps, setReps] = useState(0);
  const [angle, setAngle] = useState(0.0);
  const [feedback, setFeedback] = useState("Ready to start");
  const [warning, setWarning] = useState("");
  const [direction, setDirection] = useState("none");
  const [serverOnline, setServerOnline] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [personDetected, setPersonDetected] = useState(false);

  const eventSourceRef = useRef(null);
  const lastSpokenRef = useRef({ text: "", time: 0 });

  // ── Initial status & listeners ────────────────────────────────────────────
  useEffect(() => {
    axios
      .get("http://localhost:5002/status")
      .then((res) => {
        setServerOnline(true);
        if (res.data.is_active) {
          setIsActive(true);
          startListening();
        }
      })
      .catch(() => setServerOnline(false));

    return () => cleanupSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Voice Feedback (TTS) ──────────────────────────────────────────────────
  useEffect(() => {
    if (isMuted) return;
    const msg = warning || feedback;
    if (BLOCKED_VOICE_MESSAGES.has(msg)) return;

    const now = Date.now();
    if (
      msg === lastSpokenRef.current.text &&
      now - lastSpokenRef.current.time < 3000
    )
      return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.rate = 1.0;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
    lastSpokenRef.current = { text: msg, time: now };
  }, [feedback, warning, isMuted]);

  // ── Streaming Connection ──────────────────────────────────────────────────
  const startListening = () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource("http://localhost:5002/metrics");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setReps(data.reps || 0);
        setAngle(data.angle || 0.0);
        setFeedback(data.feedback || "Ready");
        setWarning(data.warning || "");
        setDirection(data.direction || "none");
        setPersonDetected(data.person_detected || false);
      } catch (err) {
        console.error("Metric parse error", err);
      }
    };
    es.onerror = () => es.close();
  };

  const cleanupSession = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    try {
      await axios.post("http://localhost:5002/stop");
    } catch (_) {}
  };

  // ── Permission Request ────────────────────────────────────────────────────
  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setHasPermission(true);
      localStorage.setItem("posefit_cam_permission", "granted");
      toast.success("Camera permitted!");
    } catch {
      toast.error("Camera permission denied in browser settings.");
    }
  };

  // ── Session Controls ──────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!hasPermission) {
      await requestCamera();
      return;
    }
    setIsActive(true);
    setPersonDetected(false);
    startListening();
    try {
      await axios.post("http://localhost:5002/start", { exercise: exerciseId });
      toast.success(`${currentEx.name} tracking started.`);
      setServerOnline(true);
    } catch {
      setIsActive(false);
      setServerOnline(false);
      toast.error("Python pose service is offline (port 5002).");
    }
  };

  const handleStop = async () => {
    window.speechSynthesis.cancel();
    try {
      await axios.post("http://localhost:5002/stop");
      setIsActive(false);
      if (eventSourceRef.current) eventSourceRef.current.close();
      setFeedback("Session stopped");
      setWarning("");
      setDirection("none");
      toast.info("Session stopped.");
    } catch {
      toast.error("Failed to stop session.");
    }
  };

  const handleReset = async () => {
    try {
      await axios.post("http://localhost:5002/reset");
      setReps(0);
      toast.success("Counter reset.");
    } catch {
      toast.error("Failed to reset.");
    }
  };

  // ── Permission Prompt Screen ──────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <div className="p-8 bg-white min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100 bg-white">
          <div className="w-16 h-16 bg-blue-50 text-[#3b82f6] rounded-2xl flex items-center justify-center mx-auto">
            <Camera size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Camera Permission Required
            </h2>
            <p className="text-gray-500 text-xs leading-relaxed">
              PoseFit needs your camera to track your{" "}
              <span className="font-bold text-gray-800">{currentEx.name}</span>{" "}
              posture in real time.
            </p>
          </div>
          <button
            onClick={requestCamera}
            className="w-full py-4 bg-[#fde2c4] hover:bg-[#ffd0a5] text-gray-900 font-bold uppercase tracking-widest text-xs rounded-2xl transition-all"
          >
            Allow Camera Access
          </button>
          <button
            onClick={() => navigate("/posture-detection")}
            className="text-gray-400 hover:text-gray-700 text-xs font-semibold"
          >
            Back to exercises
          </button>
        </div>
      </div>
    );
  }

  // ── Main Workout UI ───────────────────────────────────────────────────────
  const absAngle = Math.abs(angle);
  const percentage = Math.min(100, Math.round((absAngle / 90) * 100));

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-white min-h-screen space-y-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/posture-detection")}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex flex-wrap items-center gap-2">
              <Dumbbell className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500" />
              {currentEx.name}
              <span className="bg-blue-50 text-[#3b82f6] px-3 sm:px-4 py-1 rounded-xl text-base sm:text-lg font-bold">
                Posture Check
              </span>
            </h1>
          </div>
        </div>

        {/* Action Badges */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              if (next) window.speechSynthesis.cancel();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-bold text-xs uppercase tracking-wider transition-all ${
              isMuted
                ? "bg-red-50 border-red-200 text-red-500"
                : "bg-green-50 border-green-200 text-green-600"
            }`}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>{isMuted ? "Muted" : "Voice On"}</span>
          </button>

          <span
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-bold text-xs uppercase tracking-wider ${
              serverOnline
                ? "bg-green-50 border-green-200 text-green-600"
                : "bg-red-50 border-red-200 text-red-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                serverOnline ? "bg-green-500" : "bg-red-500"
              }`}
            />
            {serverOnline ? "AI Online" : "AI Offline"}
          </span>
        </div>
      </div>

      {/* Offline Alert */}
      {!serverOnline && (
        <div className="max-w-6xl mx-auto p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-3">
          <ShieldAlert size={20} />
          <span>
            Python service is offline. Please run{" "}
            <code className="font-mono font-bold bg-red-100 px-1 rounded">
              python app.py
            </code>{" "}
            in python-pose-service folder.
          </span>
        </div>
      )}

      {/* Main Grid: Large Camera (Left) + Clean Stats (Right) */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Large Camera Feed */}
        <div className="lg:col-span-8 overflow-hidden rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 bg-gray-50 flex flex-col justify-center relative min-h-[460px] md:min-h-[520px]">
          {isActive ? (
            <>
              <img
                src="http://localhost:5002/video_feed"
                alt="Camera Stream"
                className="w-full h-full object-cover aspect-video"
                onError={() => {
                  setServerOnline(false);
                  setIsActive(false);
                  toast.error("Camera connection lost.");
                }}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-5">
              {currentEx.image && (
                <div className="h-44 w-72 overflow-hidden rounded-2xl shadow-sm">
                  <img
                    src={currentEx.image}
                    alt={currentEx.name}
                    className="w-full h-full object-cover opacity-80"
                  />
                </div>
              )}
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-wide">
                  Camera Ready
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Position your full body in view and start detection.
                </p>
              </div>
              <button
                onClick={handleStart}
                disabled={!serverOnline}
                className="py-3 px-8 bg-[#fde2c4] hover:bg-[#ffd0a5] text-gray-900 font-bold uppercase tracking-widest text-xs rounded-2xl transition-all shadow-sm flex items-center gap-2"
              >
                <Play size={14} /> Start Detection
              </button>
            </div>
          )}
        </div>

        {/* Stats Column */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4">
          {/* Rep Count */}
          <div className="rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100 bg-white p-6 text-center space-y-2">
            <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
              {exerciseId === "plank"
                ? "Hold Time (Seconds)"
                : "Total Repetitions"}
            </span>
            <div className="text-7xl font-black text-gray-900 tracking-tight">
              {reps}
            </div>
            <span className="inline-block bg-blue-50 text-[#3b82f6] px-4 py-1 rounded-xl font-bold text-xs uppercase">
              {currentEx.name}
            </span>
          </div>

          {/* Posture Gauge */}
          <div className="rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100 bg-white p-6 flex flex-col items-center space-y-4">
            <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
              Form & Angle
            </span>

            <div className="relative h-28 w-28 flex items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={
                    warning
                      ? "#ef4444"
                      : direction !== "none"
                      ? "#22c55e"
                      : "#3b82f6"
                  }
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-gray-900">
                  {absAngle}°
                </span>
                <span className="text-[9px] font-bold text-gray-400 uppercase">
                  {direction !== "none" ? direction : "tilt"}
                </span>
              </div>
            </div>

            {/* Feedback Banner */}
            <div className="w-full text-center">
              {warning ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-bold flex items-center justify-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{warning}</span>
                </div>
              ) : isActive && !personDetected ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-xs font-bold flex items-center justify-center gap-2">
                  <AlertTriangle size={15} />
                  <span>Position yourself in front of camera</span>
                </div>
              ) : direction !== "none" ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>{feedback}</span>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-600 text-xs font-bold">
                  {feedback}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100 bg-white p-4 flex gap-3">
            {isActive ? (
              <button
                onClick={handleStop}
                className="flex-1 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold uppercase tracking-wider text-xs rounded-2xl border border-red-200 transition-all flex items-center justify-center gap-2"
              >
                <Square size={14} /> Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={!serverOnline}
                className="flex-1 py-3.5 bg-[#fde2c4] hover:bg-[#ffd0a5] text-gray-900 font-bold uppercase tracking-wider text-xs rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play size={14} /> Start
              </button>
            )}
            <button
              onClick={handleReset}
              className="flex-1 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold uppercase tracking-wider text-xs rounded-2xl border border-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
