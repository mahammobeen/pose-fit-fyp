import cv2
import mediapipe as mp
import numpy as np
import math
import time
import os
import json
import base64
import threading
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── MediaPipe Setup ─────────────────────────────────────────────────────────
mp_pose = mp.solutions.pose
VIS_THRESHOLD = 0.6   # landmark visibility threshold (MediaPipe docs)
HOLD_FRAMES_NEEDED = 3  # frames arm/knee must stay in zone before state flips


# ─── Angle Helpers ───────────────────────────────────────────────────────────
def calculate_angle(p1, p2):
    """Angle of line p1->p2 relative to vertical axis (degrees)."""
    vx = p1[0] - p2[0]
    vy = p1[1] - p2[1]
    return math.degrees(math.atan2(vx, -vy))


def calculate_joint_angle(a, b, c):
    """Interior angle at joint b formed by points a-b-c (degrees, 0-180)."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = (np.arctan2(c[1] - b[1], c[0] - b[0])
               - np.arctan2(a[1] - b[1], a[0] - b[0]))
    angle = np.abs(np.degrees(radians))
    return 360.0 - angle if angle > 180.0 else angle


# ─── Per-User Session Model ──────────────────────────────────────────────────
class WorkoutSession:
    def __init__(self, exercise="side_bend"):
        self.lock = threading.Lock()
        self.exercise = exercise
        self.rep_count = 0
        self.current_angle = 0.0
        self.feedback = "Position yourself in front of the camera"
        self.warning = ""
        self.bend_direction = "none"
        self.bending_state = False
        self.person_detected = False

        self.squatting_state = False
        self.arm_raise_state = False
        self.plank_hold_start = None

        self.squat_hold_counter = 0
        self.arm_raise_hold_counter = 0

        self.is_active = True
        self.last_updated = time.time()
        self.latest_jpeg = None

        # Each user gets their own MediaPipe Pose pipeline for isolated tracking
        self.pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.6,
            min_tracking_confidence=0.6
        )

    def reset(self):
        with self.lock:
            self.rep_count = 0
            self.bending_state = False
            self.bend_direction = "none"
            self.squatting_state = False
            self.arm_raise_state = False
            self.plank_hold_start = None
            self.squat_hold_counter = 0
            self.arm_raise_hold_counter = 0
            self.current_angle = 0.0
            self.feedback = "Position yourself in front of the camera"
            self.warning = ""
            self.person_detected = False

    def close(self):
        with self.lock:
            self.is_active = False
            if hasattr(self, 'pose') and self.pose:
                try:
                    self.pose.close()
                except Exception:
                    pass

    def process_frame(self, frame):
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_frame)

        local_feedback = "Position yourself in front of the camera"
        local_warning = ""
        local_direction = "none"
        local_angle = 0.0
        local_detected = False

        with self.lock:
            ex = self.exercise
            prev_angle = self.current_angle
            prev_sq = self.squatting_state
            prev_ar = self.arm_raise_state
            prev_bend = self.bending_state
            prev_reps = self.rep_count
            prev_phs = self.plank_hold_start
            sq_hold_c = self.squat_hold_counter
            ar_hold_c = self.arm_raise_hold_counter

        new_reps = prev_reps
        new_sq = prev_sq
        new_ar = prev_ar
        new_bend = prev_bend
        new_phs = prev_phs
        new_sq_hold = sq_hold_c
        new_ar_hold = ar_hold_c

        if results.pose_landmarks:
            lms = results.pose_landmarks.landmark

            def lm(idx):
                p = lms[idx]
                return [p.x * w, p.y * h], p.visibility

            l_sh, v_l_sh = lm(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
            r_sh, v_r_sh = lm(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
            l_hip, v_l_hip = lm(mp_pose.PoseLandmark.LEFT_HIP.value)
            r_hip, v_r_hip = lm(mp_pose.PoseLandmark.RIGHT_HIP.value)

            shoulder_mid = [(l_sh[0] + r_sh[0]) / 2, (l_sh[1] + r_sh[1]) / 2]
            hip_mid = [(l_hip[0] + r_hip[0]) / 2, (l_hip[1] + r_hip[1]) / 2]

            # ── SIDE BEND ────────────────────────────────────────────────────
            if ex == "side_bend":
                core_vis = [v_l_sh, v_r_sh, v_l_hip, v_r_hip]
                local_detected = all(v >= VIS_THRESHOLD for v in core_vis)

                if not local_detected:
                    local_feedback = "Position yourself in front of the camera"
                    new_bend = False
                    local_direction = "none"
                else:
                    local_angle = calculate_angle(shoulder_mid, hip_mid)
                    abs_angle = abs(local_angle)

                    NEUTRAL_MAX = 6.0
                    PERFECT_MIN = 18.0
                    PERFECT_MAX = 45.0
                    TWIST_LIMIT = 15.0

                    shoulder_dx = abs(l_sh[0] - r_sh[0])
                    hip_dx = abs(l_hip[0] - r_hip[0])
                    twist_ratio = abs(shoulder_dx - hip_dx)

                    if abs_angle <= NEUTRAL_MAX:
                        local_feedback = "Stand straight. Good!"
                        if new_bend:
                            new_reps += 1
                        new_bend = False
                        local_direction = "none"

                    elif PERFECT_MIN <= abs_angle <= PERFECT_MAX:
                        local_direction = "left" if local_angle > 0 else "right"
                        if twist_ratio > TWIST_LIMIT:
                            local_feedback = "Don't twist! Keep chest facing forward."
                            local_warning = "Don't twist! Keep chest facing forward."
                        else:
                            local_feedback = "Perfect! Keep bending."
                            new_bend = True

                    elif abs_angle > PERFECT_MAX:
                        local_feedback = "Bending too far! Ease off slightly."
                        local_warning = "Bending too far! Ease off slightly."

                    else:
                        local_feedback = ("Bend further to count rep"
                                          if new_bend else "Bend sideways slowly.")

                    # Draw
                    for a, b in [(l_sh, r_sh), (l_hip, r_hip),
                                 (l_sh, l_hip), (r_sh, r_hip)]:
                        cv2.line(frame, tuple(map(int, a)), tuple(map(int, b)), (255, 120, 0), 3)
                    cv2.line(frame, tuple(map(int, shoulder_mid)), tuple(map(int, hip_mid)), (0, 255, 255), 2)
                    for pt in [l_sh, r_sh, l_hip, r_hip, shoulder_mid, hip_mid]:
                        cv2.circle(frame, tuple(map(int, pt)), 6, (0, 0, 255), -1)
                        cv2.circle(frame, tuple(map(int, pt)), 8, (255, 255, 255), 1)

            # ── SQUATS ───────────────────────────────────────────────────────
            elif ex == "squats":
                l_hip_pt, v_l_hip2 = lm(mp_pose.PoseLandmark.LEFT_HIP.value)
                l_knee_pt, v_l_knee = lm(mp_pose.PoseLandmark.LEFT_KNEE.value)
                l_ank_pt, v_l_ank = lm(mp_pose.PoseLandmark.LEFT_ANKLE.value)
                r_hip_pt, v_r_hip2 = lm(mp_pose.PoseLandmark.RIGHT_HIP.value)
                r_knee_pt, v_r_knee = lm(mp_pose.PoseLandmark.RIGHT_KNEE.value)
                r_ank_pt, v_r_ank = lm(mp_pose.PoseLandmark.RIGHT_ANKLE.value)

                sq_vis = all(v >= VIS_THRESHOLD for v in
                             [v_l_hip2, v_l_knee, v_l_ank, v_r_hip2, v_r_knee, v_r_ank])
                local_detected = sq_vis

                if not sq_vis:
                    local_feedback = "Position yourself in front of the camera"
                    local_direction = "none"
                    new_sq_hold = 0
                else:
                    left_ang = calculate_joint_angle(l_hip_pt, l_knee_pt, l_ank_pt)
                    right_ang = calculate_joint_angle(r_hip_pt, r_knee_pt, r_ank_pt)
                    knee_angle = (left_ang + right_ang) / 2.0
                    local_angle = round(knee_angle, 1)

                    local_direction = ("down" if knee_angle < prev_angle - 1
                                       else "up" if knee_angle > prev_angle + 1
                                       else "none")

                    # Smoothed rep counting
                    if knee_angle < 100:
                        new_sq_hold += 1
                        if new_sq_hold >= HOLD_FRAMES_NEEDED:
                            new_sq = True
                    else:
                        new_sq_hold = 0

                    if new_sq and knee_angle > 155:
                        new_reps += 1
                        new_sq = False

                    # Feedback
                    if knee_angle > 155:
                        local_feedback = "Stand straight. Now go down slowly."
                    elif knee_angle > 100:
                        local_feedback = "Going down... keep back straight!"
                    else:
                        local_feedback = "Great depth! Push back up now."

                    if knee_angle < 75:
                        local_warning = "Too deep! Protect your knees."

                    # Draw
                    cv2.line(frame, tuple(map(int, l_hip_pt)), tuple(map(int, r_hip_pt)), (0, 255, 0), 3)
                    for a, b in [(l_hip_pt, l_knee_pt), (l_knee_pt, l_ank_pt),
                                 (r_hip_pt, r_knee_pt), (r_knee_pt, r_ank_pt)]:
                        cv2.line(frame, tuple(map(int, a)), tuple(map(int, b)), (0, 255, 0), 3)
                    for pt in [l_hip_pt, l_knee_pt, l_ank_pt, r_hip_pt, r_knee_pt, r_ank_pt]:
                        cv2.circle(frame, tuple(map(int, pt)), 8, (0, 0, 255), -1)
                        cv2.circle(frame, tuple(map(int, pt)), 8, (255, 255, 255), 1)

            # ── PLANK ────────────────────────────────────────────────────────
            elif ex == "plank":
                l_sh_pt, v_l_sh2 = lm(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
                l_hip2_pt, v_l_hp2 = lm(mp_pose.PoseLandmark.LEFT_HIP.value)
                l_ank2_pt, v_l_ak2 = lm(mp_pose.PoseLandmark.LEFT_ANKLE.value)
                r_sh_pt, v_r_sh2 = lm(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
                r_hip2_pt, v_r_hp2 = lm(mp_pose.PoseLandmark.RIGHT_HIP.value)
                r_ank2_pt, v_r_ak2 = lm(mp_pose.PoseLandmark.RIGHT_ANKLE.value)

                pl_vis = all(v >= VIS_THRESHOLD for v in
                             [v_l_sh2, v_l_hp2, v_l_ak2, v_r_sh2, v_r_hp2, v_r_ak2])
                local_detected = pl_vis

                if not pl_vis:
                    local_feedback = "Position yourself in front of the camera"
                    local_direction = "none"
                    new_phs = None
                else:
                    left_body = calculate_joint_angle(l_sh_pt, l_hip2_pt, l_ank2_pt)
                    right_body = calculate_joint_angle(r_sh_pt, r_hip2_pt, r_ank2_pt)
                    body_angle = (left_body + right_body) / 2.0
                    local_angle = round(body_angle, 1)

                    now = time.time()
                    if body_angle > 155:
                        local_direction = "holding"
                        if new_phs is None:
                            new_phs = now
                        new_reps = int(now - new_phs)
                    else:
                        local_direction = "none"
                        new_phs = None

                    if body_angle > 170:
                        local_feedback = "Perfect plank! Hold it."
                    elif body_angle > 155:
                        local_feedback = "Almost perfect. Straighten your hips."
                    else:
                        local_feedback = "Hips too high or too low. Fix alignment."

                    if body_angle < 140:
                        local_warning = "Body not aligned! Adjust immediately."

                    # Draw
                    cv2.line(frame, tuple(map(int, l_sh_pt)), tuple(map(int, r_sh_pt)), (0, 255, 255), 3)
                    cv2.line(frame, tuple(map(int, l_hip2_pt)), tuple(map(int, r_hip2_pt)), (0, 255, 255), 3)
                    for a, b in [(l_sh_pt, l_hip2_pt), (l_hip2_pt, l_ank2_pt),
                                 (r_sh_pt, r_hip2_pt), (r_hip2_pt, r_ank2_pt)]:
                        cv2.line(frame, tuple(map(int, a)), tuple(map(int, b)), (0, 255, 255), 3)
                    for pt in [l_sh_pt, l_hip2_pt, l_ank2_pt, r_sh_pt, r_hip2_pt, r_ank2_pt]:
                        cv2.circle(frame, tuple(map(int, pt)), 8, (0, 0, 255), -1)
                        cv2.circle(frame, tuple(map(int, pt)), 8, (255, 255, 255), 1)

            # ── ARM RAISE ────────────────────────────────────────────────────
            elif ex == "arm_raise":
                l_sh_ar, v_l_sh_ar = lm(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
                l_elb_ar, v_l_elb_ar = lm(mp_pose.PoseLandmark.LEFT_ELBOW.value)
                l_wrt_ar, v_l_wrt_ar = lm(mp_pose.PoseLandmark.LEFT_WRIST.value)
                r_sh_ar, v_r_sh_ar = lm(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
                r_elb_ar, v_r_elb_ar = lm(mp_pose.PoseLandmark.RIGHT_ELBOW.value)
                r_wrt_ar, v_r_wrt_ar = lm(mp_pose.PoseLandmark.RIGHT_WRIST.value)

                ar_vis = all(v >= VIS_THRESHOLD for v in
                             [v_l_sh_ar, v_l_elb_ar, v_l_wrt_ar,
                              v_r_sh_ar, v_r_elb_ar, v_r_wrt_ar])
                local_detected = ar_vis

                if not ar_vis:
                    local_feedback = "Position yourself in front of the camera"
                    local_direction = "none"
                    new_ar_hold = 0
                else:
                    elev_left = abs(calculate_angle(l_sh_ar, l_elb_ar))
                    elev_right = abs(calculate_angle(r_sh_ar, r_elb_ar))
                    avg_elev = (elev_left + elev_right) / 2.0
                    local_angle = round(avg_elev, 1)

                    local_direction = ("up" if avg_elev < prev_angle - 1
                                       else "down" if avg_elev > prev_angle + 1
                                       else "none")

                    # Smoothed rep counting
                    if avg_elev < 25:
                        new_ar_hold += 1
                        if new_ar_hold >= HOLD_FRAMES_NEEDED:
                            new_ar = True
                    else:
                        new_ar_hold = 0

                    if new_ar and avg_elev > 70:
                        new_reps += 1
                        new_ar = False

                    if avg_elev > 70:
                        local_feedback = "Arms at side. Raise both arms up slowly."
                    elif avg_elev >= 25:
                        local_feedback = "Raising... keep arms straight!"
                    else:
                        local_feedback = "Full raise! Hold then lower slowly."

                    if abs(elev_left - elev_right) > 20:
                        local_warning = "Keep both arms even!"

                    # Draw — left cyan, right orange
                    for a, b in [(l_sh_ar, l_elb_ar), (l_elb_ar, l_wrt_ar)]:
                        cv2.line(frame, tuple(map(int, a)), tuple(map(int, b)), (0, 255, 255), 3)
                    for a, b in [(r_sh_ar, r_elb_ar), (r_elb_ar, r_wrt_ar)]:
                        cv2.line(frame, tuple(map(int, a)), tuple(map(int, b)), (0, 165, 255), 3)
                    for pt in [l_sh_ar, l_elb_ar, l_wrt_ar, r_sh_ar, r_elb_ar, r_wrt_ar]:
                        cv2.circle(frame, tuple(map(int, pt)), 8, (0, 0, 255), -1)
                        cv2.circle(frame, tuple(map(int, pt)), 8, (255, 255, 255), 1)

        else:
            local_feedback = "Position yourself in front of the camera"

        with self.lock:
            self.current_angle = round(local_angle, 1)
            self.feedback = local_feedback
            self.warning = local_warning
            self.bend_direction = local_direction
            self.person_detected = local_detected
            self.rep_count = new_reps
            self.bending_state = new_bend
            self.squatting_state = new_sq
            self.arm_raise_state = new_ar
            self.plank_hold_start = new_phs
            self.squat_hold_counter = new_sq_hold
            self.arm_raise_hold_counter = new_ar_hold
            self.last_updated = time.time()

        ret, jpeg = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
        jpeg_bytes = jpeg.tobytes() if ret else None
        self.latest_jpeg = jpeg_bytes

        return {
            "reps": self.rep_count,
            "angle": self.current_angle,
            "feedback": self.feedback,
            "warning": self.warning,
            "direction": self.bend_direction,
            "person_detected": self.person_detected,
            "frame_bytes": jpeg_bytes
        }


# ─── Multi-Session Registry ──────────────────────────────────────────────────
sessions = {}
sessions_lock = threading.Lock()

def get_or_create_session(session_id, exercise=None):
    with sessions_lock:
        now = time.time()
        # Clean up stale sessions inactive for > 15 minutes
        stale_ids = [sid for sid, s in list(sessions.items()) if now - s.last_updated > 900]
        for sid in stale_ids:
            try:
                sessions[sid].close()
            except Exception:
                pass
            sessions.pop(sid, None)

        if not session_id:
            session_id = "default"

        if session_id not in sessions:
            sessions[session_id] = WorkoutSession(exercise or "side_bend")
        session = sessions[session_id]
        if exercise and session.exercise != exercise:
            session.exercise = exercise
        session.last_updated = now
        return session


# ─── Routes ──────────────────────────────────────────────────────────────────
@app.route('/process_frame', methods=['POST'])
def process_frame():
    """Receives browser webcam frame and processes it for the specified user session."""
    req_data = request.get_json() or {}
    session_id = req_data.get('session_id', 'default')
    exercise = req_data.get('exercise')
    image_data = req_data.get('image', '')

    if not image_data:
        return jsonify({"error": "No image provided"}), 400

    session = get_or_create_session(session_id, exercise)

    try:
        if ',' in image_data:
            image_data = image_data.split(',', 1)[1]
        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"error": "Failed to decode image"}), 400
    except Exception as e:
        return jsonify({"error": f"Invalid image: {str(e)}"}), 400

    metrics = session.process_frame(frame)

    frame_b64 = ""
    if metrics["frame_bytes"]:
        frame_b64 = "data:image/jpeg;base64," + base64.b64encode(metrics["frame_bytes"]).decode('utf-8')

    return jsonify({
        "reps": metrics["reps"],
        "angle": metrics["angle"],
        "feedback": metrics["feedback"],
        "warning": metrics["warning"],
        "direction": metrics["direction"],
        "person_detected": metrics["person_detected"],
        "image": frame_b64
    })


@app.route('/start', methods=['POST'])
def start_session():
    req_data = request.get_json() or {}
    session_id = req_data.get('session_id', 'default')
    exercise = req_data.get('exercise', 'side_bend')

    session = get_or_create_session(session_id, exercise)
    session.reset()
    session.is_active = True

    return jsonify({
        "status": "started",
        "session_id": session_id,
        "message": f"{exercise} session initialized."
    })


@app.route('/stop', methods=['POST'])
def stop_session():
    req_data = request.get_json() or {}
    session_id = req_data.get('session_id') or request.args.get('session_id', 'default')

    with sessions_lock:
        if session_id in sessions:
            sessions[session_id].is_active = False
            return jsonify({"status": "stopped", "message": "Session terminated."})
        return jsonify({"status": "already_stopped", "message": "Session inactive."})


@app.route('/reset', methods=['POST'])
def reset_workout():
    req_data = request.get_json() or {}
    session_id = req_data.get('session_id') or request.args.get('session_id', 'default')

    session = get_or_create_session(session_id)
    session.reset()
    return jsonify({"status": "reset", "message": "Session metrics reset successfully."})


@app.route('/status', methods=['GET'])
def get_status():
    session_id = request.args.get('session_id')
    with sessions_lock:
        if session_id and session_id in sessions:
            s = sessions[session_id]
            return jsonify({"is_active": s.is_active, "exercise": s.exercise, "online": True})
        return jsonify({"is_active": True, "exercise": "side_bend", "online": True})


@app.route('/metrics')
def metrics():
    session_id = request.args.get('session_id', 'default')
    session = get_or_create_session(session_id)

    def event_stream():
        while True:
            with session.lock:
                data = {
                    "reps": session.rep_count,
                    "angle": session.current_angle,
                    "feedback": session.feedback,
                    "warning": session.warning,
                    "direction": session.bend_direction,
                    "person_detected": session.person_detected
                }
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(0.15)
    return Response(event_stream(), mimetype='text/event-stream')


@app.route('/video_feed')
def video_feed():
    session_id = request.args.get('session_id', 'default')
    session = get_or_create_session(session_id)

    def gen():
        while True:
            frame_bytes = getattr(session, 'latest_jpeg', None)
            if frame_bytes:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.04)
    return Response(gen(), mimetype='multipart/x-mixed-replace; boundary=frame')


if __name__ == '__main__':
    app.run(
    host='0.0.0.0',
    port=int(os.environ.get('PORT', 5002)),
    threaded=True
)