import cv2
import mediapipe as mp
import numpy as np
from dataclasses import dataclass, field
from typing import Optional

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
PoseLandmark = mp_pose.PoseLandmark

ORANGE = (0, 165, 255)   # BGR
ORANGE_LIGHT = (100, 200, 255)

LANDMARK_SPEC = mp_drawing.DrawingSpec(color=ORANGE, thickness=3, circle_radius=5)
CONNECTION_SPEC = mp_drawing.DrawingSpec(color=ORANGE_LIGHT, thickness=2)


@dataclass
class FrameData:
    frame_idx: int
    timestamp: float
    landmarks: dict
    raw_frame: Optional[np.ndarray] = field(default=None, repr=False)


@dataclass
class ShootingMetrics:
    release_angle: Optional[float] = None
    elbow_angle_at_release: Optional[float] = None
    knee_angle_at_setup: Optional[float] = None
    shoulder_alignment: Optional[float] = None
    shot_duration_frames: Optional[int] = None
    shot_duration_seconds: Optional[float] = None
    jump_height_estimate: Optional[float] = None
    release_consistency: Optional[float] = None
    overall_score: float = 0.0
    shooting_arm: str = "right"
    frames_analyzed: int = 0
    fps: float = 30.0
    release_frame_idx: int = 0
    pose_landmarks_at_release: Optional[object] = field(default=None, repr=False)
    release_raw_frame: Optional[np.ndarray] = field(default=None, repr=False)


def calculate_angle(a, b, c) -> float:
    """Angle in degrees at vertex b formed by points a-b-c."""
    a, b, c = np.array(a[:2]), np.array(b[:2]), np.array(c[:2])
    ba = a - b
    bc = c - b
    norm = np.linalg.norm(ba) * np.linalg.norm(bc)
    if norm < 1e-9:
        return 0.0
    cosine = np.clip(np.dot(ba, bc) / norm, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosine)))


def lm_xy(landmark) -> list[float]:
    return [landmark.x, landmark.y]


class PoseAnalyzer:
    """
    Analyzes basketball shooting mechanics using MediaPipe Pose.
    Detects 7 biomechanical metrics and generates annotated pose image.
    """

    def __init__(self):
        self.pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def analyze_video(self, video_path: str) -> ShootingMetrics:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frames_data: list[FrameData] = []
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            h, w = frame.shape[:2]
            if w > 720:
                scale = 720 / w
                frame = cv2.resize(frame, (720, int(h * scale)))

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb)

            if results.pose_landmarks:
                lm = results.pose_landmarks.landmark
                frames_data.append(
                    FrameData(
                        frame_idx=frame_idx,
                        timestamp=frame_idx / fps,
                        landmarks={i: lm[i] for i in range(33)},
                        raw_frame=frame.copy(),
                    )
                )

            frame_idx += 1

        cap.release()

        if len(frames_data) < 5:
            raise ValueError(
                f"Too few pose detections ({len(frames_data)} frames). "
                "Ensure the subject is visible and well-lit."
            )

        return self._compute_metrics(frames_data, fps)

    def generate_pose_image(self, metrics: ShootingMetrics, output_path: str) -> bool:
        """
        Draw MediaPipe skeleton on the detected release frame and save to disk.
        Returns True on success.
        """
        if metrics.release_raw_frame is None or metrics.pose_landmarks_at_release is None:
            return False

        frame = metrics.release_raw_frame.copy()
        h, w = frame.shape[:2]

        # Draw full skeleton overlay
        mp_drawing.draw_landmarks(
            frame,
            metrics.pose_landmarks_at_release,
            mp_pose.POSE_CONNECTIONS,
            landmark_drawing_spec=LANDMARK_SPEC,
            connection_drawing_spec=CONNECTION_SPEC,
        )

        # Annotate shooting arm label
        arm_label = f"Shooting arm: {metrics.shooting_arm.upper()}"
        cv2.putText(frame, arm_label, (12, 30), cv2.FONT_HERSHEY_SIMPLEX,
                    0.7, (0, 165, 255), 2, cv2.LINE_AA)

        # Annotate score
        score_label = f"Score: {metrics.overall_score:.0f}/100"
        cv2.putText(frame, score_label, (12, 58), cv2.FONT_HERSHEY_SIMPLEX,
                    0.7, (100, 255, 180), 2, cv2.LINE_AA)

        cv2.imwrite(output_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
        return True

    def _detect_shooting_arm(self, frames_data: list[FrameData]) -> str:
        """
        Determine dominant shooting arm using visibility-weighted peak wrist height.
        Only counts frames where the wrist is confidently detected (visibility > 0.6).
        Falls back to overall peak comparison if neither side has enough confident frames.
        """
        right_scores, left_scores = [], []

        for fd in frames_data:
            lm = fd.landmarks
            rw = lm[PoseLandmark.RIGHT_WRIST]
            lw = lm[PoseLandmark.LEFT_WRIST]

            if rw.visibility > 0.6:
                right_scores.append((1.0 - rw.y) * rw.visibility)
            if lw.visibility > 0.6:
                left_scores.append((1.0 - lw.y) * lw.visibility)

        # Fall back to unweighted if neither arm has confident detections
        if not right_scores:
            right_scores = [1.0 - fd.landmarks[PoseLandmark.RIGHT_WRIST].y for fd in frames_data]
        if not left_scores:
            left_scores = [1.0 - fd.landmarks[PoseLandmark.LEFT_WRIST].y for fd in frames_data]

        right_max = max(right_scores)
        left_max = max(left_scores)

        # Require a meaningful difference to avoid coin-flip on ambiguous videos
        if abs(right_max - left_max) < 0.03:
            # Use elbow height as tiebreaker
            right_elbow = max(1.0 - fd.landmarks[PoseLandmark.RIGHT_ELBOW].y for fd in frames_data)
            left_elbow = max(1.0 - fd.landmarks[PoseLandmark.LEFT_ELBOW].y for fd in frames_data)
            return "right" if right_elbow >= left_elbow else "left"

        return "right" if right_max >= left_max else "left"

    def _arm_lm(self, arm: str) -> dict[str, int]:
        if arm == "right":
            return {
                "shoulder": PoseLandmark.RIGHT_SHOULDER,
                "elbow": PoseLandmark.RIGHT_ELBOW,
                "wrist": PoseLandmark.RIGHT_WRIST,
                "hip": PoseLandmark.RIGHT_HIP,
                "knee": PoseLandmark.RIGHT_KNEE,
                "ankle": PoseLandmark.RIGHT_ANKLE,
                "opp_shoulder": PoseLandmark.LEFT_SHOULDER,
            }
        return {
            "shoulder": PoseLandmark.LEFT_SHOULDER,
            "elbow": PoseLandmark.LEFT_ELBOW,
            "wrist": PoseLandmark.LEFT_WRIST,
            "hip": PoseLandmark.LEFT_HIP,
            "knee": PoseLandmark.LEFT_KNEE,
            "ankle": PoseLandmark.LEFT_ANKLE,
            "opp_shoulder": PoseLandmark.RIGHT_SHOULDER,
        }

    def _detect_release_frame(self, frames_data: list[FrameData], arm: dict) -> int:
        scores = []
        for fd in frames_data:
            lm = fd.landmarks
            wrist = lm[arm["wrist"]]
            wrist_height = 1.0 - wrist.y
            # Weight by wrist visibility
            vis = max(0.1, wrist.visibility)

            shoulder = lm_xy(lm[arm["shoulder"]])
            elbow = lm_xy(lm[arm["elbow"]])
            wrist_pos = lm_xy(lm[arm["wrist"]])
            elbow_angle = calculate_angle(shoulder, elbow, wrist_pos)
            extension = 1.0 - (elbow_angle / 180.0)

            scores.append((wrist_height * 0.65 + extension * 0.35) * vis)

        return int(np.argmax(scores))

    def _compute_metrics(self, frames_data: list[FrameData], fps: float) -> ShootingMetrics:
        arm_side = self._detect_shooting_arm(frames_data)
        arm = self._arm_lm(arm_side)

        release_idx = self._detect_release_frame(frames_data, arm)
        rf = frames_data[release_idx]
        lm = rf.landmarks

        # Re-run pose on release frame to get full PoseLandmarks object for drawing
        pose_lm_for_drawing = None
        if rf.raw_frame is not None:
            rgb = cv2.cvtColor(rf.raw_frame, cv2.COLOR_BGR2RGB)
            result = self.pose.process(rgb)
            pose_lm_for_drawing = result.pose_landmarks

        # --- Release angle: forearm vector vs horizontal ---
        elbow_pos = lm_xy(lm[arm["elbow"]])
        wrist_pos = lm_xy(lm[arm["wrist"]])
        dx = wrist_pos[0] - elbow_pos[0]
        dy = -(wrist_pos[1] - elbow_pos[1])  # flip: screen y is inverted
        release_angle = float(np.degrees(np.arctan2(dy, abs(dx) + 1e-9)))
        release_angle = float(np.clip(release_angle, 0.0, 90.0))

        # --- Elbow angle at release ---
        shoulder_pos = lm_xy(lm[arm["shoulder"]])
        elbow_angle = calculate_angle(shoulder_pos, elbow_pos, wrist_pos)

        # --- Knee angle at setup: min angle in pre-release frames ---
        setup_frames = frames_data[: max(1, release_idx)]
        knee_angles = []
        for fd in setup_frames:
            _lm = fd.landmarks
            hip = lm_xy(_lm[arm["hip"]])
            knee = lm_xy(_lm[arm["knee"]])
            ankle = lm_xy(_lm[arm["ankle"]])
            knee_angles.append(calculate_angle(hip, knee, ankle))
        knee_angle_at_setup = float(np.min(knee_angles)) if knee_angles else None

        # --- Shoulder alignment ---
        sh_main_y = lm[arm["shoulder"]].y
        sh_opp_y = lm[arm["opp_shoulder"]].y
        shoulder_alignment = float(abs(sh_main_y - sh_opp_y) * 100.0)

        # --- Shot duration ---
        wrist_heights = [1.0 - fd.landmarks[arm["wrist"]].y for fd in frames_data]
        start_idx = 0
        for i in range(release_idx - 1, max(0, release_idx - 30), -1):
            if i >= 2 and wrist_heights[i] < wrist_heights[i - 2]:
                start_idx = i
                break
        shot_duration_frames = max(1, release_idx - start_idx)
        shot_duration_seconds = shot_duration_frames / fps

        # --- Jump height ---
        hip_heights = [1.0 - fd.landmarks[arm["hip"]].y for fd in frames_data[:release_idx + 1]]
        jump_height = float(max(hip_heights) - min(hip_heights)) if len(hip_heights) > 1 else 0.0

        # --- Release consistency ---
        diffs = [abs(wrist_heights[i] - wrist_heights[i - 1]) for i in range(1, len(wrist_heights))]
        mean_jitter = float(np.mean(diffs)) if diffs else 0.05
        consistency = float(np.clip(100.0 - mean_jitter * 800.0, 20.0, 100.0))

        metrics = ShootingMetrics(
            release_angle=round(release_angle, 1),
            elbow_angle_at_release=round(elbow_angle, 1),
            knee_angle_at_setup=round(knee_angle_at_setup, 1) if knee_angle_at_setup else None,
            shoulder_alignment=round(shoulder_alignment, 2),
            shot_duration_frames=shot_duration_frames,
            shot_duration_seconds=round(shot_duration_seconds, 2),
            jump_height_estimate=round(jump_height, 3),
            release_consistency=round(consistency, 1),
            shooting_arm=arm_side,
            frames_analyzed=len(frames_data),
            fps=fps,
            release_frame_idx=frames_data[release_idx].frame_idx,
            pose_landmarks_at_release=pose_lm_for_drawing,
            release_raw_frame=rf.raw_frame,
        )
        metrics.overall_score = self._compute_score(metrics)
        return metrics

    def _compute_score(self, m: ShootingMetrics) -> float:
        component_weights = [
            ("release_angle", m.release_angle, 45.0, 55.0, 20.0, 0.25),
            ("elbow_angle", m.elbow_angle_at_release, 85.0, 100.0, 25.0, 0.22),
            ("knee_angle", m.knee_angle_at_setup, 90.0, 120.0, 35.0, 0.20),
            ("shoulder", m.shoulder_alignment, 0.0, 3.0, 8.0, 0.15),
            ("consistency", m.release_consistency, 75.0, 100.0, 40.0, 0.18),
        ]
        total_score = 0.0
        total_weight = 0.0
        for _, value, lo, hi, tol, weight in component_weights:
            if value is None:
                continue
            if lo <= value <= hi:
                component = 100.0
            else:
                dist = min(abs(value - lo), abs(value - hi))
                component = max(0.0, 100.0 - (dist / tol) * 100.0)
            total_score += component * weight
            total_weight += weight
        if total_weight == 0:
            return 50.0
        return round(min(100.0, max(0.0, total_score / total_weight)), 1)

    def close(self):
        self.pose.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
