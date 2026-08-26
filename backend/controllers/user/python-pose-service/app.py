import cv2
import mediapipe as mp
import numpy as np
import math
import time
import json
import threading
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
 
app = Flask(__name__)
CORS(app)
 
# ─── Global State ────────────────────────────────────────────────────────────
lock = threading.Lock()
rep_count        = 0
current_angle    = 0.0
feedback         = "Position yourself in front of the camera"
warning          = ""
bend_direction   = "none"
bending_state    = False
person_detected  = False
 
current_exercise  = "side_bend"
squatting_state   = False
arm_raise_state   = False
plank_hold_start  = None
 
# Rep-smoothing counters (prevent noisy single-frame triggers)
squat_hold_counter    = 0
arm_raise_hold_counter = 0
HOLD_FRAMES_NEEDED    = 3          # frames arm/knee must stay in zone before state flips
 
cap       = None
is_active = False
 
# ─── MediaPipe Setup ─────────────────────────────────────────────────────────
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    enable_segmentation=False,
    min_detection_confidence=0.6,
    min_tracking_confidence=0.6
)
 
VIS_THRESHOLD = 0.6   # landmark visibility threshold (MediaPipe docs)
 
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
 
 
# ─── Frame Generator ─────────────────────────────────────────────────────────
def generate_frames():
    global cap, is_active, rep_count, current_angle, feedback, warning
    global bend_direction, bending_state, person_detected
    global current_exercise, squatting_state, arm_raise_state, plank_hold_start
    global squat_hold_counter, arm_raise_hold_counter
 
    while True:
        with lock:
            active = is_active
        if not active:
            time.sleep(0.1)
            continue
 
        if cap is None or not cap.isOpened():
            time.sleep(0.1)
            continue
 
        success, frame = cap.read()
        if not success:
            continue
 
        frame     = cv2.flip(frame, 1)
        h, w, _   = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results   = pose.process(rgb_frame)
 
        # Locals — only written to globals once at the end of each frame
        local_feedback  = "Position yourself in front of the camera"
        local_warning   = ""
        local_direction = "none"
        local_angle     = 0.0
        local_detected  = False
 
        # Snapshot shared state we need to read this frame
        with lock:
            ex          = current_exercise
            prev_angle  = current_angle
            prev_sq     = squatting_state
            prev_ar     = arm_raise_state
            prev_bend   = bending_state
            prev_reps   = rep_count
            prev_phs    = plank_hold_start
            sq_hold_c   = squat_hold_counter
            ar_hold_c   = arm_raise_hold_counter
 
        new_reps     = prev_reps
        new_sq       = prev_sq
        new_ar       = prev_ar
        new_bend     = prev_bend
        new_phs      = prev_phs
        new_sq_hold  = sq_hold_c
        new_ar_hold  = ar_hold_c
 
        if results.pose_landmarks:
            lms = results.pose_landmarks.landmark
 
            def lm(idx):
                p = lms[idx]
                return [p.x * w, p.y * h], p.visibility
 
            l_sh,  v_l_sh  = lm(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
            r_sh,  v_r_sh  = lm(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
            l_hip, v_l_hip = lm(mp_pose.PoseLandmark.LEFT_HIP.value)
            r_hip, v_r_hip = lm(mp_pose.PoseLandmark.RIGHT_HIP.value)
 
            shoulder_mid = [(l_sh[0] + r_sh[0]) / 2, (l_sh[1] + r_sh[1]) / 2]
            hip_mid      = [(l_hip[0] + r_hip[0]) / 2, (l_hip[1] + r_hip[1]) / 2]
 
            # ── SIDE BEND ────────────────────────────────────────────────────
            if ex == "side_bend":
                core_vis    = [v_l_sh, v_r_sh, v_l_hip, v_r_hip]
                local_detected = all(v >= VIS_THRESHOLD for v in core_vis)
 
                if not local_detected:
                    local_feedback = "Position yourself in front of the camera"
                    new_bend = False
                    local_direction = "none"
                else:
                    local_angle = calculate_angle(shoulder_mid, hip_mid)
                    abs_angle   = abs(local_angle)
 
                    NEUTRAL_MAX  = 6.0
                    PERFECT_MIN  = 18.0
                    PERFECT_MAX  = 45.0
                    TWIST_LIMIT  = 15.0
 
                    shoulder_dx  = abs(l_sh[0] - r_sh[0])
                    hip_dx       = abs(l_hip[0] - r_hip[0])
                    twist_ratio  = abs(shoulder_dx - hip_dx)
 
                    if abs_angle <= NEUTRAL_MAX:
                        local_feedback = "Stand straight. Good!"
                        if new_bend:
                            new_reps += 1
                        new_bend        = False
                        local_direction = "none"
 
                    elif PERFECT_MIN <= abs_angle <= PERFECT_MAX:
                        local_direction = "left" if local_angle > 0 else "right"
                        if twist_ratio > TWIST_LIMIT:
                            local_feedback = "Don't twist! Keep chest facing forward."
                            local_warning  = "Don't twist! Keep chest facing forward."
                        else:
                            local_feedback = "Perfect! Keep bending."
                            new_bend = True
 
                    elif abs_angle > PERFECT_MAX:
                        local_feedback = "Bending too far! Ease off slightly."
                        local_warning  = "Bending too far! Ease off slightly."
 
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
                l_hip_pt,  v_l_hip2 = lm(mp_pose.PoseLandmark.LEFT_HIP.value)
                l_knee_pt, v_l_knee = lm(mp_pose.PoseLandmark.LEFT_KNEE.value)
                l_ank_pt,  v_l_ank  = lm(mp_pose.PoseLandmark.LEFT_ANKLE.value)
                r_hip_pt,  v_r_hip2 = lm(mp_pose.PoseLandmark.RIGHT_HIP.value)
                r_knee_pt, v_r_knee = lm(mp_pose.PoseLandmark.RIGHT_KNEE.value)
                r_ank_pt,  v_r_ank  = lm(mp_pose.PoseLandmark.RIGHT_ANKLE.value)
 
                sq_vis = all(v >= VIS_THRESHOLD for v in
                             [v_l_hip2, v_l_knee, v_l_ank, v_r_hip2, v_r_knee, v_r_ank])
                local_detected = sq_vis
 
                if not sq_vis:
                    local_feedback  = "Position yourself in front of the camera"
                    local_direction = "none"
                    new_sq_hold     = 0
                else:
                    left_ang  = calculate_joint_angle(l_hip_pt, l_knee_pt, l_ank_pt)
                    right_ang = calculate_joint_angle(r_hip_pt, r_knee_pt, r_ank_pt)
                    knee_angle  = (left_ang + right_ang) / 2.0
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
                        new_sq    = False
 
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
                l_sh_pt,   v_l_sh2 = lm(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
                l_hip2_pt, v_l_hp2 = lm(mp_pose.PoseLandmark.LEFT_HIP.value)
                l_ank2_pt, v_l_ak2 = lm(mp_pose.PoseLandmark.LEFT_ANKLE.value)
                r_sh_pt,   v_r_sh2 = lm(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
                r_hip2_pt, v_r_hp2 = lm(mp_pose.PoseLandmark.RIGHT_HIP.value)
                r_ank2_pt, v_r_ak2 = lm(mp_pose.PoseLandmark.RIGHT_ANKLE.value)
 
                pl_vis = all(v >= VIS_THRESHOLD for v in
                             [v_l_sh2, v_l_hp2, v_l_ak2, v_r_sh2, v_r_hp2, v_r_ak2])
                local_detected = pl_vis
 
                if not pl_vis:
                    local_feedback  = "Position yourself in front of the camera"
                    local_direction = "none"
                    new_phs         = None
                else:
                    left_body  = calculate_joint_angle(l_sh_pt, l_hip2_pt, l_ank2_pt)
                    right_body = calculate_joint_angle(r_sh_pt, r_hip2_pt, r_ank2_pt)
                    body_angle  = (left_body + right_body) / 2.0
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
                    cv2.line(frame, tuple(map(int, l_sh_pt)),   tuple(map(int, r_sh_pt)),   (0, 255, 255), 3)
                    cv2.line(frame, tuple(map(int, l_hip2_pt)), tuple(map(int, r_hip2_pt)), (0, 255, 255), 3)
                    for a, b in [(l_sh_pt, l_hip2_pt), (l_hip2_pt, l_ank2_pt),
                                 (r_sh_pt, r_hip2_pt), (r_hip2_pt, r_ank2_pt)]:
                        cv2.line(frame, tuple(map(int, a)), tuple(map(int, b)), (0, 255, 255), 3)
                    for pt in [l_sh_pt, l_hip2_pt, l_ank2_pt, r_sh_pt, r_hip2_pt, r_ank2_pt]:
                        cv2.circle(frame, tuple(map(int, pt)), 8, (0, 0, 255), -1)
                        cv2.circle(frame, tuple(map(int, pt)), 8, (255, 255, 255), 1)
 
            # ── ARM RAISE ────────────────────────────────────────────────────
            elif ex == "arm_raise":
                l_sh_ar,  v_l_sh_ar  = lm(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
                l_elb_ar, v_l_elb_ar = lm(mp_pose.PoseLandmark.LEFT_ELBOW.value)
                l_wrt_ar, v_l_wrt_ar = lm(mp_pose.PoseLandmark.LEFT_WRIST.value)
                r_sh_ar,  v_r_sh_ar  = lm(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
                r_elb_ar, v_r_elb_ar = lm(mp_pose.PoseLandmark.RIGHT_ELBOW.value)
                r_wrt_ar, v_r_wrt_ar = lm(mp_pose.PoseLandmark.RIGHT_WRIST.value)
 
                ar_vis = all(v >= VIS_THRESHOLD for v in
                             [v_l_sh_ar, v_l_elb_ar, v_l_wrt_ar,
                              v_r_sh_ar, v_r_elb_ar, v_r_wrt_ar])
                local_detected = ar_vis
 
                if not ar_vis:
                    local_feedback  = "Position yourself in front of the camera"
                    local_direction = "none"
                    new_ar_hold     = 0
                else:
                    elev_left  = abs(calculate_angle(l_sh_ar, l_elb_ar))
                    elev_right = abs(calculate_angle(r_sh_ar, r_elb_ar))
                    avg_elev   = (elev_left + elev_right) / 2.0
                    local_angle = round(avg_elev, 1)
 
                    local_direction = ("up"   if avg_elev < prev_angle - 1
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
                        new_ar    = False
 
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
 
        # ── Write all state back in one lock acquisition ──────────────────
        with lock:
            current_angle        = round(local_angle, 1)
            feedback             = local_feedback
            warning              = local_warning
            bend_direction       = local_direction
            person_detected      = local_detected
            rep_count            = new_reps
            bending_state        = new_bend
            squatting_state      = new_sq
            arm_raise_state      = new_ar
            plank_hold_start     = new_phs
            squat_hold_counter   = new_sq_hold
            arm_raise_hold_counter = new_ar_hold
 
        # Encode clean frame directly without obstructive black HUD boxes
        ret, jpeg = cv2.imencode('.jpg', frame)
        if not ret:
            continue
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
 
 
# ─── Routes ──────────────────────────────────────────────────────────────────
@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')
 
 
@app.route('/metrics')
def metrics():
    def event_stream():
        while True:
            with lock:
                data = {
                    "reps":           rep_count,
                    "angle":          current_angle,
                    "feedback":       feedback,
                    "warning":        warning,
                    "direction":      bend_direction,
                    "person_detected": person_detected
                }
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(0.15)
    return Response(event_stream(), mimetype='text/event-stream')
 
 
@app.route('/start', methods=['POST'])
def start_camera():
    global cap, is_active, current_exercise, rep_count, bending_state, bend_direction
    global squatting_state, arm_raise_state, plank_hold_start, feedback, person_detected
    global squat_hold_counter, arm_raise_hold_counter
 
    req_data = request.get_json() or {}
    exercise = req_data.get('exercise', 'side_bend')
 
    with lock:
        current_exercise       = exercise
        rep_count              = 0
        bending_state          = False
        bend_direction         = "none"
        squatting_state        = False
        arm_raise_state        = False
        plank_hold_start       = None
        squat_hold_counter     = 0
        arm_raise_hold_counter = 0
        feedback               = "Position yourself in front of the camera"
        person_detected        = False
 
        if not is_active:
            # Use CAP_DSHOW on Windows for fast instant startup (<200ms vs 3-4s default)
            cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            if not cap.isOpened():
                cap = cv2.VideoCapture(0)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            is_active = True
            return jsonify({"status": "started",
                            "message": f"{exercise} session initialized."})
        return jsonify({"status": "already_started",
                        "message": "Session is already active."})
 
 
@app.route('/stop', methods=['POST'])
def stop_camera():
    global cap, is_active
    with lock:
        if is_active:
            is_active = False
            if cap is not None:
                cap.release()
                cap = None
            return jsonify({"status": "stopped",
                            "message": "Camera session terminated."})
        return jsonify({"status": "already_stopped",
                        "message": "Camera session is already inactive."})
 
 
@app.route('/reset', methods=['POST'])
def reset_workout():
    global rep_count, bending_state, bend_direction, squatting_state
    global arm_raise_state, plank_hold_start, squat_hold_counter, arm_raise_hold_counter
    with lock:
        rep_count              = 0
        bending_state          = False
        bend_direction         = "none"
        squatting_state        = False
        arm_raise_state        = False
        plank_hold_start       = None
        squat_hold_counter     = 0
        arm_raise_hold_counter = 0
        return jsonify({"status": "reset",
                        "message": "Session metrics reset successfully."})
 
 
@app.route('/status', methods=['GET'])
def get_status():
    with lock:
        return jsonify({"is_active": is_active, "exercise": current_exercise})
 
 
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, threaded=True)