from dataclasses import dataclass
from .pose_analyzer import ShootingMetrics


@dataclass
class Recommendation:
    text: str
    metric_key: str
    priority: int  # 1=high, 2=medium, 3=low (positive)


def generate_recommendations(metrics: ShootingMetrics) -> list[Recommendation]:
    recs: list[Recommendation] = []

    if metrics.release_angle is not None:
        angle = metrics.release_angle
        if angle < 40:
            recs.append(Recommendation(
                text=(
                    f"Release angle is too flat at {angle:.0f}°. "
                    "Aim for a 45-55° arc by releasing the ball higher above your head. "
                    "A flat shot has less margin at the basket rim."
                ),
                metric_key="release_angle",
                priority=1,
            ))
        elif angle < 45:
            recs.append(Recommendation(
                text=(
                    f"Increase release angle by {45 - angle:.0f}° — currently {angle:.0f}°. "
                    "Slightly higher release (45-55°) improves entry angle into the basket."
                ),
                metric_key="release_angle",
                priority=2,
            ))
        elif angle > 60:
            recs.append(Recommendation(
                text=(
                    f"Release angle of {angle:.0f}° is too high. "
                    "Overly looping shots lose velocity and consistency. Target 45-55°."
                ),
                metric_key="release_angle",
                priority=2,
            ))

    if metrics.elbow_angle_at_release is not None:
        angle = metrics.elbow_angle_at_release
        if angle < 140:
            recs.append(Recommendation(
                text=(
                    f"Arm not fully extending through the shot ({angle:.0f}° at release). "
                    "Drive the elbow toward full extension (155-175°) for maximum power transfer."
                ),
                metric_key="elbow_angle",
                priority=1,
            ))

    if metrics.knee_angle_at_setup is not None:
        angle = metrics.knee_angle_at_setup
        if angle > 130:
            recs.append(Recommendation(
                text=(
                    f"Insufficient knee bend detected ({angle:.0f}°). "
                    "Deeper squat (90-120°) generates leg drive that reduces arm load and improves consistency."
                ),
                metric_key="knee_angle",
                priority=1,
            ))
        elif angle < 65:
            recs.append(Recommendation(
                text=(
                    f"Very deep knee bend ({angle:.0f}°) can compromise balance at release. "
                    "Aim for 70-120° for power with stability."
                ),
                metric_key="knee_angle",
                priority=2,
            ))

    if metrics.shoulder_alignment is not None and metrics.shoulder_alignment > 5.0:
        recs.append(Recommendation(
            text=(
                f"Shoulders are uneven (deviation: {metrics.shoulder_alignment:.1f}). "
                "Level shoulders keep your shot aligned and reduce lateral drift."
            ),
            metric_key="shoulder_alignment",
            priority=2,
        ))

    if metrics.release_consistency is not None and metrics.release_consistency < 65.0:
        recs.append(Recommendation(
            text=(
                f"Release consistency score is low ({metrics.release_consistency:.0f}/100). "
                "Practice form shooting from 3 feet with slow, deliberate repetitions "
                "to build a repeatable muscle-memory release."
            ),
            metric_key="consistency",
            priority=1,
        ))

    if metrics.jump_height_estimate is not None and metrics.jump_height_estimate < 0.02:
        recs.append(Recommendation(
            text=(
                "Minimal vertical detected. Incorporating leg drive into your shot "
                "reduces reliance on arm strength and improves arc."
            ),
            metric_key="jump_height",
            priority=3,
        ))

    if not recs:
        recs.append(Recommendation(
            text=(
                "Excellent shooting mechanics! All key metrics are within ideal ranges. "
                "Focus on maintaining this form under defensive pressure and track "
                "session-over-session consistency."
            ),
            metric_key="overall",
            priority=3,
        ))

    return sorted(recs, key=lambda r: r.priority)
