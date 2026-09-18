
import cv2
import mediapipe as mp
import numpy as np
import math
import time
import json
import base64
import threading
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

mp_pose = mp.solutions.pose

VIS_THRESHOLD = 0.5
HOLD_FRAMES_NEEDED = 4

SIDE_BEND_NEUTRAL = 7.0
SIDE_BEND_START = 15.0
SIDE_BEND_TARGET = 20.0
SIDE_BEND_MAX = 45.0

SQUAT_DOWN_ANGLE = 105.0
SQUAT_UP_ANGLE = 160.0
SQUAT_DEEP_WARNING = 70.0

ARM_RAISE_DOWN_ANGLE = 25.0
ARM_RAISE_UP_ANGLE = 65.0
ARM_RAISE_TARGET = 70.0
ARM_SYMMETRY_LIMIT = 20.0

PLANK_GOOD_ANGLE = 160.0
PLANK_PERFECT_ANGLE = 172.0
PLANK_BAD_ANGLE = 140.0


def calculate_joint_angle(a, b, c):
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
    dx = top[0] - bottom[0]
    dy = top[1] - bottom[1]

    angle = math.degrees(math.atan2(dx, -dy))

    if angle > 180:
        angle -= 360
    elif angle < -180:
        angle += 360

    return angle


def calculate_arm_elevation(shoulder, wrist, hip):
    shoulder = np.array(shoulder, dtype=float)
    wrist = np.array(wrist, dtype=float)
    hip = np.array(hip, dtype=float)

    arm_vector = wrist - shoulder
    torso_vector = shoulder - hip

    arm_norm = np.linalg.norm(arm_vector)
    torso_norm = np.linalg.norm(torso_vector)

    if arm_norm == 0 or torso_norm == 0:
        return 0.0

    cosine = np.dot(arm_vector, torso_vector) / (arm_norm * torso_norm)
    cosine = np.clip(cosine, -1.0, 1.0)

    angle_from_torso = math.degrees(math.acos(cosine))

    return abs(angle_from_torso)


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
        self.squatting_state = False
        self.arm_raise_state = False

        self.person_detected = False

        self.plank_hold_start = None

        self.squat_hold_counter = 0
        self.arm_raise_hold_counter = 0

        self.last_angle = 0.0

        self.is_active = True
        self.last_updated = time.time()

        self.latest_jpeg = None

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
            self.current_angle = 0.0

            self.feedback = "Position yourself in front of the camera"
            self.warning = ""

            self.bend_direction = "none"

            self.bending_state = False
            self.squatting_state = False
            self.arm_raise_state = False

            self.person_detected = False

            self.plank_hold_start = None

            self.squat_hold_counter = 0
            self.arm_raise_hold_counter = 0

            self.last_angle = 0.0

            self.last_updated = time.time()

    def reset_for_exercise(self, exercise):
        with self.lock:
            self.exercise = exercise

            self.rep_count = 0
            self.current_angle = 0.0

            self.feedback = "Position yourself in front of the camera"
            self.warning = ""

            self.bend_direction = "none"

            self.bending_state = False
            self.squatting_state = False
            self.arm_raise_state = False

            self.person_detected = False

            self.plank_hold_start = None

            self.squat_hold_counter = 0
            self.arm_raise_hold_counter = 0

            self.last_angle = 0.0

            self.last_updated = time.time()

    def close(self):
        with self.lock:
            self.is_active = False

            if hasattr(self, "pose") and self.pose:
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

            prev_bend = self.bending_state
            prev_sq = self.squatting_state
            prev_ar = self.arm_raise_state

            prev_reps = self.rep_count
            prev_plank_start = self.plank_hold_start

            prev_angle = self.last_angle

            squat_hold = self.squat_hold_counter
            arm_hold = self.arm_raise_hold_counter

        new_reps = prev_reps

        new_bend = prev_bend
        new_sq = prev_sq
        new_ar = prev_ar

        new_plank_start = prev_plank_start

        new_squat_hold = squat_hold
        new_arm_hold = arm_hold

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark

            def lm(index):
                point = landmarks[index]

                return (
                    [point.x * w, point.y * h],
                    point.visibility
                )

            l_sh, v_l_sh = lm(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
            r_sh, v_r_sh = lm(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)

            l_hip, v_l_hip = lm(mp_pose.PoseLandmark.LEFT_HIP.value)
            r_hip, v_r_hip = lm(mp_pose.PoseLandmark.RIGHT_HIP.value)

            shoulder_mid = [
                (l_sh[0] + r_sh[0]) / 2,
                (l_sh[1] + r_sh[1]) / 2
            ]

            hip_mid = [
                (l_hip[0] + r_hip[0]) / 2,
                (l_hip[1] + r_hip[1]) / 2
            ]

            if ex == "side_bend":
                required_visibility = [
                    v_l_sh,
                    v_r_sh,
                    v_l_hip,
                    v_r_hip
                ]

                local_detected = all(
                    v >= VIS_THRESHOLD
                    for v in required_visibility
                )

                if not local_detected:
                    local_feedback = "Position yourself fully in front of the camera"
                    local_direction = "none"
                    new_bend = False

                else:
                    local_angle = calculate_vertical_angle(
                        shoulder_mid,
                        hip_mid
                    )

                    abs_angle = abs(local_angle)

                    shoulder_width = np.linalg.norm(
                        np.array(l_sh) - np.array(r_sh)
                    )

                    hip_width = np.linalg.norm(
                        np.array(l_hip) - np.array(r_hip)
                    )

                    width_difference = abs(
                        shoulder_width - hip_width
                    )

                    twist_ratio = (
                        width_difference /
                        max(shoulder_width, hip_width, 1)
                    ) * 100

                    if abs_angle <= SIDE_BEND_NEUTRAL:
                        local_direction = "none"

                        local_feedback = "Stand straight. Good!"

                        if new_bend:
                            new_reps += 1

                        new_bend = False

                    elif SIDE_BEND_START <= abs_angle <= SIDE_BEND_MAX:

                        local_direction = (
                            "left"
                            if local_angle > 0
                            else "right"
                        )

                        if twist_ratio > 18:
                            local_warning = "Don't twist! Keep your chest facing forward."
                            local_feedback = "Keep your chest facing forward."

                        elif abs_angle < SIDE_BEND_TARGET:
                            local_feedback = "Bend a little further sideways."

                        else:
                            local_feedback = "Perfect! Hold the bend briefly."
                            new_bend = True

                    elif abs_angle > SIDE_BEND_MAX:
                        local_warning = "Bending too far! Ease off slightly."
                        local_feedback = "Return slightly toward the center."

                    else:
                        local_direction = (
                            "left"
                            if local_angle > 0
                            else "right"
                        )

                        local_feedback = "Bend sideways slowly."

                    for a, b in [
                        (l_sh, r_sh),
                        (l_hip, r_hip),
                        (l_sh, l_hip),
                        (r_sh, r_hip)
                    ]:
                        cv2.line(
                            frame,
                            tuple(map(int, a)),
                            tuple(map(int, b)),
                            (255, 120, 0),
                            3
                        )

                    cv2.line(
                        frame,
                        tuple(map(int, shoulder_mid)),
                        tuple(map(int, hip_mid)),
                        (0, 255, 255),
                        2
                    )

                    for point in [
                        l_sh,
                        r_sh,
                        l_hip,
                        r_hip,
                        shoulder_mid,
                        hip_mid
                    ]:
                        cv2.circle(
                            frame,
                            tuple(map(int, point)),
                            6,
                            (0, 0, 255),
                            -1
                        )

                        cv2.circle(
                            frame,
                            tuple(map(int, point)),
                            8,
                            (255, 255, 255),
                            1
                        )

            elif ex == "squats":
                l_knee, v_l_knee = lm(
                    mp_pose.PoseLandmark.LEFT_KNEE.value
                )

                r_knee, v_r_knee = lm(
                    mp_pose.PoseLandmark.RIGHT_KNEE.value
                )

                l_ankle, v_l_ankle = lm(
                    mp_pose.PoseLandmark.LEFT_ANKLE.value
                )

                r_ankle, v_r_ankle = lm(
                    mp_pose.PoseLandmark.RIGHT_ANKLE.value
                )

                squat_visibility = [
                    v_l_hip,
                    v_r_hip,
                    v_l_knee,
                    v_r_knee,
                    v_l_ankle,
                    v_r_ankle
                ]

                local_detected = all(
                    v >= VIS_THRESHOLD
                    for v in squat_visibility
                )

                if not local_detected:
                    local_feedback = "Position yourself fully in front of the camera"
                    local_direction = "none"

                    new_sq = False
                    new_squat_hold = 0

                else:
                    left_knee_angle = calculate_joint_angle(
                        l_hip,
                        l_knee,
                        l_ankle
                    )

                    right_knee_angle = calculate_joint_angle(
                        r_hip,
                        r_knee,
                        r_ankle
                    )

                    knee_angle = (
                        left_knee_angle +
                        right_knee_angle
                    ) / 2

                    local_angle = round(knee_angle, 1)

                    if knee_angle < prev_angle - 1.5:
                        local_direction = "down"

                    elif knee_angle > prev_angle + 1.5:
                        local_direction = "up"

                    else:
                        local_direction = "none"

                    if knee_angle <= SQUAT_DOWN_ANGLE:
                        new_squat_hold += 1

                        if new_squat_hold >= HOLD_FRAMES_NEEDED:
                            new_sq = True

                    elif knee_angle > SQUAT_DOWN_ANGLE:
                        new_squat_hold = 0

                    if new_sq and knee_angle >= SQUAT_UP_ANGLE:
                        new_reps += 1
                        new_sq = False

                    if knee_angle >= SQUAT_UP_ANGLE:
                        local_feedback = "Stand straight. Now go down slowly."

                    elif knee_angle > SQUAT_DOWN_ANGLE:
                        local_feedback = "Going down. Keep your back straight."

                    else:
                        local_feedback = "Great depth. Push back up."

                    if knee_angle < SQUAT_DEEP_WARNING:
                        local_warning = "Too deep. Come up slightly."

                    cv2.line(
                        frame,
                        tuple(map(int, l_hip)),
                        tuple(map(int, r_hip)),
                        (0, 255, 0),
                        3
                    )

                    for a, b in [
                        (l_hip, l_knee),
                        (l_knee, l_ankle),
                        (r_hip, r_knee),
                        (r_knee, r_ankle)
                    ]:
                        cv2.line(
                            frame,
                            tuple(map(int, a)),
                            tuple(map(int, b)),
                            (0, 255, 0),
                            3
                        )

                    for point in [
                        l_hip,
                        l_knee,
                        l_ankle,
                        r_hip,
                        r_knee,
                        r_ankle
                    ]:
                        cv2.circle(
                            frame,
                            tuple(map(int, point)),
                            8,
                            (0, 0, 255),
                            -1
                        )

                        cv2.circle(
                            frame,
                            tuple(map(int, point)),
                            9,
                            (255, 255, 255),
                            1
                        )

            elif ex == "plank":
                l_ankle, v_l_ankle = lm(
                    mp_pose.PoseLandmark.LEFT_ANKLE.value
                )

                r_ankle, v_r_ankle = lm(
                    mp_pose.PoseLandmark.RIGHT_ANKLE.value
                )

                plank_visibility = [
                    v_l_sh,
                    v_r_sh,
                    v_l_hip,
                    v_r_hip,
                    v_l_ankle,
                    v_r_ankle
                ]

                local_detected = all(
                    v >= VIS_THRESHOLD
                    for v in plank_visibility
                )

                if not local_detected:
                    local_feedback = "Position yourself fully in front of the camera"
                    local_direction = "none"
                    new_plank_start = None
                    new_reps = 0

                else:
                    left_body_angle = calculate_joint_angle(
                        l_sh,
                        l_hip,
                        l_ankle
                    )

                    right_body_angle = calculate_joint_angle(
                        r_sh,
                        r_hip,
                        r_ankle
                    )

                    body_angle = (
                        left_body_angle +
                        right_body_angle
                    ) / 2

                    local_angle = round(body_angle, 1)

                    now = time.time()

                    if body_angle >= PLANK_GOOD_ANGLE:
                        local_direction = "holding"

                        if new_plank_start is None:
                            new_plank_start = now

                        new_reps = int(
                            now - new_plank_start
                        )

                        if body_angle >= PLANK_PERFECT_ANGLE:
                            local_feedback = "Perfect plank! Keep holding."

                        else:
                            local_feedback = "Good plank. Keep your hips aligned."

                    else:
                        local_direction = "none"
                        new_plank_start = None
                        new_reps = 0

                        if body_angle < PLANK_BAD_ANGLE:
                            local_warning = "Body not aligned. Adjust your hips."

                        local_feedback = "Straighten your body and hold."

                    cv2.line(
                        frame,
                        tuple(map(int, l_sh)),
                        tuple(map(int, r_sh)),
                        (0, 255, 255),
                        3
                    )

                    cv2.line(
                        frame,
                        tuple(map(int, l_hip)),
                        tuple(map(int, r_hip)),
                        (0, 255, 255),
                        3
                    )

                    for a, b in [
                        (l_sh, l_hip),
                        (l_hip, l_ankle),
                        (r_sh, r_hip),
                        (r_hip, r_ankle)
                    ]:
                        cv2.line(
                            frame,
                            tuple(map(int, a)),
                            tuple(map(int, b)),
                            (0, 255, 255),
                            3
                        )

                    for point in [
                        l_sh,
                        l_hip,
                        l_ankle,
                        r_sh,
                        r_hip,
                        r_ankle
                    ]:
                        cv2.circle(
                            frame,
                            tuple(map(int, point)),
                            8,
                            (0, 0, 255),
                            -1
                        )

                        cv2.circle(
                            frame,
                            tuple(map(int, point)),
                            9,
                            (255, 255, 255),
                            1
                        )

            elif ex == "arm_raise":
                l_elbow, v_l_elbow = lm(
                    mp_pose.PoseLandmark.LEFT_ELBOW.value
                )

                r_elbow, v_r_elbow = lm(
                    mp_pose.PoseLandmark.RIGHT_ELBOW.value
                )

                l_wrist, v_l_wrist = lm(
                    mp_pose.PoseLandmark.LEFT_WRIST.value
                )

                r_wrist, v_r_wrist = lm(
                    mp_pose.PoseLandmark.RIGHT_WRIST.value
                )

                arm_visibility = [
                    v_l_sh,
                    v_r_sh,
                    v_l_hip,
                    v_r_hip,
                    v_l_elbow,
                    v_r_elbow,
                    v_l_wrist,
                    v_r_wrist
                ]

                local_detected = all(
                    v >= VIS_THRESHOLD
                    for v in arm_visibility
                )

                if not local_detected:
                    local_feedback = "Position yourself fully in front of the camera"
                    local_direction = "none"

                    new_ar = False
                    new_arm_hold = 0

                else:
                    left_elevation = calculate_arm_elevation(
                        l_sh,
                        l_wrist,
                        l_hip
                    )

                    right_elevation = calculate_arm_elevation(
                        r_sh,
                        r_wrist,
                        r_hip
                    )

                    local_angle = round(
                        (left_elevation + right_elevation) / 2,
                        1
                    )

                    left_raised = (
                        left_elevation >= ARM_RAISE_TARGET
                    )

                    right_raised = (
                        right_elevation >= ARM_RAISE_TARGET
                    )

                    both_down = (
                        left_elevation <= ARM_RAISE_DOWN_ANGLE
                        and
                        right_elevation <= ARM_RAISE_DOWN_ANGLE
                    )

                    both_raised = (
                        left_raised and right_raised
                    )

                    if both_raised:
                        local_direction = "up"

                    elif both_down:
                        local_direction = "down"

                    else:
                        local_direction = "none"

                    if both_down:
                        new_arm_hold += 1

                        if new_arm_hold >= HOLD_FRAMES_NEEDED:
                            new_ar = False

                        local_feedback = "Arms at your sides. Raise both arms slowly."

                    elif both_raised:
                        new_arm_hold = 0

                        if not new_ar:
                            new_ar = True

                        local_feedback = "Great raise. Lower both arms slowly."

                    else:
                        new_arm_hold = 0

                        if abs(
                            left_elevation -
                            right_elevation
                        ) > ARM_SYMMETRY_LIMIT:

                            local_warning = "Keep both arms at the same height."
                            local_feedback = "Raise both arms evenly."

                        elif (
                            left_elevation > ARM_RAISE_DOWN_ANGLE
                            or
                            right_elevation > ARM_RAISE_DOWN_ANGLE
                        ):
                            local_feedback = "Keep raising both arms."

                    if new_ar and both_down:
                        new_reps += 1
                        new_ar = False

                    for a, b in [
                        (l_sh, l_elbow),
                        (l_elbow, l_wrist),
                        (r_sh, r_elbow),
                        (r_elbow, r_wrist)
                    ]:
                        cv2.line(
                            frame,
                            tuple(map(int, a)),
                            tuple(map(int, b)),
                            (0, 255, 255),
                            3
                        )

                    for point in [
                        l_sh,
                        l_elbow,
                        l_wrist,
                        r_sh,
                        r_elbow,
                        r_wrist
                    ]:
                        cv2.circle(
                            frame,
                            tuple(map(int, point)),
                            8,
                            (0, 0, 255),
                            -1
                        )

                        cv2.circle(
                            frame,
                            tuple(map(int, point)),
                            9,
                            (255, 255, 255),
                            1
                        )

        else:
            local_feedback = "Position yourself fully in front of the camera"
            local_warning = ""
            local_direction = "none"
            local_detected = False

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

            self.plank_hold_start = new_plank_start

            self.squat_hold_counter = new_squat_hold
            self.arm_raise_hold_counter = new_arm_hold

            self.last_angle = local_angle

            self.last_updated = time.time()

        ret, jpeg = cv2.imencode(
            ".jpg",
            frame,
            [
                int(cv2.IMWRITE_JPEG_QUALITY),
                75
            ]
        )

        jpeg_bytes = jpeg.tobytes() if ret else None

        with self.lock:
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


sessions = {}
sessions_lock = threading.Lock()


def get_or_create_session(session_id, exercise=None):
    with sessions_lock:
        now = time.time()

        stale_ids = [
            sid
            for sid, session in list(sessions.items())
            if now - session.last_updated > 900
        ]

        for sid in stale_ids:
            try:
                sessions[sid].close()
            except Exception:
                pass

            sessions.pop(sid, None)

        if not session_id:
            session_id = "default"

        if session_id not in sessions:
            sessions[session_id] = WorkoutSession(
                exercise or "side_bend"
            )

        session = sessions[session_id]

        if exercise and session.exercise != exercise:
            session.reset_for_exercise(exercise)

        session.last_updated = now

        return session


@app.route("/process_frame", methods=["POST"])
def process_frame():
    req_data = request.get_json() or {}

    session_id = req_data.get(
        "session_id",
        "default"
    )

    exercise = req_data.get("exercise")

    image_data = req_data.get(
        "image",
        ""
    )

    if not image_data:
        return jsonify({
            "error": "No image provided"
        }), 400

    session = get_or_create_session(
        session_id,
        exercise
    )

    with session.lock:
        if not session.is_active:
            return jsonify({
                "error": "Session is not active"
            }), 409

    try:
        if "," in image_data:
            image_data = image_data.split(
                ",",
                1
            )[1]

        img_bytes = base64.b64decode(
            image_data
        )

        nparr = np.frombuffer(
            img_bytes,
            np.uint8
        )

        frame = cv2.imdecode(
            nparr,
            cv2.IMREAD_COLOR
        )

        if frame is None:
            return jsonify({
                "error": "Failed to decode image"
            }), 400

    except Exception as e:
        return jsonify({
            "error": f"Invalid image: {str(e)}"
        }), 400

    metrics = session.process_frame(frame)

    frame_b64 = ""

    if metrics["frame_bytes"]:
        frame_b64 = (
            "data:image/jpeg;base64,"
            +
            base64.b64encode(
                metrics["frame_bytes"]
            ).decode("utf-8")
        )

    return jsonify({
        "reps": metrics["reps"],
        "angle": metrics["angle"],
        "feedback": metrics["feedback"],
        "warning": metrics["warning"],
        "direction": metrics["direction"],
        "person_detected": metrics["person_detected"],
        "image": frame_b64
    })


@app.route("/start", methods=["POST"])
def start_session():
    req_data = request.get_json() or {}

    session_id = req_data.get(
        "session_id",
        "default"
    )

    exercise = req_data.get(
        "exercise",
        "side_bend"
    )

    session = get_or_create_session(
        session_id,
        exercise
    )

    session.reset()

    with session.lock:
        session.exercise = exercise
        session.is_active = True
        session.last_updated = time.time()

    return jsonify({
        "status": "started",
        "session_id": session_id,
        "message": f"{exercise} session initialized."
    })


@app.route("/stop", methods=["POST"])
def stop_session():
    req_data = request.get_json() or {}

    session_id = (
        req_data.get("session_id")
        or request.args.get(
            "session_id",
            "default"
        )
    )

    with sessions_lock:
        session = sessions.get(session_id)

        if session:
            with session.lock:
                session.is_active = False

            return jsonify({
                "status": "stopped",
                "message": "Session terminated."
            })

    return jsonify({
        "status": "already_stopped",
        "message": "Session inactive."
    })


@app.route("/reset", methods=["POST"])
def reset_workout():
    req_data = request.get_json() or {}

    session_id = (
        req_data.get("session_id")
        or request.args.get(
            "session_id",
            "default"
        )
    )

    session = get_or_create_session(
        session_id
    )

    session.reset()

    return jsonify({
        "status": "reset",
        "message": "Session metrics reset successfully."
    })


@app.route("/status", methods=["GET"])
def get_status():
    session_id = request.args.get(
        "session_id"
    )

    with sessions_lock:
        if session_id and session_id in sessions:
            session = sessions[session_id]

            with session.lock:
                return jsonify({
                    "is_active": session.is_active,
                    "exercise": session.exercise,
                    "online": True
                })

    return jsonify({
        "is_active": True,
        "exercise": "side_bend",
        "online": True
    })


@app.route("/metrics")
def metrics():
    session_id = request.args.get(
        "session_id",
        "default"
    )

    session = get_or_create_session(
        session_id
    )

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

                active = session.is_active

            yield f"data: {json.dumps(data)}\n\n"

            if not active:
                break

            time.sleep(0.15)

    return Response(
        event_stream(),
        mimetype="text/event-stream"
    )


@app.route("/video_feed")
def video_feed():
    session_id = request.args.get(
        "session_id",
        "default"
    )

    session = get_or_create_session(
        session_id
    )

    def gen():
        while True:
            with session.lock:
                frame_bytes = session.latest_jpeg
                active = session.is_active

            if frame_bytes:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n"
                    +
                    frame_bytes
                    +
                    b"\r\n"
                )

            if not active:
                break

            time.sleep(0.04)

    return Response(
        gen(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5002,
        threaded=True
    )



