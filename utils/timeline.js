// Map the destination video time onto the source danmaku timeline.
// If Bilibili plays 24fps content at 25fps, use 24/25.
export function normalizeTimelineRate(value) {
    const rate = Number(value);
    return Number.isFinite(rate) && rate >= 0.25 && rate <= 4 ? rate : 1;
}

export function toDanmakuTime(videoSeconds, timelineRate = 1, offsetSeconds = 0) {
    const offset = Number(offsetSeconds);
    return videoSeconds * normalizeTimelineRate(timelineRate) + (Number.isFinite(offset) ? offset : 0);
}

export function areDurationsAligned(sourceDuration, videoDuration, timelineRate = 1, tolerance = 5) {
    if (!Number.isFinite(Number(sourceDuration)) || Number(sourceDuration) <= 0 ||
        !Number.isFinite(Number(videoDuration)) || Number(videoDuration) <= 0) return false;
    return Math.abs(Number(sourceDuration) - Number(videoDuration) * normalizeTimelineRate(timelineRate)) <= tolerance;
}
