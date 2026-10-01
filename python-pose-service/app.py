# import os
# import cv2
# import math
# import time
# import json
# import base64
# import threading
# import numpy as np
# import mediapipe as mp
# from flask import Flask, Response, jsonify, request
# from flask_cors import CORS
# from dotenv import load_dotenv

# load_dotenv()

# app = Flask(__name__)
# app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024
# CORS(app)

# mp_pose = mp.solutions.pose
# PL = mp_pose.PoseLandmark

# # General
# VIS_THRESHOLD = 0.5
# FRAME_MARGIN = 0.02
# LOST_GRACE_SECONDS = 1.5
# REP_HOLD_SECONDS = 1.0
# HOLD_BREAK_GRACE = 0.6
# ANGLE_SMOOTH_TAU = 0.15
# DIRECTION_DEADBAND = 1.5
# MAX_FRAME_WIDTH = 640
# MAX_DT = 0.5
# STALE_SESSION_SECONDS = 900
# STREAM_IDLE_SECONDS = 30

# # Side bend 
# SB_NEUTRAL_MAX = 7.0
# SB_RETURN = 10.0
# SB_START = 12.0
# SB_TARGET = 25.0
# SB_NORMAL_MAX = 35.0
# SB_TWIST_LIMIT = 15.0     
# SB_CALIB_FRAMES = 15

# # Squat 
# SQ_RETURN = 150.0
# SQ_TARGET_ANGLE = 90.0     
# SQ_TARGET_TOLERANCE = 10.0 
# SQ_MAX_NORMAL = 45.0
# SQ_VALGUS_RATIO = 0.65    
# SQ_TORSO_LEAN_MAX = 45.0  

# # Arm raise 
# AR_RETURN = 35.0
# AR_TARGET = 80.0
# AR_SYMMETRY = 20.0

# # Plank 
# PLANK_GOOD = 160.0
# PLANK_PERFECT = 170.0
# PLANK_BAD = 145.0
# PLANK_MAX_TILT = 30.0     
# PLANK_OFFSET_DEADBAND = 0.02  

# THRESHOLD_META = {
#     "VIS_THRESHOLD": (
#         "tuned",
#         "MediaPipe visibility score is in [0,1]; 0.5 is the mid confidence "
#         "point (R4). Confirm on pilot data.",
#     ),
#     "REP_HOLD_SECONDS": (
#         "tuned",
#         "A rep counts only after the perfect position is held this long. "
#         "Time based, so it does not depend on FPS.",
#     ),
#     "HOLD_BREAK_GRACE": (
#         "tuned",
#         "A short wobble out of the perfect zone does not restart the hold. "
#         "Keep it above the gap between two frames (needs about 3 FPS or more).",
#     ),
#     "LOST_GRACE_SECONDS": (
#         "tuned",
#         "Short landmark dropouts (for example a hidden hip at the bottom "
#         "of a rep) do not cancel the rep in progress.",
#     ),
#     "SB_RETURN": (
#         "tuned",
#         "Trunk must come back under this angle to finish a side bend rep. "
#         "Slightly wider than the neutral band because people rarely stand "
#         "perfectly upright.",
#     ),
#     "ANGLE_SMOOTH_TAU": (
#         "tuned",
#         "Time constant (seconds) of the exponential smoothing. Time based, "
#         "so smoothing stays light at low FPS and rep peaks are not flattened.",
#     ),
#     "SB_NEUTRAL_MAX": (
#         "tuned",
#         "Jitter band around upright posture. Measure standing still "
#         "variance in the pilot.",
#     ),
#     "SB_START": ("tuned", "Movement start band, pilot based."),
#     "SB_TARGET": (
#         "literature",
#         "Lower bound of normal lumbar-only lateral flexion, about 25 "
#         "degrees (R1, R2). A rep must cover at least the documented "
#         "normal range, not an arbitrary fraction of it.",
#     ),
#     "SB_NORMAL_MAX": (
#         "literature",
#         "Upper end of normal thoracolumbar (T+L combined) lateral "
#         "flexion, 35 degrees (R2, R1). The app measures the "
#         "shoulder-midpoint to hip-midpoint line, i.e. the combined "
#         "thoracolumbar tilt, so this is the correct ceiling to use.",
#     ),
#     "SB_TWIST_LIMIT": (
#         "tuned",
#         "Change vs the user's own neutral shoulder/hip width ratio "
#         "(personal baseline, so body proportions do not matter).",
#     ),
#     "SB_CALIB_FRAMES": ("tuned", "Neutral frames used for the twist baseline."),
#     "SQ_RETURN": (
#         "tuned",
#         "Knee flexion up to 30 degrees counts as standing again (0 degrees "
#         "is full extension, R2), with tolerance for landmark noise.",
#     ),
#     "SQ_TARGET_ANGLE": (
#         "literature",
#         "Front-squat bottom position: thighs parallel to the floor, "
#         "interior knee angle of about 90 degrees (R3). Confirmed against "
#         "reference front-squat bottom-position images.",
#     ),
#     "SQ_TARGET_TOLERANCE": (
#         "tuned",
#         "Allowed band around SQ_TARGET_ANGLE to absorb landmark noise and "
#         "body-proportion differences. Justify with pilot data.",
#     ),
#     "SQ_MAX_NORMAL": (
#         "literature",
#         "Normal knee flexion is 0 to 135 degrees (R2), which is an interior "
#         "angle of 45 degrees.",
#     ),
#     "SQ_VALGUS_RATIO": (
#         "tuned",
#         "Knee-to-knee width divided by ankle-to-ankle width, measured only "
#         "while the knees are bent. Below this ratio the knees have moved "
#         "visibly inward of the ankles (valgus / knee cave-in), a common "
#         "squat fault. Frontal-camera view assumed; must be confirmed with "
#         "pilot data since it depends on stance width and camera angle.",
#     ),
#     "SQ_TORSO_LEAN_MAX": (
#         "tuned",
#         "Maximum forward lean of the shoulder-hip line from vertical. Past "
#         "this the trunk is leaning far enough forward that spinal rounding "
#         "becomes likely; this is a 2D proxy, not a direct spine-angle "
#         "measurement, so it should be validated against pilot video.",
#     ),
#     "AR_RETURN": (
#         "tuned",
#         "Arms count as lowered under this elbow-shoulder-hip angle. "
#         "Relaxed arms are rarely exactly at 0 degrees in 2D.",
#     ),
#     "AR_TARGET": (
#         "literature",
#         "Shoulder height is 90 degrees of a normal 0 to 180 degree "
#         "abduction range (R2, R1), minus 10 degrees tolerance for 2D noise.",
#     ),
#     "AR_SYMMETRY": ("tuned", "Allowed left/right difference, pilot based."),
#     "PLANK_GOOD": (
#         "tuned",
#         "R5 studies the plank but gives no angle limits. Choose from "
#         "pilot data of correct planks.",
#     ),
#     "PLANK_PERFECT": ("tuned", "Same as PLANK_GOOD."),
#     "PLANK_BAD": ("tuned", "Same as PLANK_GOOD."),
#     "PLANK_MAX_TILT": (
#         "tuned",
#         "Body must be roughly horizontal, otherwise a standing person "
#         "would also score as a straight body line.",
#     ),
#     "PLANK_OFFSET_DEADBAND": (
#         "tuned",
#         "Ignore small hip offset when choosing sag vs pike message.",
#     ),
# }


# def threshold_report():
#     return [
#         {
#             "name": name,
#             "value": globals()[name],
#             "basis": basis,
#             "source": source,
#         }
#         for name, (basis, source) in THRESHOLD_META.items()
#     ]


# VALID_EXERCISES = {"side_bend", "squats", "plank", "arm_raise"}

# MSG_NO_PERSON = "Position yourself fully in front of the camera"
# MSG_UPPER_BODY = "Keep your shoulders and hips fully in the camera view"
# MSG_LEGS = "Keep your hips, knees and ankles fully in the camera view"
# MSG_ARMS = "Keep your shoulders, hips and elbows fully in the camera view"
# MSG_PLANK = "Turn sideways to the camera so your full body is visible"



# def calculate_joint_angle(a, b, c):
#     """Angle at point b between a-b and c-b. Works for 2D and 3D points."""
#     a = np.array(a, dtype=float)
#     b = np.array(b, dtype=float)
#     c = np.array(c, dtype=float)

#     ba = a - b
#     bc = c - b

#     norm_ba = np.linalg.norm(ba)
#     norm_bc = np.linalg.norm(bc)

#     if norm_ba == 0 or norm_bc == 0:
#         return 0.0

#     cosine = np.dot(ba, bc) / (norm_ba * norm_bc)
#     cosine = np.clip(cosine, -1.0, 1.0)

#     return float(np.degrees(np.arccos(cosine)))


# def calculate_vertical_angle(top, bottom):
#     """Signed angle of the bottom->top line from vertical (image coords)."""
#     dx = top[0] - bottom[0]
#     dy = top[1] - bottom[1]

#     angle = math.degrees(math.atan2(dx, -dy))

#     if angle > 180:
#         angle -= 360
#     elif angle < -180:
#         angle += 360

#     return angle


# def midpoint(a, b):
#     return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]


# def distance(a, b):
#     return float(np.linalg.norm(np.array(a) - np.array(b)))


# def lm_point(landmarks, index, w, h):
#     """Pixel point and visibility. Points outside the frame get visibility 0."""
#     p = landmarks[index]
#     visibility = p.visibility

#     inside = (
#         -FRAME_MARGIN <= p.x <= 1 + FRAME_MARGIN
#         and -FRAME_MARGIN <= p.y <= 1 + FRAME_MARGIN
#     )

#     if not inside:
#         visibility = 0.0

#     return [p.x * w, p.y * h], visibility


# def world_xyz(world_landmarks, index):
#     p = world_landmarks[index]
#     return [p.x, p.y, p.z]


# def to_int(p):
#     return (int(p[0]), int(p[1]))


# def draw_lines(frame, pairs, color, thickness=3):
#     for a, b in pairs:
#         cv2.line(frame, to_int(a), to_int(b), color, thickness)


# def draw_points(frame, points, radius=7):
#     for p in points:
#         cv2.circle(frame, to_int(p), radius, (0, 0, 255), -1)
#         cv2.circle(frame, to_int(p), radius + 1, (255, 255, 255), 1)


# def clamp_percent(value):
#     """Clip a 0-100 progress value and guard against NaN/inf."""
#     if value is None or math.isnan(value) or math.isinf(value):
#         return 0.0
#     return float(max(0.0, min(100.0, value)))


# class Ema:
#     """Time based exponential smoothing (alpha depends on frame gap)."""

#     def __init__(self, tau):
#         self.tau = tau
#         self.value = None
#         self.last_t = None

#     def update(self, x, now):
#         if self.value is None or self.last_t is None:
#             self.value = x
#         else:
#             dt = max(now - self.last_t, 1e-3)
#             alpha = 1 - math.exp(-dt / self.tau)
#             self.value = alpha * x + (1 - alpha) * self.value

#         self.last_t = now
#         return self.value

#     def reset(self):
#         self.value = None
#         self.last_t = None


# def blank_result():
#     return {
#         "angle": 0.0,
#         "feedback": MSG_NO_PERSON,
#         "warning": "",
#         "direction": "none",
#         "detected": False,
#         "left_arm": 0.0,
#         "right_arm": 0.0,
#         "arm": 0.0,
#         "progress": 0.0,
#         "debug": {},
#     }


# def empty_snapshot():
#     return {
#         "reps": 0,
#         "angle": 0.0,
#         "feedback": "Position yourself in front of the camera",
#         "warning": "",
#         "direction": "none",
#         "person_detected": False,
#         "left_arm_angle": 0.0,
#         "right_arm_angle": 0.0,
#         "arm_angle": 0.0,
#         "progress_percent": 0.0,
#         "debug": {},
#     }


# class WorkoutSession:
#     def __init__(self, exercise="side_bend"):
       
#         self.lock = threading.Lock()
#         self.proc_lock = threading.Lock()

#         self.exercise = exercise
#         self.is_active = True
#         self.last_updated = time.time()

#         self.pose = None
#         self.latest_jpeg = None
#         self.frame_seq = 0
#         self.snapshot = empty_snapshot()

#         self._reset_state()

#     # state 
#     def _reset_state(self):
#         self.rep_count = 0
#         self.phase = "ready"
#         self.hold_start = None
#         self.hold_last_ok = None
#         self.lost_since = None

#         self.angle_ema = Ema(ANGLE_SMOOTH_TAU)
#         self.left_ema = Ema(ANGLE_SMOOTH_TAU)
#         self.right_ema = Ema(ANGLE_SMOOTH_TAU)

#         self.last_angle = None
#         self.move_dir = "none"

#         self.plank_seconds = 0.0
#         self.last_frame_time = None

#         self.twist_samples = []
#         self.twist_baseline = None

#     def _on_lost(self, now):
#         """Person not usable in this frame. Short dropouts keep rep progress."""
#         if self.lost_since is None:
#             self.lost_since = now

#         self.last_frame_time = None

#         if now - self.lost_since > LOST_GRACE_SECONDS:
#             self.angle_ema.reset()
#             self.left_ema.reset()
#             self.right_ema.reset()

#             self.last_angle = None
#             self.move_dir = "none"

#             self._reset_rep_phase()

#     def _ensure_pose(self):
#         if self.pose is None:
#             self.pose = mp_pose.Pose(
#                 static_image_mode=False,
#                 model_complexity=1,
#                 enable_segmentation=False,
#                 smooth_landmarks=True,
#                 min_detection_confidence=0.6,
#                 min_tracking_confidence=0.6,
#             )

#     def _reset_rep_phase(self):
#         self.phase = "ready"
#         self.hold_start = None
#         self.hold_last_ok = None

#     def _advance_rep(self, now, perfect, at_rest):
#         """
#         Rep flow: ready -> holding (perfect form) -> return -> ready.
#         A rep is counted once, when the perfect position has been held for
#         REP_HOLD_SECONDS. After that the user must go back to the start
#         position (at_rest) before the next rep can start.

#         Returns: "ready", "holding", "steady", "counted", "return", "restart"
#         """
#         if self.phase == "return":
#             if at_rest:
#                 self._reset_rep_phase()
#                 return "restart"

#             return "return"

#         if self.phase == "holding":
#             if now - self.hold_last_ok > HOLD_BREAK_GRACE:
#                 self._reset_rep_phase()

#         if self.phase == "ready":
#             if not perfect:
#                 return "ready"

#             self.phase = "holding"
#             self.hold_start = now
#             self.hold_last_ok = now

#         # phase is holding here
#         if perfect:
#             self.hold_last_ok = now

#         if now - self.hold_start >= REP_HOLD_SECONDS:
#             self.rep_count += 1
#             self.phase = "return"
#             self.hold_start = None
#             self.hold_last_ok = None
#             return "counted"

#         return "holding" if perfect else "steady"

#     def _rep_debug(self, now, event, extra):
#         progress = 0.0

#         if self.phase == "holding" and self.hold_start is not None:
#             progress = min(1.0, (now - self.hold_start) / REP_HOLD_SECONDS)

#         debug = {
#             "phase": self.phase,
#             "event": event,
#             "hold_progress": round(progress, 2),
#             "hold_seconds_needed": REP_HOLD_SECONDS,
#         }
#         debug.update(extra)

#         return debug

#     def _track_direction(self, angle):
#         if self.last_angle is None:
#             self.last_angle = angle
#         elif angle < self.last_angle - DIRECTION_DEADBAND:
#             self.move_dir = "down"
#             self.last_angle = angle
#         elif angle > self.last_angle + DIRECTION_DEADBAND:
#             self.move_dir = "up"
#             self.last_angle = angle

#         return self.move_dir

#     #  public control 
#     def start(self, exercise):
#         with self.proc_lock:
#             self.exercise = exercise
#             self._reset_state()
#             self.is_active = True

#         with self.lock:
#             self.snapshot = empty_snapshot()
#             self.last_updated = time.time()

#     def reset(self):
#         with self.proc_lock:
#             self._reset_state()

#         with self.lock:
#             self.snapshot = empty_snapshot()
#             self.last_updated = time.time()

#     def reset_for_exercise(self, exercise):
#         with self.proc_lock:
#             self.exercise = exercise
#             self._reset_state()

#         with self.lock:
#             self.snapshot = empty_snapshot()
#             self.last_updated = time.time()

#     def close(self):
#         with self.proc_lock:
#             self.is_active = False

#             if self.pose is not None:
#                 try:
#                     self.pose.close()
#                 except Exception:
#                     pass

#                 self.pose = None

#     def read_snapshot(self):
#         with self.lock:
#             return dict(self.snapshot), self.is_active

#     #  frame processing 
#     def process_frame(self, frame, mirror_output=True, client_mirrored=False):
#         with self.proc_lock:
#             if not self.is_active:
#                 return None

#             self._ensure_pose()

#             now = time.time()

#             fh, fw = frame.shape[:2]
#             if fw > MAX_FRAME_WIDTH:
#                 scale = MAX_FRAME_WIDTH / fw
#                 frame = cv2.resize(
#                     frame,
#                     (MAX_FRAME_WIDTH, int(fh * scale)),
#                     interpolation=cv2.INTER_AREA,
#                 )

#             h, w = frame.shape[:2]

#             rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#             results = self.pose.process(rgb)

#             out = blank_result()

#             handlers = {
#                 "side_bend": self._side_bend,
#                 "squats": self._squat,
#                 "plank": self._plank,
#                 "arm_raise": self._arm_raise,
#             }

#             if results.pose_landmarks:
#                 handler = handlers.get(self.exercise)
#                 if handler:
#                     handler(results, frame, w, h, now, out)
#             else:
#                 self._on_lost(now)

#             if out["detected"]:
#                 self.lost_since = None

#             left_arm = out["left_arm"]
#             right_arm = out["right_arm"]
#             direction = out["direction"]

#             if client_mirrored:
#                 left_arm, right_arm = right_arm, left_arm
#                 if direction == "left":
#                     direction = "right"
#                 elif direction == "right":
#                     direction = "left"

#             snapshot = {
#                 "reps": self.rep_count,
#                 "angle": round(out["angle"], 1),
#                 "feedback": out["feedback"],
#                 "warning": out["warning"],
#                 "direction": direction,
#                 "person_detected": out["detected"],
#                 "left_arm_angle": round(left_arm, 1),
#                 "right_arm_angle": round(right_arm, 1),
#                 "arm_angle": round(out["arm"], 1),
#                 "progress_percent": round(clamp_percent(out.get("progress", 0.0)), 1),
#                 "debug": out["debug"],
#             }

#             display = cv2.flip(frame, 1) if mirror_output else frame

#             ok, jpeg = cv2.imencode(
#                 ".jpg", display, [int(cv2.IMWRITE_JPEG_QUALITY), 75]
#             )
#             jpeg_bytes = jpeg.tobytes() if ok else None

#             with self.lock:
#                 self.snapshot = snapshot
#                 self.latest_jpeg = jpeg_bytes
#                 self.frame_seq += 1
#                 self.last_updated = now

#             return snapshot, jpeg_bytes

#     # side bend 
#     def _side_bend(self, results, frame, w, h, now, out):
#         lms = results.pose_landmarks.landmark

#         l_sh, v_l_sh = lm_point(lms, PL.LEFT_SHOULDER.value, w, h)
#         r_sh, v_r_sh = lm_point(lms, PL.RIGHT_SHOULDER.value, w, h)
#         l_hip, v_l_hip = lm_point(lms, PL.LEFT_HIP.value, w, h)
#         r_hip, v_r_hip = lm_point(lms, PL.RIGHT_HIP.value, w, h)
#         l_el, v_l_el = lm_point(lms, PL.LEFT_ELBOW.value, w, h)
#         r_el, v_r_el = lm_point(lms, PL.RIGHT_ELBOW.value, w, h)

#         detected = min(v_l_sh, v_r_sh, v_l_hip, v_r_hip) >= VIS_THRESHOLD
#         out["detected"] = detected

#         if not detected:
#             out["feedback"] = MSG_UPPER_BODY
#             self._on_lost(now)
#             return

#         if v_l_el >= VIS_THRESHOLD and v_r_el >= VIS_THRESHOLD:
#             out["left_arm"] = calculate_joint_angle(l_el, l_sh, l_hip)
#             out["right_arm"] = calculate_joint_angle(r_el, r_sh, r_hip)
#             out["arm"] = (out["left_arm"] + out["right_arm"]) / 2

#         shoulder_mid = midpoint(l_sh, r_sh)
#         hip_mid = midpoint(l_hip, r_hip)

#         signed = self.angle_ema.update(
#             calculate_vertical_angle(shoulder_mid, hip_mid), now
#         )
#         abs_angle = abs(signed)

#         out["angle"] = signed
#         out["direction"] = "left" if signed > 0 else "right"
#         out["progress"] = clamp_percent(
#             (abs_angle - SB_RETURN) / (SB_TARGET - SB_RETURN) * 100
#         )

#         shoulder_w = distance(l_sh, r_sh)
#         hip_w = distance(l_hip, r_hip)
#         ratio = shoulder_w / max(hip_w, 1.0)

#         if abs_angle <= SB_NEUTRAL_MAX and self.twist_baseline is None:
#             self.twist_samples.append(ratio)

#             if len(self.twist_samples) >= SB_CALIB_FRAMES:
#                 self.twist_baseline = float(np.median(self.twist_samples))

#         twisting = False

#         if self.twist_baseline:
#             twist_pct = (
#                 abs(ratio - self.twist_baseline) / self.twist_baseline * 100
#             )
#             twisting = twist_pct > SB_TWIST_LIMIT

#         perfect = SB_TARGET <= abs_angle <= SB_NORMAL_MAX
#         at_rest = abs_angle <= SB_RETURN

#         event = self._advance_rep(now, perfect, at_rest)

#         out["debug"] = self._rep_debug(
#             now,
#             event,
#             {
#                 "perfect_zone": [SB_TARGET, SB_NORMAL_MAX],
#                 "return_below": SB_RETURN,
#                 "twisting": bool(twisting),
#             },
#         )

#         if at_rest:
#             out["direction"] = "none"

#         out["warning"] = ""

#         if event in ("counted", "return"):
#             out["feedback"] = "Rep counted! Return to the center, then bend again."
#         elif abs_angle > SB_NORMAL_MAX:
#             out["feedback"] = "Come back slightly, you've gone past the normal range."
#             out["warning"] = "Beyond normal range."
#         elif event in ("holding", "steady"):
#             out["feedback"] = "Perfect! Hold this position."
#         elif twisting and abs_angle >= SB_START:
#             out["feedback"] = "Keep your chest facing forward, don't twist."
#         elif at_rest or event in ("ready", "restart"):
#             out["feedback"] = "Ready. Bend sideways slowly."
#         else:
#             out["feedback"] = "Bend sideways slowly."

#         draw_lines(
#             frame,
#             [(l_sh, r_sh), (l_hip, r_hip), (l_sh, l_hip), (r_sh, r_hip)],
#             (255, 120, 0),
#         )
#         draw_lines(frame, [(shoulder_mid, hip_mid)], (0, 255, 255), 2)
#         draw_points(frame, [l_sh, r_sh, l_hip, r_hip, shoulder_mid, hip_mid])

#     #  squat 
#     def _squat(self, results, frame, w, h, now, out):
#         lms = results.pose_landmarks.landmark

#         world = None
#         if results.pose_world_landmarks:
#             world = results.pose_world_landmarks.landmark

#         sides = [
#             (PL.LEFT_SHOULDER, PL.LEFT_HIP, PL.LEFT_KNEE, PL.LEFT_ANKLE),
#             (PL.RIGHT_SHOULDER, PL.RIGHT_HIP, PL.RIGHT_KNEE, PL.RIGHT_ANKLE),
#         ]

#         angles = []
#         pairs = []
#         points = []

#         knee_xs = []
#         ankle_xs = []
#         shoulders = []
#         hips = []

#         for sh_id, hip_id, knee_id, ankle_id in sides:
#             sh, v_sh = lm_point(lms, sh_id.value, w, h)
#             hip, v_h = lm_point(lms, hip_id.value, w, h)
#             knee, v_k = lm_point(lms, knee_id.value, w, h)
#             ankle, v_a = lm_point(lms, ankle_id.value, w, h)

#             if min(v_h, v_k, v_a) < VIS_THRESHOLD:
#                 continue

#             if world is not None:
                
#                 angle = calculate_joint_angle(
#                     world_xyz(world, hip_id.value),
#                     world_xyz(world, knee_id.value),
#                     world_xyz(world, ankle_id.value),
#                 )
#             else:
#                 angle = calculate_joint_angle(hip, knee, ankle)

#             angles.append(angle)
#             pairs += [(hip, knee), (knee, ankle)]
#             points += [hip, knee, ankle]

#             knee_xs.append(knee[0])
#             ankle_xs.append(ankle[0])

#             if v_sh >= VIS_THRESHOLD:
#                 shoulders.append(sh)
#                 hips.append(hip)

#         detected = len(angles) > 0
#         out["detected"] = detected

#         if not detected:
#             out["feedback"] = MSG_LEGS
#             self._on_lost(now)
#             return

#         angle = self.angle_ema.update(float(np.mean(angles)), now)
#         out["angle"] = angle
#         out["direction"] = self._track_direction(angle)

#         depth_low = SQ_TARGET_ANGLE - SQ_TARGET_TOLERANCE
#         depth_high = SQ_TARGET_ANGLE + SQ_TARGET_TOLERANCE

#         out["progress"] = clamp_percent(
#             (SQ_RETURN - angle) / (SQ_RETURN - SQ_TARGET_ANGLE) * 100
#         )

#         valgus = False
#         valgus_ratio = None

#         if len(knee_xs) == 2 and len(ankle_xs) == 2:
#             knee_width = abs(knee_xs[0] - knee_xs[1])
#             ankle_width = abs(ankle_xs[0] - ankle_xs[1])

#             if ankle_width > 1e-3 and angle <= SQ_RETURN:
#                 valgus_ratio = knee_width / ankle_width
#                 valgus = valgus_ratio < SQ_VALGUS_RATIO

#         torso_lean = None

#         if len(shoulders) == 2 and len(hips) == 2:
#             shoulder_mid = midpoint(shoulders[0], shoulders[1])
#             hip_mid = midpoint(hips[0], hips[1])
#             torso_lean = abs(calculate_vertical_angle(shoulder_mid, hip_mid))

#         leaning_too_far = (
#             torso_lean is not None and torso_lean > SQ_TORSO_LEAN_MAX
#         )

#         good_form = not valgus and not leaning_too_far
#         perfect = depth_low <= angle <= depth_high and good_form
#         at_rest = angle >= SQ_RETURN

#         event = self._advance_rep(now, perfect, at_rest)

#         out["debug"] = self._rep_debug(
#             now,
#             event,
#             {
#                 "target_angle": SQ_TARGET_ANGLE,
#                 "perfect_zone": [depth_low, depth_high],
#                 "stand_above": SQ_RETURN,
#                 "legs_used": len(angles),
#                 "used_3d": world is not None,
#                 "knee_valgus": bool(valgus),
#                 "knee_ankle_ratio": (
#                     round(valgus_ratio, 2) if valgus_ratio is not None else None
#                 ),
#                 "torso_lean_deg": (
#                     round(torso_lean, 1) if torso_lean is not None else None
#                 ),
#             },
#         )

#         out["warning"] = ""

#         if event in ("counted", "return"):
#             out["feedback"] = "Rep counted! Stand back up, then squat again."
#         elif angle < SQ_MAX_NORMAL:
#             out["feedback"] = "Come up slightly, you've gone past the normal knee range."
#             out["warning"] = "Beyond normal range."
#         elif valgus:
#             out["feedback"] = "Push your knees outward, in line with your toes."
#             out["warning"] = "Knees caving in."
#         elif leaning_too_far:
#             out["feedback"] = "Keep your chest up, don't lean too far forward."
#             out["warning"] = "Excessive forward lean."
#         elif event in ("holding", "steady"):
#             out["feedback"] = "Perfect depth and form! Hold this position."
#         elif at_rest or event in ("ready", "restart"):
#             out["feedback"] = "Stand straight. Now go down slowly."
#         elif angle > depth_high:
#             out["feedback"] = "Going down. Keep going until thighs are parallel."
#         else:
#             out["feedback"] = "A little too deep, come up slightly to the target depth."

#         if len(angles) == 2:
#             pairs.append((points[0], points[3]))

#         line_color = (0, 255, 0) if good_form else (0, 0, 255)

#         draw_lines(frame, pairs, line_color)
#         draw_points(frame, points, radius=8)

#     #  plank 
#     def _plank(self, results, frame, w, h, now, out):
#         lms = results.pose_landmarks.landmark

#         sides = [
#             (PL.LEFT_SHOULDER, PL.LEFT_HIP, PL.LEFT_ANKLE),
#             (PL.RIGHT_SHOULDER, PL.RIGHT_HIP, PL.RIGHT_ANKLE),
#         ]

#         best = None

#         for sh_id, hip_id, an_id in sides:
#             sh, v_s = lm_point(lms, sh_id.value, w, h)
#             hip, v_h = lm_point(lms, hip_id.value, w, h)
#             ankle, v_a = lm_point(lms, an_id.value, w, h)

#             vis = min(v_s, v_h, v_a)

#             if best is None or vis > best[0]:
#                 best = (vis, sh, hip, ankle)

#         vis, sh, hip, ankle = best

#         detected = vis >= VIS_THRESHOLD
#         out["detected"] = detected

#         if not detected:
#             out["feedback"] = MSG_PLANK
#             self._on_lost(now)
#             return

#         angle = self.angle_ema.update(calculate_joint_angle(sh, hip, ankle), now)
#         out["angle"] = angle

#         out["progress"] = clamp_percent(
#             (angle - PLANK_BAD) / (PLANK_GOOD - PLANK_BAD) * 100
#         )

#         dx = ankle[0] - sh[0]
#         dy = ankle[1] - sh[1]
#         length = math.hypot(dx, dy)

#         tilt = math.degrees(math.atan2(abs(dy), abs(dx)))
#         horizontal = tilt <= PLANK_MAX_TILT

      
#         offset = 0.0

#         if abs(dx) > 1e-6:
#             t = (hip[0] - sh[0]) / dx
#             line_y = sh[1] + dy * t
#             offset = (hip[1] - line_y) / max(length, 1.0)

      
#         dt = 0.0

#         if self.last_frame_time is not None:
#             dt = min(now - self.last_frame_time, MAX_DT)

#         self.last_frame_time = now

#         good = horizontal and angle >= PLANK_GOOD

#         if good:
#             self.plank_seconds += dt
#             out["direction"] = "holding"

#         self.rep_count = int(self.plank_seconds)

#         out["warning"] = ""

#         if not horizontal:
#             out["feedback"] = "Lower into a plank and keep your body horizontal."
#             out["warning"] = "Turn sideways so your side is visible."
#         elif angle >= PLANK_GOOD:
#             out["feedback"] = "Good plank! Keep your hips steady and hold."
#         elif offset > PLANK_OFFSET_DEADBAND:
#             out["feedback"] = "Your hips are sagging. Lift them slightly."
#         elif offset < -PLANK_OFFSET_DEADBAND:
#             out["feedback"] = "Your hips are too high. Lower them slightly."
#         else:
#             out["feedback"] = "Straighten your body and hold."

#         draw_lines(frame, [(sh, hip), (hip, ankle)], (0, 255, 255))
#         draw_points(frame, [sh, hip, ankle], radius=8)

#     #  arm raise 
#     def _arm_raise(self, results, frame, w, h, now, out):
#         lms = results.pose_landmarks.landmark

#         l_sh, v_l_sh = lm_point(lms, PL.LEFT_SHOULDER.value, w, h)
#         r_sh, v_r_sh = lm_point(lms, PL.RIGHT_SHOULDER.value, w, h)
#         l_hip, v_l_hip = lm_point(lms, PL.LEFT_HIP.value, w, h)
#         r_hip, v_r_hip = lm_point(lms, PL.RIGHT_HIP.value, w, h)
#         l_el, v_l_el = lm_point(lms, PL.LEFT_ELBOW.value, w, h)
#         r_el, v_r_el = lm_point(lms, PL.RIGHT_ELBOW.value, w, h)
#         l_wr, v_l_wr = lm_point(lms, PL.LEFT_WRIST.value, w, h)
#         r_wr, v_r_wr = lm_point(lms, PL.RIGHT_WRIST.value, w, h)

#         detected = (
#             min(v_l_sh, v_r_sh, v_l_hip, v_r_hip, v_l_el, v_r_el)
#             >= VIS_THRESHOLD
#         )
#         out["detected"] = detected

#         if not detected:
#             out["feedback"] = MSG_ARMS
#             self._on_lost(now)
#             return

#         left = self.left_ema.update(calculate_joint_angle(l_el, l_sh, l_hip), now)
#         right = self.right_ema.update(calculate_joint_angle(r_el, r_sh, r_hip), now)
#         avg = (left + right) / 2

#         out["left_arm"] = left
#         out["right_arm"] = right
#         out["arm"] = avg
#         out["angle"] = avg
#         out["direction"] = self._track_direction(avg)

#         out["progress"] = clamp_percent(
#             (min(left, right) - AR_RETURN) / (AR_TARGET - AR_RETURN) * 100
#         )

#         both_raised = left >= AR_TARGET and right >= AR_TARGET
#         at_rest = left <= AR_RETURN and right <= AR_RETURN
#         uneven = abs(left - right) > AR_SYMMETRY

        
#         perfect = both_raised and not uneven

#         event = self._advance_rep(now, perfect, at_rest)

#         out["debug"] = self._rep_debug(
#             now,
#             event,
#             {
#                 "weaker_arm": round(min(left, right), 1),
#                 "need_at_least": AR_TARGET,
#                 "lower_below": AR_RETURN,
#                 "uneven": bool(uneven),
#             },
#         )

#         out["warning"] = ""

#         if event in ("counted", "return"):
#             out["feedback"] = "Rep counted! Lower your arms, then raise again."
#         elif uneven and not at_rest:
#             out["feedback"] = "Raise both arms evenly."
#             out["warning"] = "Uneven arm height."
#         elif event in ("holding", "steady"):
#             out["feedback"] = "Perfect! Hold your arms here."
#         elif at_rest or event in ("ready", "restart"):
#             out["feedback"] = "Arms at your sides. Raise both arms slowly."
#         else:
#             out["feedback"] = "Keep raising both arms to shoulder height."

#         pairs = [(l_sh, l_el), (r_sh, r_el)]
#         points = [l_sh, l_el, r_sh, r_el]

#         if v_l_wr >= VIS_THRESHOLD:
#             pairs.append((l_el, l_wr))
#             points.append(l_wr)

#         if v_r_wr >= VIS_THRESHOLD:
#             pairs.append((r_el, r_wr))
#             points.append(r_wr)

#         draw_lines(frame, pairs, (0, 255, 255))
#         draw_points(frame, points, radius=8)


# sessions = {}
# sessions_lock = threading.Lock()


# def get_or_create_session(session_id, exercise=None, create=True):
#     now = time.time()
#     stale = []

#     with sessions_lock:
#         for sid, s in list(sessions.items()):
#             if now - s.last_updated > STALE_SESSION_SECONDS:
#                 stale.append(sessions.pop(sid))

#         session = sessions.get(session_id)

#         if session is None and create:
#             session = WorkoutSession(exercise or "side_bend")
#             sessions[session_id] = session

#         if session is not None:
#             session.last_updated = now

#     for s in stale:
#         try:
#             s.close()
#         except Exception:
#             pass

#     if session is not None and exercise and session.exercise != exercise:
#         session.reset_for_exercise(exercise)

#     return session


# def json_error(message, code):
#     return jsonify({"error": message}), code


# #
# @app.route("/process_frame", methods=["POST"])
# def process_frame_route():
#     data = request.get_json(silent=True) or {}

#     session_id = data.get("session_id")
#     exercise = data.get("exercise")
#     image_data = data.get("image", "")

#     if not session_id:
#         return json_error("session_id is required", 400)

#     if exercise and exercise not in VALID_EXERCISES:
#         return json_error(f"Unknown exercise: {exercise}", 400)

#     if not image_data:
#         return json_error("No image provided", 400)

#     try:
#         if "," in image_data:
#             image_data = image_data.split(",", 1)[1]

#         nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
#         frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

#         if frame is None:
#             return json_error("Failed to decode image", 400)

#     except Exception as e:
#         return json_error(f"Invalid image: {str(e)}", 400)

#     session = get_or_create_session(session_id, exercise)

#     try:
#         result = session.process_frame(
#             frame,
#             mirror_output=bool(data.get("mirror_output", True)),
#             client_mirrored=bool(data.get("client_mirrored", False)),
#         )
#     except Exception as e:
#         app.logger.exception("process_frame failed")
#         return json_error(f"Processing failed: {str(e)}", 500)

#     if result is None:
#         return json_error("Session is not active", 409)

#     snapshot, jpeg_bytes = result

#     image_b64 = ""

#     if jpeg_bytes:
#         image_b64 = (
#             "data:image/jpeg;base64,"
#             + base64.b64encode(jpeg_bytes).decode("utf-8")
#         )

#     response = dict(snapshot)
#     response["image"] = image_b64

#     return jsonify(response)


# @app.route("/start", methods=["POST"])
# def start_session():
#     data = request.get_json(silent=True) or {}

#     session_id = data.get("session_id")
#     exercise = data.get("exercise", "side_bend")

#     if not session_id:
#         return json_error("session_id is required", 400)

#     if exercise not in VALID_EXERCISES:
#         return json_error(f"Unknown exercise: {exercise}", 400)

#     session = get_or_create_session(session_id, exercise)
#     session.start(exercise)

#     return jsonify({
#         "status": "started",
#         "session_id": session_id,
#         "message": f"{exercise} session initialized.",
#     })


# @app.route("/stop", methods=["POST"])
# def stop_session():
#     data = request.get_json(silent=True) or {}

#     session_id = data.get("session_id") or request.args.get("session_id")

#     session = None

#     if session_id:
#         with sessions_lock:
#             session = sessions.get(session_id)

#     if session:
#         session.close()

#         return jsonify({
#             "status": "stopped",
#             "message": "Session terminated.",
#         })

#     return jsonify({
#         "status": "already_stopped",
#         "message": "Session inactive.",
#     })


# @app.route("/reset", methods=["POST"])
# def reset_workout():
#     data = request.get_json(silent=True) or {}

#     session_id = data.get("session_id") or request.args.get("session_id")

#     if not session_id:
#         return json_error("session_id is required", 400)

#     session = get_or_create_session(session_id, create=False)

#     if session is None:
#         return json_error("Session not found", 404)

#     session.reset()

#     return jsonify({
#         "status": "reset",
#         "message": "Session metrics reset successfully.",
#     })


# @app.route("/status", methods=["GET"])
# def get_status():
#     session_id = request.args.get("session_id")

#     session = None

#     if session_id:
#         with sessions_lock:
#             session = sessions.get(session_id)

#     if session is None:
#         return jsonify({
#             "is_active": False,
#             "known_session": False,
#             "exercise": None,
#             "online": True,
#         })

#     return jsonify({
#         "is_active": session.is_active,
#         "known_session": True,
#         "exercise": session.exercise,
#         "online": True,
#     })


# @app.route("/config", methods=["GET"])
# def get_config():
#     """Thresholds with basis and source, for the thesis table."""
#     return jsonify({
#         "thresholds": threshold_report(),
#         "references": REFERENCES,
#     })


# @app.route("/metrics")
# def metrics():
#     session_id = request.args.get("session_id")

#     if not session_id:
#         return json_error("session_id is required", 400)

#     session = get_or_create_session(session_id, create=False)

#     if session is None:
#         return json_error("Session not found", 404)

#     def event_stream():
#         while True:
#             data, active = session.read_snapshot()

#             yield f"data: {json.dumps(data)}\n\n"

#             idle = time.time() - session.last_updated > STREAM_IDLE_SECONDS

#             if not active or idle:
#                 break

#             time.sleep(0.15)

#     return Response(event_stream(), mimetype="text/event-stream")


# @app.route("/video_feed")
# def video_feed():
#     session_id = request.args.get("session_id")

#     if not session_id:
#         return json_error("session_id is required", 400)

#     session = get_or_create_session(session_id, create=False)

#     if session is None:
#         return json_error("Session not found", 404)

#     def gen():
#         last_seq = -1

#         while True:
#             with session.lock:
#                 frame_bytes = session.latest_jpeg
#                 seq = session.frame_seq

#             active = session.is_active

#             if frame_bytes and seq != last_seq:
#                 last_seq = seq

#                 yield (
#                     b"--frame\r\n"
#                     b"Content-Type: image/jpeg\r\n\r\n"
#                     + frame_bytes
#                     + b"\r\n"
#                 )

#             idle = time.time() - session.last_updated > STREAM_IDLE_SECONDS

#             if not active or idle:
#                 break

#             time.sleep(0.04)

#     return Response(
#         gen(),
#         mimetype="multipart/x-mixed-replace; boundary=frame",
#     )


# if __name__ == '__main__':
#     app.run(
#     host='0.0.0.0',
#     port=int(os.environ.get('PORT', 5002)),
#     threaded=True
# )

import os
import cv2
import math
import time
import json
import base64
import threading
import numpy as np
import mediapipe as mp
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024
CORS(app)

mp_pose = mp.solutions.pose
PL = mp_pose.PoseLandmark

# General
VIS_THRESHOLD = 0.5
FRAME_MARGIN = 0.02
LOST_GRACE_SECONDS = 1.5
REP_HOLD_SECONDS = 1.0
HOLD_BREAK_GRACE = 0.6
ANGLE_SMOOTH_TAU = 0.15
DIRECTION_DEADBAND = 1.5
MAX_FRAME_WIDTH = 640
MAX_DT = 0.5
STALE_SESSION_SECONDS = 900
STREAM_IDLE_SECONDS = 30

# Side bend 
SB_NEUTRAL_MAX = 7.0
SB_RETURN = 10.0
SB_START = 12.0
SB_TARGET = 25.0
SB_NORMAL_MAX = 35.0
SB_TWIST_LIMIT = 15.0     
SB_CALIB_FRAMES = 15

# Squat 
SQ_RETURN = 150.0
SQ_TARGET_ANGLE = 90.0     
SQ_TARGET_TOLERANCE = 10.0 
SQ_MAX_NORMAL = 45.0
SQ_VALGUS_RATIO = 0.65    
SQ_TORSO_LEAN_MAX = 45.0  

# Arm raise 
AR_RETURN = 35.0
AR_TARGET = 170.0
AR_SYMMETRY = 20.0

# Plank 
PLANK_GOOD = 160.0
PLANK_PERFECT = 170.0
PLANK_BAD = 145.0
PLANK_MAX_TILT = 30.0     
PLANK_OFFSET_DEADBAND = 0.02  


VALID_EXERCISES = {"side_bend", "squats", "plank", "arm_raise"}

MSG_NO_PERSON = "Position yourself fully in front of the camera"
MSG_UPPER_BODY = "Keep your shoulders and hips fully in the camera view"
MSG_LEGS = "Keep your hips, knees and ankles fully in the camera view"
MSG_ARMS = "Keep your shoulders, hips and elbows fully in the camera view"
MSG_PLANK = "Turn sideways to the camera so your full body is visible"



def calculate_joint_angle(a, b, c):
    """Angle at point b between a-b and c-b. Works for 2D and 3D points."""
    a = np.array(a, dtype=float)
    b = np.array(b, dtype=float)
    c = np.array(c, dtype=float)

    ba = a - b
    bc = c - b

    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)

    if norm_ba == 0 or norm_bc == 0:
        return 0.0

    cosine = np.dot(ba, bc) / (norm_ba * norm_bc)
    cosine = np.clip(cosine, -1.0, 1.0)

    return float(np.degrees(np.arccos(cosine)))


def calculate_vertical_angle(top, bottom):
    """Signed angle of the bottom->top line from vertical (image coords)."""
    dx = top[0] - bottom[0]
    dy = top[1] - bottom[1]

    angle = math.degrees(math.atan2(dx, -dy))

    if angle > 180:
        angle -= 360
    elif angle < -180:
        angle += 360

    return angle


def midpoint(a, b):
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]


def distance(a, b):
    return float(np.linalg.norm(np.array(a) - np.array(b)))


def lm_point(landmarks, index, w, h):
    """Pixel point and visibility. Points outside the frame get visibility 0."""
    p = landmarks[index]
    visibility = p.visibility

    inside = (
        -FRAME_MARGIN <= p.x <= 1 + FRAME_MARGIN
        and -FRAME_MARGIN <= p.y <= 1 + FRAME_MARGIN
    )

    if not inside:
        visibility = 0.0

    return [p.x * w, p.y * h], visibility


def world_xyz(world_landmarks, index):
    p = world_landmarks[index]
    return [p.x, p.y, p.z]


def to_int(p):
    return (int(p[0]), int(p[1]))


def draw_lines(frame, pairs, color, thickness=3):
    for a, b in pairs:
        cv2.line(frame, to_int(a), to_int(b), color, thickness)


def draw_points(frame, points, radius=7):
    for p in points:
        cv2.circle(frame, to_int(p), radius, (0, 0, 255), -1)
        cv2.circle(frame, to_int(p), radius + 1, (255, 255, 255), 1)


def clamp_percent(value):
    """Clip a 0-100 progress value and guard against NaN/inf."""
    if value is None or math.isnan(value) or math.isinf(value):
        return 0.0
    return float(max(0.0, min(100.0, value)))


class Ema:
    """Time based exponential smoothing (alpha depends on frame gap)."""

    def __init__(self, tau):
        self.tau = tau
        self.value = None
        self.last_t = None

    def update(self, x, now):
        if self.value is None or self.last_t is None:
            self.value = x
        else:
            dt = max(now - self.last_t, 1e-3)
            alpha = 1 - math.exp(-dt / self.tau)
            self.value = alpha * x + (1 - alpha) * self.value

        self.last_t = now
        return self.value

    def reset(self):
        self.value = None
        self.last_t = None


def blank_result():
    return {
        "angle": 0.0,
        "feedback": MSG_NO_PERSON,
        "warning": "",
        "direction": "none",
        "detected": False,
        "left_arm": 0.0,
        "right_arm": 0.0,
        "arm": 0.0,
        "progress": 0.0,
        "debug": {},
    }


def empty_snapshot():
    return {
        "reps": 0,
        "angle": 0.0,
        "feedback": "Position yourself in front of the camera",
        "warning": "",
        "direction": "none",
        "person_detected": False,
        "left_arm_angle": 0.0,
        "right_arm_angle": 0.0,
        "arm_angle": 0.0,
        "progress_percent": 0.0,
        "debug": {},
    }


class WorkoutSession:
    def __init__(self, exercise="side_bend"):
       
        self.lock = threading.Lock()
        self.proc_lock = threading.Lock()

        self.exercise = exercise
        self.is_active = True
        self.last_updated = time.time()

        self.pose = None
        self.latest_jpeg = None
        self.frame_seq = 0
        self.snapshot = empty_snapshot()

        self._reset_state()

    # state 
    def _reset_state(self):
        self.rep_count = 0
        self.phase = "ready"
        self.hold_start = None
        self.hold_last_ok = None
        self.lost_since = None

        self.angle_ema = Ema(ANGLE_SMOOTH_TAU)
        self.left_ema = Ema(ANGLE_SMOOTH_TAU)
        self.right_ema = Ema(ANGLE_SMOOTH_TAU)

        self.last_angle = None
        self.move_dir = "none"

        self.plank_seconds = 0.0
        self.last_frame_time = None

        self.twist_samples = []
        self.twist_baseline = None

    def _on_lost(self, now):
        """Person not usable in this frame. Short dropouts keep rep progress."""
        if self.lost_since is None:
            self.lost_since = now

        self.last_frame_time = None

        if now - self.lost_since > LOST_GRACE_SECONDS:
            self.angle_ema.reset()
            self.left_ema.reset()
            self.right_ema.reset()

            self.last_angle = None
            self.move_dir = "none"

            self._reset_rep_phase()

    def _ensure_pose(self):
        if self.pose is None:
            self.pose = mp_pose.Pose(
                static_image_mode=False,
                model_complexity=1,
                enable_segmentation=False,
                smooth_landmarks=True,
                min_detection_confidence=0.6,
                min_tracking_confidence=0.6,
            )

    def _reset_rep_phase(self):
        self.phase = "ready"
        self.hold_start = None
        self.hold_last_ok = None

    def _advance_rep(self, now, perfect, at_rest):
        """
        Rep flow: ready -> holding (perfect form) -> return -> ready.
        A rep is counted once, when the perfect position has been held for
        REP_HOLD_SECONDS. After that the user must go back to the start
        position (at_rest) before the next rep can start.

        Returns: "ready", "holding", "steady", "counted", "return", "restart"
        """
        if self.phase == "return":
            if at_rest:
                self._reset_rep_phase()
                return "restart"

            return "return"

        if self.phase == "holding":
            if now - self.hold_last_ok > HOLD_BREAK_GRACE:
                self._reset_rep_phase()

        if self.phase == "ready":
            if not perfect:
                return "ready"

            self.phase = "holding"
            self.hold_start = now
            self.hold_last_ok = now

        # phase is holding here
        if perfect:
            self.hold_last_ok = now

        if now - self.hold_start >= REP_HOLD_SECONDS:
            self.rep_count += 1
            self.phase = "return"
            self.hold_start = None
            self.hold_last_ok = None
            return "counted"

        return "holding" if perfect else "steady"

    def _rep_debug(self, now, event, extra):
        progress = 0.0

        if self.phase == "holding" and self.hold_start is not None:
            progress = min(1.0, (now - self.hold_start) / REP_HOLD_SECONDS)

        debug = {
            "phase": self.phase,
            "event": event,
            "hold_progress": round(progress, 2),
            "hold_seconds_needed": REP_HOLD_SECONDS,
        }
        debug.update(extra)

        return debug

    def _track_direction(self, angle):
        if self.last_angle is None:
            self.last_angle = angle
        elif angle < self.last_angle - DIRECTION_DEADBAND:
            self.move_dir = "down"
            self.last_angle = angle
        elif angle > self.last_angle + DIRECTION_DEADBAND:
            self.move_dir = "up"
            self.last_angle = angle

        return self.move_dir

    #  public control 
    def start(self, exercise):
        with self.proc_lock:
            self.exercise = exercise
            self._reset_state()
            self.is_active = True

        with self.lock:
            self.snapshot = empty_snapshot()
            self.last_updated = time.time()

    def reset(self):
        with self.proc_lock:
            self._reset_state()

        with self.lock:
            self.snapshot = empty_snapshot()
            self.last_updated = time.time()

    def reset_for_exercise(self, exercise):
        with self.proc_lock:
            self.exercise = exercise
            self._reset_state()

        with self.lock:
            self.snapshot = empty_snapshot()
            self.last_updated = time.time()

    def close(self):
        with self.proc_lock:
            self.is_active = False

            if self.pose is not None:
                try:
                    self.pose.close()
                except Exception:
                    pass

                self.pose = None

    def read_snapshot(self):
        with self.lock:
            return dict(self.snapshot), self.is_active

    #  frame processing 
    def process_frame(self, frame, mirror_output=True, client_mirrored=False):
        with self.proc_lock:
            if not self.is_active:
                return None

            self._ensure_pose()

            now = time.time()

            fh, fw = frame.shape[:2]
            if fw > MAX_FRAME_WIDTH:
                scale = MAX_FRAME_WIDTH / fw
                frame = cv2.resize(
                    frame,
                    (MAX_FRAME_WIDTH, int(fh * scale)),
                    interpolation=cv2.INTER_AREA,
                )

            h, w = frame.shape[:2]

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb)

            out = blank_result()

            handlers = {
                "side_bend": self._side_bend,
                "squats": self._squat,
                "plank": self._plank,
                "arm_raise": self._arm_raise,
            }

            if results.pose_landmarks:
                handler = handlers.get(self.exercise)
                if handler:
                    handler(results, frame, w, h, now, out)
            else:
                self._on_lost(now)

            if out["detected"]:
                self.lost_since = None

            left_arm = out["left_arm"]
            right_arm = out["right_arm"]
            direction = out["direction"]

            if client_mirrored:
                left_arm, right_arm = right_arm, left_arm
                if direction == "left":
                    direction = "right"
                elif direction == "right":
                    direction = "left"

            snapshot = {
                "reps": self.rep_count,
                "angle": round(out["angle"], 1),
                "feedback": out["feedback"],
                "warning": out["warning"],
                "direction": direction,
                "person_detected": out["detected"],
                "left_arm_angle": round(left_arm, 1),
                "right_arm_angle": round(right_arm, 1),
                "arm_angle": round(out["arm"], 1),
                "progress_percent": round(clamp_percent(out.get("progress", 0.0)), 1),
                "debug": out["debug"],
            }

            display = cv2.flip(frame, 1) if mirror_output else frame

            ok, jpeg = cv2.imencode(
                ".jpg", display, [int(cv2.IMWRITE_JPEG_QUALITY), 75]
            )
            jpeg_bytes = jpeg.tobytes() if ok else None

            with self.lock:
                self.snapshot = snapshot
                self.latest_jpeg = jpeg_bytes
                self.frame_seq += 1
                self.last_updated = now

            return snapshot, jpeg_bytes

    # side bend 
    def _side_bend(self, results, frame, w, h, now, out):
        lms = results.pose_landmarks.landmark

        l_sh, v_l_sh = lm_point(lms, PL.LEFT_SHOULDER.value, w, h)
        r_sh, v_r_sh = lm_point(lms, PL.RIGHT_SHOULDER.value, w, h)
        l_hip, v_l_hip = lm_point(lms, PL.LEFT_HIP.value, w, h)
        r_hip, v_r_hip = lm_point(lms, PL.RIGHT_HIP.value, w, h)
        l_el, v_l_el = lm_point(lms, PL.LEFT_ELBOW.value, w, h)
        r_el, v_r_el = lm_point(lms, PL.RIGHT_ELBOW.value, w, h)

        detected = min(v_l_sh, v_r_sh, v_l_hip, v_r_hip) >= VIS_THRESHOLD
        out["detected"] = detected

        if not detected:
            out["feedback"] = MSG_UPPER_BODY
            self._on_lost(now)
            return

        if v_l_el >= VIS_THRESHOLD and v_r_el >= VIS_THRESHOLD:
            out["left_arm"] = calculate_joint_angle(l_el, l_sh, l_hip)
            out["right_arm"] = calculate_joint_angle(r_el, r_sh, r_hip)
            out["arm"] = (out["left_arm"] + out["right_arm"]) / 2

        shoulder_mid = midpoint(l_sh, r_sh)
        hip_mid = midpoint(l_hip, r_hip)

        signed = self.angle_ema.update(
            calculate_vertical_angle(shoulder_mid, hip_mid), now
        )
        abs_angle = abs(signed)

        out["angle"] = signed
        out["direction"] = "left" if signed > 0 else "right"
        out["progress"] = clamp_percent(
            (abs_angle - SB_RETURN) / (SB_TARGET - SB_RETURN) * 100
        )

        shoulder_w = distance(l_sh, r_sh)
        hip_w = distance(l_hip, r_hip)
        ratio = shoulder_w / max(hip_w, 1.0)

        if abs_angle <= SB_NEUTRAL_MAX and self.twist_baseline is None:
            self.twist_samples.append(ratio)

            if len(self.twist_samples) >= SB_CALIB_FRAMES:
                self.twist_baseline = float(np.median(self.twist_samples))

        twisting = False

        if self.twist_baseline:
            twist_pct = (
                abs(ratio - self.twist_baseline) / self.twist_baseline * 100
            )
            twisting = twist_pct > SB_TWIST_LIMIT

        perfect = SB_TARGET <= abs_angle <= SB_NORMAL_MAX
        at_rest = abs_angle <= SB_RETURN

        event = self._advance_rep(now, perfect, at_rest)

        out["debug"] = self._rep_debug(
            now,
            event,
            {
                "perfect_zone": [SB_TARGET, SB_NORMAL_MAX],
                "return_below": SB_RETURN,
                "twisting": bool(twisting),
            },
        )

        if at_rest:
            out["direction"] = "none"

        out["warning"] = ""

        if event in ("counted", "return"):
            out["feedback"] = "Rep counted! Return to the center, then bend again."
        elif abs_angle > SB_NORMAL_MAX:
            out["feedback"] = "Come back slightly, you've gone past the normal range."
            out["warning"] = "Beyond normal range."
        elif event in ("holding", "steady"):
            out["feedback"] = "Perfect! Hold this position."
        elif twisting and abs_angle >= SB_START:
            out["feedback"] = "Keep your chest facing forward, don't twist."
        elif at_rest or event in ("ready", "restart"):
            out["feedback"] = "Ready. Bend sideways slowly."
        else:
            out["feedback"] = "Bend sideways slowly."

        draw_lines(
            frame,
            [(l_sh, r_sh), (l_hip, r_hip), (l_sh, l_hip), (r_sh, r_hip)],
            (255, 120, 0),
        )
        draw_lines(frame, [(shoulder_mid, hip_mid)], (0, 255, 255), 2)
        draw_points(frame, [l_sh, r_sh, l_hip, r_hip, shoulder_mid, hip_mid])

    #  squat 
    def _squat(self, results, frame, w, h, now, out):
        lms = results.pose_landmarks.landmark

        world = None
        if results.pose_world_landmarks:
            world = results.pose_world_landmarks.landmark

        sides = [
            (PL.LEFT_SHOULDER, PL.LEFT_HIP, PL.LEFT_KNEE, PL.LEFT_ANKLE),
            (PL.RIGHT_SHOULDER, PL.RIGHT_HIP, PL.RIGHT_KNEE, PL.RIGHT_ANKLE),
        ]

        angles = []
        pairs = []
        points = []

        knee_xs = []
        ankle_xs = []
        shoulders = []
        hips = []

        for sh_id, hip_id, knee_id, ankle_id in sides:
            sh, v_sh = lm_point(lms, sh_id.value, w, h)
            hip, v_h = lm_point(lms, hip_id.value, w, h)
            knee, v_k = lm_point(lms, knee_id.value, w, h)
            ankle, v_a = lm_point(lms, ankle_id.value, w, h)

            if min(v_h, v_k, v_a) < VIS_THRESHOLD:
                continue

            if world is not None:
                
                angle = calculate_joint_angle(
                    world_xyz(world, hip_id.value),
                    world_xyz(world, knee_id.value),
                    world_xyz(world, ankle_id.value),
                )
            else:
                angle = calculate_joint_angle(hip, knee, ankle)

            angles.append(angle)
            pairs += [(hip, knee), (knee, ankle)]
            points += [hip, knee, ankle]

            knee_xs.append(knee[0])
            ankle_xs.append(ankle[0])

            if v_sh >= VIS_THRESHOLD:
                shoulders.append(sh)
                hips.append(hip)

        detected = len(angles) > 0
        out["detected"] = detected

        if not detected:
            out["feedback"] = MSG_LEGS
            self._on_lost(now)
            return

        angle = self.angle_ema.update(float(np.mean(angles)), now)
        out["angle"] = angle
        out["direction"] = self._track_direction(angle)

        depth_low = SQ_TARGET_ANGLE - SQ_TARGET_TOLERANCE
        depth_high = SQ_TARGET_ANGLE + SQ_TARGET_TOLERANCE

        out["progress"] = clamp_percent(
            (SQ_RETURN - angle) / (SQ_RETURN - SQ_TARGET_ANGLE) * 100
        )

        valgus = False
        valgus_ratio = None

        if len(knee_xs) == 2 and len(ankle_xs) == 2:
            knee_width = abs(knee_xs[0] - knee_xs[1])
            ankle_width = abs(ankle_xs[0] - ankle_xs[1])

            if ankle_width > 1e-3 and angle <= SQ_RETURN:
                valgus_ratio = knee_width / ankle_width
                valgus = valgus_ratio < SQ_VALGUS_RATIO

        torso_lean = None

        if len(shoulders) == 2 and len(hips) == 2:
            shoulder_mid = midpoint(shoulders[0], shoulders[1])
            hip_mid = midpoint(hips[0], hips[1])
            torso_lean = abs(calculate_vertical_angle(shoulder_mid, hip_mid))

        leaning_too_far = (
            torso_lean is not None and torso_lean > SQ_TORSO_LEAN_MAX
        )

        good_form = not valgus and not leaning_too_far
        perfect = depth_low <= angle <= depth_high and good_form
        at_rest = angle >= SQ_RETURN

        event = self._advance_rep(now, perfect, at_rest)

        out["debug"] = self._rep_debug(
            now,
            event,
            {
                "target_angle": SQ_TARGET_ANGLE,
                "perfect_zone": [depth_low, depth_high],
                "stand_above": SQ_RETURN,
                "legs_used": len(angles),
                "used_3d": world is not None,
                "knee_valgus": bool(valgus),
                "knee_ankle_ratio": (
                    round(valgus_ratio, 2) if valgus_ratio is not None else None
                ),
                "torso_lean_deg": (
                    round(torso_lean, 1) if torso_lean is not None else None
                ),
            },
        )

        out["warning"] = ""

        if event in ("counted", "return"):
            out["feedback"] = "Rep counted! Stand back up, then squat again."
        elif angle < SQ_MAX_NORMAL:
            out["feedback"] = "Come up slightly, you've gone past the normal knee range."
            out["warning"] = "Beyond normal range."
        elif valgus:
            out["feedback"] = "Push your knees outward, in line with your toes."
            out["warning"] = "Knees caving in."
        elif leaning_too_far:
            out["feedback"] = "Keep your chest up, don't lean too far forward."
            out["warning"] = "Excessive forward lean."
        elif event in ("holding", "steady"):
            out["feedback"] = "Perfect depth and form! Hold this position."
        elif at_rest or event in ("ready", "restart"):
            out["feedback"] = "Stand straight. Now go down slowly."
        elif angle > depth_high:
            out["feedback"] = "Going down. Keep going until thighs are parallel."
        else:
            out["feedback"] = "A little too deep, come up slightly to the target depth."

        if len(angles) == 2:
            pairs.append((points[0], points[3]))

        line_color = (0, 255, 0) if good_form else (0, 0, 255)

        draw_lines(frame, pairs, line_color)
        draw_points(frame, points, radius=8)

    #  plank 
    def _plank(self, results, frame, w, h, now, out):
        lms = results.pose_landmarks.landmark

        sides = [
            (PL.LEFT_SHOULDER, PL.LEFT_HIP, PL.LEFT_ANKLE),
            (PL.RIGHT_SHOULDER, PL.RIGHT_HIP, PL.RIGHT_ANKLE),
        ]

        best = None

        for sh_id, hip_id, an_id in sides:
            sh, v_s = lm_point(lms, sh_id.value, w, h)
            hip, v_h = lm_point(lms, hip_id.value, w, h)
            ankle, v_a = lm_point(lms, an_id.value, w, h)

            vis = min(v_s, v_h, v_a)

            if best is None or vis > best[0]:
                best = (vis, sh, hip, ankle)

        vis, sh, hip, ankle = best

        detected = vis >= VIS_THRESHOLD
        out["detected"] = detected

        if not detected:
            out["feedback"] = MSG_PLANK
            self._on_lost(now)
            return

        angle = self.angle_ema.update(calculate_joint_angle(sh, hip, ankle), now)
        out["angle"] = angle

        out["progress"] = clamp_percent(
            (angle - PLANK_BAD) / (PLANK_GOOD - PLANK_BAD) * 100
        )

        dx = ankle[0] - sh[0]
        dy = ankle[1] - sh[1]
        length = math.hypot(dx, dy)

        tilt = math.degrees(math.atan2(abs(dy), abs(dx)))
        horizontal = tilt <= PLANK_MAX_TILT

      
        offset = 0.0

        if abs(dx) > 1e-6:
            t = (hip[0] - sh[0]) / dx
            line_y = sh[1] + dy * t
            offset = (hip[1] - line_y) / max(length, 1.0)

      
        dt = 0.0

        if self.last_frame_time is not None:
            dt = min(now - self.last_frame_time, MAX_DT)

        self.last_frame_time = now

        good = horizontal and angle >= PLANK_GOOD

        if good:
            self.plank_seconds += dt
            out["direction"] = "holding"

        self.rep_count = int(self.plank_seconds)

        out["warning"] = ""

        if not horizontal:
            out["feedback"] = "Lower into a plank and keep your body horizontal."
            out["warning"] = "Turn sideways so your side is visible."
        elif angle >= PLANK_GOOD:
            out["feedback"] = "Good plank! Keep your hips steady and hold."
        elif offset > PLANK_OFFSET_DEADBAND:
            out["feedback"] = "Your hips are sagging. Lift them slightly."
        elif offset < -PLANK_OFFSET_DEADBAND:
            out["feedback"] = "Your hips are too high. Lower them slightly."
        else:
            out["feedback"] = "Straighten your body and hold."

        draw_lines(frame, [(sh, hip), (hip, ankle)], (0, 255, 255))
        draw_points(frame, [sh, hip, ankle], radius=8)

    #  arm raise 
    def _arm_raise(self, results, frame, w, h, now, out):
        lms = results.pose_landmarks.landmark

        l_sh, v_l_sh = lm_point(lms, PL.LEFT_SHOULDER.value, w, h)
        r_sh, v_r_sh = lm_point(lms, PL.RIGHT_SHOULDER.value, w, h)
        l_hip, v_l_hip = lm_point(lms, PL.LEFT_HIP.value, w, h)
        r_hip, v_r_hip = lm_point(lms, PL.RIGHT_HIP.value, w, h)
        l_el, v_l_el = lm_point(lms, PL.LEFT_ELBOW.value, w, h)
        r_el, v_r_el = lm_point(lms, PL.RIGHT_ELBOW.value, w, h)
        l_wr, v_l_wr = lm_point(lms, PL.LEFT_WRIST.value, w, h)
        r_wr, v_r_wr = lm_point(lms, PL.RIGHT_WRIST.value, w, h)

        detected = (
            min(v_l_sh, v_r_sh, v_l_hip, v_r_hip, v_l_el, v_r_el)
            >= VIS_THRESHOLD
        )
        out["detected"] = detected

        if not detected:
            out["feedback"] = MSG_ARMS
            self._on_lost(now)
            return

        left = self.left_ema.update(calculate_joint_angle(l_el, l_sh, l_hip), now)
        right = self.right_ema.update(calculate_joint_angle(r_el, r_sh, r_hip), now)
        avg = (left + right) / 2

        out["left_arm"] = left
        out["right_arm"] = right
        out["arm"] = avg
        out["angle"] = avg
        out["direction"] = self._track_direction(avg)

        out["progress"] = clamp_percent(
            (min(left, right) - AR_RETURN) / (AR_TARGET - AR_RETURN) * 100
        )

        both_raised = left >= AR_TARGET and right >= AR_TARGET
        at_rest = left <= AR_RETURN and right <= AR_RETURN
        uneven = abs(left - right) > AR_SYMMETRY

        
        perfect = both_raised and not uneven

        event = self._advance_rep(now, perfect, at_rest)

        out["debug"] = self._rep_debug(
            now,
            event,
            {
                "weaker_arm": round(min(left, right), 1),
                "need_at_least": AR_TARGET,
                "lower_below": AR_RETURN,
                "uneven": bool(uneven),
            },
        )

        out["warning"] = ""

        if event in ("counted", "return"):
            out["feedback"] = "Rep counted! Lower your arms, then raise again."
        elif uneven and not at_rest:
            out["feedback"] = "Raise both arms evenly."
            out["warning"] = "Uneven arm height."
        elif event in ("holding", "steady"):
            out["feedback"] = "Perfect! Hold your arms here."
        elif at_rest or event in ("ready", "restart"):
            out["feedback"] = "Arms at your sides. Raise both arms slowly."
        else:
            out["feedback"] = "Keep raising both arms straight up overhead."

        pairs = [(l_sh, l_el), (r_sh, r_el)]
        points = [l_sh, l_el, r_sh, r_el]

        if v_l_wr >= VIS_THRESHOLD:
            pairs.append((l_el, l_wr))
            points.append(l_wr)

        if v_r_wr >= VIS_THRESHOLD:
            pairs.append((r_el, r_wr))
            points.append(r_wr)

        draw_lines(frame, pairs, (0, 255, 255))
        draw_points(frame, points, radius=8)


sessions = {}
sessions_lock = threading.Lock()


def get_or_create_session(session_id, exercise=None, create=True):
    now = time.time()
    stale = []

    with sessions_lock:
        for sid, s in list(sessions.items()):
            if now - s.last_updated > STALE_SESSION_SECONDS:
                stale.append(sessions.pop(sid))

        session = sessions.get(session_id)

        if session is None and create:
            session = WorkoutSession(exercise or "side_bend")
            sessions[session_id] = session

        if session is not None:
            session.last_updated = now

    for s in stale:
        try:
            s.close()
        except Exception:
            pass

    if session is not None and exercise and session.exercise != exercise:
        session.reset_for_exercise(exercise)

    return session


def json_error(message, code):
    return jsonify({"error": message}), code


#
@app.route("/process_frame", methods=["POST"])
def process_frame_route():
    data = request.get_json(silent=True) or {}

    session_id = data.get("session_id")
    exercise = data.get("exercise")
    image_data = data.get("image", "")

    if not session_id:
        return json_error("session_id is required", 400)

    if exercise and exercise not in VALID_EXERCISES:
        return json_error(f"Unknown exercise: {exercise}", 400)

    if not image_data:
        return json_error("No image provided", 400)

    try:
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]

        nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return json_error("Failed to decode image", 400)

    except Exception as e:
        return json_error(f"Invalid image: {str(e)}", 400)

    session = get_or_create_session(session_id, exercise)

    try:
        result = session.process_frame(
            frame,
            mirror_output=bool(data.get("mirror_output", True)),
            client_mirrored=bool(data.get("client_mirrored", False)),
        )
    except Exception as e:
        app.logger.exception("process_frame failed")
        return json_error(f"Processing failed: {str(e)}", 500)

    if result is None:
        return json_error("Session is not active", 409)

    snapshot, jpeg_bytes = result

    image_b64 = ""

    if jpeg_bytes:
        image_b64 = (
            "data:image/jpeg;base64,"
            + base64.b64encode(jpeg_bytes).decode("utf-8")
        )

    response = dict(snapshot)
    response["image"] = image_b64

    return jsonify(response)


@app.route("/start", methods=["POST"])
def start_session():
    data = request.get_json(silent=True) or {}

    session_id = data.get("session_id")
    exercise = data.get("exercise", "side_bend")

    if not session_id:
        return json_error("session_id is required", 400)

    if exercise not in VALID_EXERCISES:
        return json_error(f"Unknown exercise: {exercise}", 400)

    session = get_or_create_session(session_id, exercise)
    session.start(exercise)

    return jsonify({
        "status": "started",
        "session_id": session_id,
        "message": f"{exercise} session initialized.",
    })


@app.route("/stop", methods=["POST"])
def stop_session():
    data = request.get_json(silent=True) or {}

    session_id = data.get("session_id") or request.args.get("session_id")

    session = None

    if session_id:
        with sessions_lock:
            session = sessions.get(session_id)

    if session:
        session.close()

        return jsonify({
            "status": "stopped",
            "message": "Session terminated.",
        })

    return jsonify({
        "status": "already_stopped",
        "message": "Session inactive.",
    })


@app.route("/reset", methods=["POST"])
def reset_workout():
    data = request.get_json(silent=True) or {}

    session_id = data.get("session_id") or request.args.get("session_id")

    if not session_id:
        return json_error("session_id is required", 400)

    session = get_or_create_session(session_id, create=False)

    if session is None:
        return json_error("Session not found", 404)

    session.reset()

    return jsonify({
        "status": "reset",
        "message": "Session metrics reset successfully.",
    })


@app.route("/status", methods=["GET"])
def get_status():
    session_id = request.args.get("session_id")

    session = None

    if session_id:
        with sessions_lock:
            session = sessions.get(session_id)

    if session is None:
        return jsonify({
            "is_active": False,
            "known_session": False,
            "exercise": None,
            "online": True,
        })

    return jsonify({
        "is_active": session.is_active,
        "known_session": True,
        "exercise": session.exercise,
        "online": True,
    })


@app.route("/metrics")
def metrics():
    session_id = request.args.get("session_id")

    if not session_id:
        return json_error("session_id is required", 400)

    session = get_or_create_session(session_id, create=False)

    if session is None:
        return json_error("Session not found", 404)

    def event_stream():
        while True:
            data, active = session.read_snapshot()

            yield f"data: {json.dumps(data)}\n\n"

            idle = time.time() - session.last_updated > STREAM_IDLE_SECONDS

            if not active or idle:
                break

            time.sleep(0.15)

    return Response(event_stream(), mimetype="text/event-stream")


@app.route("/video_feed")
def video_feed():
    session_id = request.args.get("session_id")

    if not session_id:
        return json_error("session_id is required", 400)

    session = get_or_create_session(session_id, create=False)

    if session is None:
        return json_error("Session not found", 404)

    def gen():
        last_seq = -1

        while True:
            with session.lock:
                frame_bytes = session.latest_jpeg
                seq = session.frame_seq

            active = session.is_active

            if frame_bytes and seq != last_seq:
                last_seq = seq

                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n"
                    + frame_bytes
                    + b"\r\n"
                )

            idle = time.time() - session.last_updated > STREAM_IDLE_SECONDS

            if not active or idle:
                break

            time.sleep(0.04)

    return Response(
        gen(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


if __name__ == '__main__':
    app.run(
    host='0.0.0.0',
    port=int(os.environ.get('PORT', 5002)),
    threaded=True
)