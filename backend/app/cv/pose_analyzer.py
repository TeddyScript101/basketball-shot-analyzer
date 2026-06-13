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

LANDMARK_SPEC = mp_drawing.DrawingSpec(color=ORANGE, thickness=2, circle_radius=3)
CONNECTION_SPEC = mp_drawing.DrawingSpec(color=ORANGE_LIGHT, thickness=1)


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
    release_raw_frame: Optional[np.ndarray] = field(default=None, repr=False)
    release_landmarks: Optional[dict] = field(default=None, repr=False)
    setup_raw_frame: Optional[np.ndarray] = field(default=None, repr=False)
    setup_landmarks: Optional[dict] = field(default=None, repr=False)
    loading_raw_frame: Optional[np.ndarray] = field(default=None, repr=False)
    loading_landmarks: Optional[dict] = field(default=None, repr=False)
    loading_elbow_angle: Optional[float] = None


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
        Generate a 2-panel composite: Loading → Release.
        Each panel shows the skeleton with its key angle annotated.
        """
        if metrics.release_raw_frame is None or not metrics.release_landmarks:
            return False

        def _frame(a, b):
            return a if a is not None else b

        def _lm(a, b):
            return a if a is not None else b

        panels_cfg = [
            (
                _frame(metrics.loading_raw_frame, metrics.release_raw_frame),
                _lm(metrics.loading_landmarks, metrics.release_landmarks),
                "LOADING",
                f"Knee: {metrics.knee_angle_at_setup:.0f} deg" if metrics.knee_angle_at_setup else "",
            ),
            (
                metrics.release_raw_frame,
                metrics.release_landmarks,
                "RELEASE",
                f"Release: {metrics.release_angle:.0f} deg" if metrics.release_angle else "",
            ),
        ]

        PANEL_H = 480
        panels = []
        for raw_frame, lm_dict, title, metric_label in panels_cfg:
            panel = self._build_panel(raw_frame, lm_dict, title, metric_label, PANEL_H)
            panels.append(panel)

        # Add score banner on release panel (rightmost)
        score_text = f"{metrics.overall_score:.0f}/100  |  {metrics.shooting_arm.upper()} arm"
        last = panels[-1]
        cv2.rectangle(last, (0, last.shape[0] - 36), (last.shape[1], last.shape[0]), (20, 20, 20), -1)
        cv2.putText(last, score_text, (8, last.shape[0] - 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 255, 180), 1, cv2.LINE_AA)

        composite = np.hstack(panels)
        cv2.imwrite(output_path, composite, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return True

    @staticmethod
    def _build_panel(
        raw_frame: np.ndarray,
        lm_dict: dict,
        title: str,
        metric_label: str,
        target_h: int,
    ) -> np.ndarray:
        frame = raw_frame.copy()
        h, w = frame.shape[:2]
        scale = target_h / h
        panel_w = int(w * scale)
        frame = cv2.resize(frame, (panel_w, target_h))

        # Draw skeleton connections
        for a_idx, b_idx in mp_pose.POSE_CONNECTIONS:
            la = lm_dict.get(a_idx)
            lb = lm_dict.get(b_idx)
            if la is None or lb is None:
                continue
            if la.visibility < 0.3 or lb.visibility < 0.3:
                continue
            pt1 = (int(la.x * panel_w), int(la.y * target_h))
            pt2 = (int(lb.x * panel_w), int(lb.y * target_h))
            cv2.line(frame, pt1, pt2, ORANGE_LIGHT, 1, cv2.LINE_AA)

        # Draw landmark dots
        for lm in lm_dict.values():
            if lm.visibility < 0.3:
                continue
            cv2.circle(frame, (int(lm.x * panel_w), int(lm.y * target_h)),
                       3, ORANGE, -1, cv2.LINE_AA)

        # Title bar at top
        cv2.rectangle(frame, (0, 0), (panel_w, 34), (15, 15, 15), -1)
        cv2.putText(frame, title, (10, 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, ORANGE, 2, cv2.LINE_AA)

        # Metric label bar at bottom
        if metric_label:
            cv2.rectangle(frame, (0, target_h - 34), (panel_w, target_h), (15, 15, 15), -1)
            cv2.putText(frame, metric_label, (10, target_h - 11),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (220, 220, 220), 1, cv2.LINE_AA)

        # Thin separator line on the right edge
        cv2.line(frame, (panel_w - 1, 0), (panel_w - 1, target_h), (60, 60, 60), 1)

        return frame

    def _detect_shooting_arm(self, frames_data: list[FrameData]) -> str:
        """
        4-stage shooting arm detection:
        1. Top-5 mean wrist height — clear profile shots.
        2. Wrist snap (壓手腕) — shooting hand wrist drops relative to elbow at release.
        3. Post-release follow-through — shooting hand stays high after release.
        4. Peak elbow height fallback.
        """
        def top_mean(vals: list[float], n: int = 5) -> float:
            return sum(sorted(vals, reverse=True)[: min(n, len(vals))]) / min(n, len(vals))

        n = len(frames_data)
        right_h = [1.0 - fd.landmarks[PoseLandmark.RIGHT_WRIST].y for fd in frames_data]
        left_h  = [1.0 - fd.landmarks[PoseLandmark.LEFT_WRIST].y  for fd in frames_data]

        # Stage 1: clear top-5 mean difference
        r_score = top_mean(right_h)
        l_score = top_mean(left_h)
        if abs(r_score - l_score) >= 0.05:
            return "right" if r_score > l_score else "left"

        # Rough release = peak combined wrist height in first 80% of frames
        search_end = max(1, int(0.8 * n))
        combined = [right_h[i] + left_h[i] for i in range(search_end)]
        rough_release = int(np.argmax(combined))

        # Stage 2: wrist snap (壓手腕)
        # At release, shooting hand wrist snaps forward → wrist.y rises relative to elbow.y
        # wrist_rel = wrist.y - elbow.y; positive = wrist below elbow (snapped down)
        r_wy = [fd.landmarks[PoseLandmark.RIGHT_WRIST].y for fd in frames_data]
        l_wy = [fd.landmarks[PoseLandmark.LEFT_WRIST].y  for fd in frames_data]
        r_ey = [fd.landmarks[PoseLandmark.RIGHT_ELBOW].y for fd in frames_data]
        l_ey = [fd.landmarks[PoseLandmark.LEFT_ELBOW].y  for fd in frames_data]
        r_rel = [r_wy[i] - r_ey[i] for i in range(n)]
        l_rel = [l_wy[i] - l_ey[i] for i in range(n)]
        pre  = max(0, rough_release - 4)
        post = min(n - 1, rough_release + 5)
        r_snap = r_rel[post] - r_rel[pre]
        l_snap = l_rel[post] - l_rel[pre]
        if abs(r_snap - l_snap) >= 0.03:
            return "right" if r_snap > l_snap else "left"

        # Stage 3: post-release follow-through height
        post_start = rough_release + 1
        post_end = min(n, rough_release + 8)
        if post_end > post_start + 2:
            r_post = sum(right_h[i] for i in range(post_start, post_end)) / (post_end - post_start)
            l_post = sum(left_h[i]  for i in range(post_start, post_end)) / (post_end - post_start)
            if abs(r_post - l_post) >= 0.02:
                return "right" if r_post > l_post else "left"

        # Stage 4: peak elbow height fallback
        r_elbow = max(1.0 - fd.landmarks[PoseLandmark.RIGHT_ELBOW].y for fd in frames_data)
        l_elbow = max(1.0 - fd.landmarks[PoseLandmark.LEFT_ELBOW].y for fd in frames_data)
        return "right" if r_elbow >= l_elbow else "left"

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
        # Only search the first 80% of frames — the actual release always comes
        # before follow-through or post-shot walking.
        search_end = max(1, int(len(frames_data) * 0.8))
        scores = []
        for fd in frames_data[:search_end]:
            lm = fd.landmarks
            wrist = lm[arm["wrist"]]
            wrist_height = 1.0 - wrist.y
            vis = max(0.1, wrist.visibility)

            shoulder = lm_xy(lm[arm["shoulder"]])
            elbow = lm_xy(lm[arm["elbow"]])
            wrist_pos = lm_xy(lm[arm["wrist"]])
            elbow_angle = calculate_angle(shoulder, elbow, wrist_pos)
            extension = elbow_angle / 180.0  # high when arm is extended (release), low when bent (dribble)

            scores.append((wrist_height * 0.65 + extension * 0.35) * vis)

        return int(np.argmax(scores))

    def _compute_metrics(self, frames_data: list[FrameData], fps: float) -> ShootingMetrics:
        arm_side = self._detect_shooting_arm(frames_data)
        arm = self._arm_lm(arm_side)

        release_idx = self._detect_release_frame(frames_data, arm)
        rf = frames_data[release_idx]
        lm = rf.landmarks

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
        # Sanity check: <50° is anatomically impossible at release → detection error
        if elbow_angle < 50.0:
            elbow_angle = None

        # --- Shot duration / loading bottom ---
        # start_idx = lowest wrist point before release = bottom of the loading dip
        wrist_heights = [1.0 - fd.landmarks[arm["wrist"]].y for fd in frames_data]
        start_idx = int(np.argmin(wrist_heights[:max(1, release_idx)]))

        # --- Key frame indices for composite visualization ---
        # Loading frame = start_idx (deepest loading dip, most bent position)
        loading_idx = start_idx

        # Setup frame = highest wrist point in shot window BEFORE the loading dip
        # This represents the player upright after catching, about to dip
        shot_window_start = max(0, start_idx - int(fps * 1.5))
        pre_dip_wrist_h = wrist_heights[shot_window_start: max(shot_window_start + 1, start_idx + 1)]
        setup_idx = shot_window_start + (int(np.argmax(pre_dip_wrist_h)) if pre_dip_wrist_h else 0)

        # --- Knee angle at loading bottom (deepest bend = start_idx) ---
        _lm_load = frames_data[start_idx].landmarks
        knee_angle_at_setup = calculate_angle(
            lm_xy(_lm_load[arm["hip"]]),
            lm_xy(_lm_load[arm["knee"]]),
            lm_xy(_lm_load[arm["ankle"]]),
        )

        # --- Loading elbow angle at start_idx ---
        _sh_l = lm_xy(_lm_load[arm["shoulder"]])
        _el_l = lm_xy(_lm_load[arm["elbow"]])
        _wr_l = lm_xy(_lm_load[arm["wrist"]])
        loading_elbow_angle = float(calculate_angle(_sh_l, _el_l, _wr_l))

        # --- Shoulder alignment ---
        sh_main_y = lm[arm["shoulder"]].y
        sh_opp_y = lm[arm["opp_shoulder"]].y
        shoulder_alignment = float(abs(sh_main_y - sh_opp_y) * 100.0)
        shot_duration_frames = max(1, release_idx - start_idx)
        shot_duration_seconds = shot_duration_frames / fps

        # --- Jump height via ankle lift (true ground departure) ---
        def _ankle_height(fd):
            la = fd.landmarks[PoseLandmark.LEFT_ANKLE]
            ra = fd.landmarks[PoseLandmark.RIGHT_ANKLE]
            lv = max(la.visibility, 0.0)
            rv = max(ra.visibility, 0.0)
            total = lv + rv
            if total < 0.1:
                return None
            return (1.0 - la.y) * lv / total + (1.0 - ra.y) * rv / total

        baseline_n = max(1, len(frames_data) // 5)
        baseline_vals = [_ankle_height(fd) for fd in frames_data[:baseline_n]]
        baseline_vals = [v for v in baseline_vals if v is not None]
        ankle_baseline = float(np.median(baseline_vals)) if baseline_vals else None

        buf = min(10, len(frames_data) - release_idx - 1)
        peak_vals = [_ankle_height(fd) for fd in frames_data[setup_idx: release_idx + 1 + buf]]
        peak_vals = [v for v in peak_vals if v is not None]
        ankle_peak = float(max(peak_vals)) if peak_vals else None

        if ankle_baseline is not None and ankle_peak is not None:
            jump_height = round(max(0.0, ankle_peak - ankle_baseline), 3)
        else:
            jump_height = 0.0

        # --- Release consistency ---
        diffs = [abs(wrist_heights[i] - wrist_heights[i - 1]) for i in range(1, len(wrist_heights))]
        mean_jitter = float(np.mean(diffs)) if diffs else 0.05
        consistency = float(np.clip(100.0 - mean_jitter * 800.0, 20.0, 100.0))

        metrics = ShootingMetrics(
            release_angle=round(release_angle, 1),
            elbow_angle_at_release=round(elbow_angle, 1) if elbow_angle is not None else None,
            knee_angle_at_setup=round(knee_angle_at_setup, 1) if knee_angle_at_setup else None,
            shoulder_alignment=round(shoulder_alignment, 2),
            shot_duration_frames=max(1, release_idx - start_idx),
            shot_duration_seconds=round(max(1, release_idx - start_idx) / fps, 2),
            jump_height_estimate=round(jump_height, 3),
            release_consistency=round(consistency, 1),
            shooting_arm=arm_side,
            frames_analyzed=len(frames_data),
            fps=fps,
            release_frame_idx=frames_data[release_idx].frame_idx,
            release_raw_frame=rf.raw_frame,
            release_landmarks=rf.landmarks,
            setup_raw_frame=frames_data[setup_idx].raw_frame,
            setup_landmarks=frames_data[setup_idx].landmarks,
            loading_raw_frame=frames_data[loading_idx].raw_frame,
            loading_landmarks=frames_data[loading_idx].landmarks,
            loading_elbow_angle=round(loading_elbow_angle, 1) if loading_elbow_angle else None,
        )
        metrics.overall_score = self._compute_score(metrics)
        return metrics

    def _compute_score(self, m: ShootingMetrics) -> float:
        component_weights = [
            ("release_angle", m.release_angle, 45.0, 55.0, 20.0, 0.30),
            ("elbow_angle", m.elbow_angle_at_release, 155.0, 175.0, 25.0, 0.27),
            ("knee_angle", m.knee_angle_at_setup, 70.0, 120.0, 50.0, 0.08),
            ("shoulder", m.shoulder_alignment, 0.0, 3.0, 8.0, 0.15),
            ("consistency", m.release_consistency, 75.0, 100.0, 40.0, 0.20),
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
