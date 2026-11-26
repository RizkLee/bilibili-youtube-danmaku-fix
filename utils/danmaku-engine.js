import { normalizeTimelineRate, toDanmakuTime } from './timeline.js';

/*
 * Danmaku renderer shared by the YouTube and Quark content scripts.
 *
 * - Comments are emitted from a sorted list with a moving pointer on every animation frame,
 *   so they appear exactly at their time (no early emission, no O(n) scans).
 * - Text has the same pixel size in the normal player, theatre mode and fullscreen (like the
 *   Bilibili web player); a larger player simply gets more lanes.
 * - On every size change the visible comments are rebuilt at their current progress, so
 *   entering or leaving fullscreen never leaves comments with the old travel path.
 * - Lanes are chosen like the Bilibili player: top-most lane where the new comment neither
 *   overlaps nor catches up with the previous one; comments that do not fit are dropped.
 * - Top and bottom comments are shown fixed and centred for four seconds.
 */

const SCROLL_DURATION_MS = 8000;
const FIXED_DURATION_MS = 4000;
const LANE_GAP_PX = 24;
const FONT_FAMILY = 'SimHei, "Microsoft YaHei", "PingFang SC", Arial, sans-serif';

// Dark danmaku (e.g. black text) would vanish inside a black outline; use a light one instead.
const DARK_OUTLINE = '1px 0 1px #fff, 0 1px 1px #fff, 0 -1px 1px #fff, -1px 0 1px #fff';

export function isDarkColor(color) {
    const match = /^#?([0-9a-f]{6})$/i.exec(String(color || '').trim());
    if (!match) return false;
    const value = parseInt(match[1], 16);
    const r = (value >> 16) & 0xff;
    const g = (value >> 8) & 0xff;
    const b = value & 0xff;
    return r * 299 + g * 587 + b * 114 < 48000;
}

/** Font size in CSS pixels; independent of the player size so fullscreen looks the same. */
export function fontPixels(fontSize) {
    const size = Number(fontSize);
    return Math.round(Math.min(96, Math.max(10, Number.isFinite(size) ? size : 24)));
}

/** Normalised display mode: 'rtl' scrolling, 'top' / 'bottom' fixed, or null for unsupported. */
export function displayMode(danmaku) {
    const mode = danmaku?.mode;
    if (mode === 'bottom' || mode === 4) return 'bottom';
    if (mode === 'top' || mode === 5) {
        // Older caches mapped advanced (mode 7) comments to 'top'; their text is a JSON array.
        const text = String(danmaku.text || '').trim();
        if (text.startsWith('[') && text.endsWith(']') && text.includes('"')) return null;
        return 'top';
    }
    if (mode === 'special' || mode === 7 || mode === 8 || mode === 9) return null;
    return 'rtl';
}

/**
 * Whether a new scrolling comment may enter a lane whose last comment has the given state.
 * All times are in ms of animation time; widths in px.
 */
export function laneAccepts(stageWidth, previous, nextWidth, nextProgress, nextDuration, gap = LANE_GAP_PX) {
    if (!previous) return true;
    const { width, progress, duration } = previous;
    // The previous comment's tail must already be inside the stage, plus a gap.
    if (((stageWidth + width) * progress) / duration < width + gap) return false;
    // The new comment (longer text moves faster) must not catch up before the previous leaves.
    const previousLeavesIn = duration - progress;
    const nextReachesLeftIn = (nextDuration * stageWidth) / (stageWidth + nextWidth) - nextProgress;
    return nextReachesLeftIn >= previousLeavesIn;
}

/** Index of the first comment with time >= value in a list sorted by time. */
export function lowerBound(list, value) {
    let low = 0;
    let high = list.length;
    while (low < high) {
        const mid = (low + high) >>> 1;
        if (list[mid].time < value) low = mid + 1;
        else high = mid;
    }
    return low;
}

class DanmakuEngine {
    constructor(container) {
        this.container = container;
        this.stage = null;
        this.danmakus = [];
        this.tracks = []; // Scrolling lanes; kept for compatibility with callers.
        this.topLanes = [];
        this.bottomLanes = [];
        this.items = new Set();
        this.settings = {
            enabled: true,
            timeOffset: 0,
            timelineRate: 1,
            opacity: 100,
            fontSize: 24,
            speed: 1.0,
            trackSpacing: 8,
            displayAreaPercentage: 100,
            weightThreshold: 0
        };
        this.video = null;
        this.isStarted = false;
        this.pointer = 0;
        this.lastDanmakuTime = null;
        this.frameId = null;
        this.resizeTimer = null;
        this.layout = { width: 0, height: 0, fontPx: 24, laneHeight: 32 };
        this.measureContext = null;
        this.listeners = [];
        this.fullscreenChangeHandler = null;
        this.init();
    }

    init() {
        this.stage = document.createElement('div');
        this.stage.className = 'bilibili-danmaku-stage';
        this.container.appendChild(this.stage);

        this.video = this.container.querySelector('video') || document.querySelector('video');
        if (this.video) this.bindVideoEvents();

        this.computeLayout();
        this.observeResize();
    }

    // ------------------------------------------------------------------ layout

    observeResize() {
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => this.scheduleRelayout());
            this.resizeObserver.observe(this.container);
            if (this.video) this.resizeObserver.observe(this.video);
        }
        this.fullscreenChangeHandler = () => this.scheduleRelayout(120);
        document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
    }

    scheduleRelayout(delay = 80) {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => this.initTracks(), delay);
    }

    /** Recompute sizes and lanes; rebuild visible comments if anything changed. */
    initTracks() {
        const changed = this.computeLayout();
        if (changed && this.settings.enabled && this.danmakus.length) this.resyncDanmakus();
    }

    computeLayout() {
        const width = this.container.offsetWidth || this.stage.offsetWidth || 0;
        const height = this.container.offsetHeight || this.stage.offsetHeight || 0;
        const fontPx = fontPixels(this.settings.fontSize);
        const spacing = Math.max(0, Number(this.settings.trackSpacing) || 0);
        const laneHeight = Math.max(1, Math.round(fontPx * 1.15 + spacing));
        const area = Math.min(100, Math.max(5, Number(this.settings.displayAreaPercentage) || 100));
        const usable = (height * area) / 100;
        const laneCount = Math.max(1, Math.floor(usable / laneHeight));
        const fixedCount = Math.max(1, Math.floor((height * 0.5) / laneHeight));

        const previous = this.layout;
        const changed =
            previous.width !== width ||
            previous.height !== height ||
            previous.fontPx !== fontPx ||
            previous.laneHeight !== laneHeight ||
            this.tracks.length !== laneCount;
        this.layout = { width, height, fontPx, laneHeight };
        this.stage.style.setProperty('--danmaku-font-size', `${fontPx}px`);
        this.stage.style.setProperty('--danmaku-line-height', `${laneHeight}px`);

        if (changed || !this.tracks.length) {
            this.tracks = Array.from({ length: laneCount }, (_, i) => ({ top: i * laneHeight, items: [] }));
            this.topLanes = Array.from({ length: fixedCount }, () => null);
            this.bottomLanes = Array.from({ length: fixedCount }, () => null);
            for (const item of this.items) this.removeItem(item, false);
            this.items.clear();
        }
        return changed;
    }

    measure(text) {
        if (!this.measureContext) {
            this.measureContext = document.createElement('canvas').getContext('2d');
        }
        this.measureContext.font = `bold ${this.layout.fontPx}px ${FONT_FAMILY}`;
        // Outline adds about 1px on each side.
        return Math.ceil(this.measureContext.measureText(text).width) + 2;
    }

    // ------------------------------------------------------------------ video events

    on(target, type, handler) {
        target.addEventListener(type, handler);
        this.listeners.push(() => target.removeEventListener(type, handler));
    }

    bindVideoEvents() {
        this.on(this.video, 'play', () => this.start());
        this.on(this.video, 'playing', () => this.start());
        this.on(this.video, 'pause', () => this.pause());
        this.on(this.video, 'seeked', () => this.resyncDanmakus());
        this.on(this.video, 'ratechange', () => this.handleSpeedChange(this.video.playbackRate));
    }

    // ------------------------------------------------------------------ data and settings

    loadDanmakus(danmakus) {
        this.danmakus = (danmakus || [])
            .filter((d) => d && Number.isFinite(Number(d.time)) && d.text)
            .map((d) => ({ ...d, time: Number(d.time) }))
            .sort((a, b) => a.time - b.time);
        this.resyncDanmakus();
        if (this.video && !this.video.paused) this.start();
    }

    updateSettings(settings) {
        const old = { ...this.settings };
        this.settings = { ...this.settings, ...settings };
        this.settings.timelineRate = normalizeTimelineRate(this.settings.timelineRate);
        const opacity = Number(this.settings.opacity);
        this.stage.style.opacity = String(Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity / 100)) : 1);

        if (!this.settings.enabled) {
            this.clear();
            this.pause();
            return;
        }

        const geometryChanged =
            old.fontSize !== this.settings.fontSize ||
            old.trackSpacing !== this.settings.trackSpacing ||
            old.displayAreaPercentage !== this.settings.displayAreaPercentage;
        const timingChanged =
            old.enabled !== this.settings.enabled ||
            old.speed !== this.settings.speed ||
            old.weightThreshold !== this.settings.weightThreshold ||
            old.timelineRate !== this.settings.timelineRate ||
            old.timeOffset !== this.settings.timeOffset;

        if (geometryChanged) this.computeLayout();
        if (geometryChanged || timingChanged) this.resyncDanmakus();
        if (this.video && !this.video.paused) this.start();
    }

    getDanmakuTime() {
        return toDanmakuTime(this.video?.currentTime || 0, this.settings.timelineRate, this.settings.timeOffset);
    }

    /** Danmaku-timeline seconds per second of on-screen animation. */
    timelineSpeed() {
        return (this.video?.playbackRate || 1) * this.settings.timelineRate;
    }

    scrollDuration() {
        return SCROLL_DURATION_MS / Math.max(0.1, Number(this.settings.speed) || 1);
    }

    passesFilter(danmaku) {
        if (this.settings.weightThreshold > 0) {
            const weight = danmaku.weight ?? 5;
            if (weight < this.settings.weightThreshold) return false;
        }
        return true;
    }

    // ------------------------------------------------------------------ playback

    start() {
        if (!this.settings.enabled || !this.video || this.video.paused) return;
        this.isStarted = true;
        for (const item of this.items) {
            if (item.animation.playState === 'paused') item.animation.play();
        }
        if (!this.frameId) this.frameId = requestAnimationFrame((t) => this.tick(t));
    }

    pause() {
        this.isStarted = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        for (const item of this.items) {
            if (item.animation.playState === 'running') item.animation.pause();
        }
    }

    tick() {
        this.frameId = null;
        if (!this.isStarted || !this.video || this.video.paused) return;
        const now = this.getDanmakuTime();
        const last = this.lastDanmakuTime;
        // Jumps not reported as seeks (e.g. YouTube ads or chapter skips): rebuild.
        if (last !== null && (now < last - 0.3 || now > last + 2.5)) {
            this.resyncDanmakus();
        } else {
            this.emitUntil(now);
            this.lastDanmakuTime = now;
        }
        this.frameId = requestAnimationFrame((t) => this.tick(t));
    }

    /** Emit every comment whose time has come; comments more than a second late are skipped. */
    emitUntil(now) {
        const list = this.danmakus;
        while (this.pointer < list.length && list[this.pointer].time <= now) {
            const danmaku = list[this.pointer++];
            const late = now - danmaku.time;
            if (late <= 1 && this.passesFilter(danmaku)) this.emit(danmaku, late);
        }
    }

    /** Rebuild the screen for the current time, with comments placed at their current progress. */
    resyncDanmakus() {
        this.clear();
        if (!this.video || !this.settings.enabled || !this.danmakus.length) {
            this.lastDanmakuTime = null;
            return;
        }
        const now = this.getDanmakuTime();
        const windowSeconds = (Math.max(this.scrollDuration(), FIXED_DURATION_MS) / 1000) * this.timelineSpeed();
        this.pointer = lowerBound(this.danmakus, now - windowSeconds);
        const list = this.danmakus;
        while (this.pointer < list.length && list[this.pointer].time <= now) {
            const danmaku = list[this.pointer++];
            if (this.passesFilter(danmaku)) this.emit(danmaku, now - danmaku.time);
        }
        this.lastDanmakuTime = now;
        if (this.video.paused) this.pause();
    }

    handleSpeedChange() {
        // Comments keep a constant on-screen speed; only the mapping to video time changes.
        this.resyncDanmakus();
        if (this.video && !this.video.paused) this.start();
    }

    // ------------------------------------------------------------------ rendering

    emit(danmaku, lateSeconds = 0) {
        const mode = displayMode(danmaku);
        if (!mode || !this.layout.width || !this.layout.height) return null;
        const elapsedMs = Math.max(0, (lateSeconds / this.timelineSpeed()) * 1000);
        const duration = mode === 'rtl' ? this.scrollDuration() : FIXED_DURATION_MS;
        if (elapsedMs >= duration) return null;

        const text = String(danmaku.text);
        const width = this.measure(text);
        const placement = mode === 'rtl'
            ? this.placeScrolling(width, elapsedMs, duration)
            : this.placeFixed(mode, elapsedMs, duration);
        if (!placement) return null;

        const elem = document.createElement('div');
        elem.textContent = text;
        elem.style.color = danmaku.color || '#ffffff';
        if (isDarkColor(danmaku.color)) elem.style.textShadow = DARK_OUTLINE;
        elem.style.top = `${placement.top}px`;
        if (mode !== 'rtl') elem.classList.add('bilibili-danmaku-fixed');
        this.stage.appendChild(elem);

        const keyframes = mode === 'rtl'
            ? [
                  { transform: `translate3d(${this.layout.width}px, 0, 0)` },
                  { transform: `translate3d(${-width}px, 0, 0)` }
              ]
            : [{ transform: 'translate3d(-50%, 0, 0)' }, { transform: 'translate3d(-50%, 0, 0)' }];
        const animation = elem.animate(keyframes, { duration, easing: 'linear', fill: 'forwards' });
        animation.currentTime = elapsedMs;
        if (!this.isStarted || !this.video || this.video.paused) animation.pause();

        const item = { elem, animation, width, duration, mode, danmaku, lane: placement.lane };
        animation.onfinish = () => this.removeItem(item);
        this.items.add(item);
        if (mode === 'rtl') this.tracks[placement.lane].items = [item];
        else (mode === 'top' ? this.topLanes : this.bottomLanes)[placement.lane] = item;
        return item;
    }

    placeScrolling(width, elapsedMs, duration) {
        const stageWidth = this.layout.width;
        for (let lane = 0; lane < this.tracks.length; lane++) {
            const previous = this.tracks[lane].items[0];
            const state = previous && this.items.has(previous)
                ? {
                      width: previous.width,
                      progress: Number(previous.animation.currentTime) || 0,
                      duration: previous.duration
                  }
                : null;
            if (laneAccepts(stageWidth, state, width, elapsedMs, duration)) {
                return { lane, top: this.tracks[lane].top };
            }
        }
        return null;
    }

    placeFixed(mode, elapsedMs, duration) {
        const lanes = mode === 'top' ? this.topLanes : this.bottomLanes;
        const laneHeight = this.layout.laneHeight;
        for (let lane = 0; lane < lanes.length; lane++) {
            const current = lanes[lane];
            if (current && this.items.has(current)) continue;
            const top = mode === 'top'
                ? lane * laneHeight
                : this.layout.height - (lane + 1) * laneHeight - Math.round(laneHeight * 0.2);
            return { lane, top: Math.max(0, top) };
        }
        return null;
    }

    removeItem(item, forget = true) {
        if (!item) return;
        try {
            item.animation.onfinish = null;
            item.animation.cancel();
        } catch {
            // Already cancelled.
        }
        item.elem.remove();
        if (forget) this.items.delete(item);
    }

    clear() {
        for (const item of this.items) this.removeItem(item, false);
        this.items.clear();
        for (const track of this.tracks) track.items = [];
        this.topLanes.fill(null);
        this.bottomLanes.fill(null);
        if (this.stage) this.stage.replaceChildren();
    }

    destroy() {
        this.pause();
        this.clear();
        clearTimeout(this.resizeTimer);
        for (const remove of this.listeners) remove();
        this.listeners = [];
        if (this.stage) this.stage.remove();
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.fullscreenChangeHandler) {
            document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
            this.fullscreenChangeHandler = null;
        }
    }
}

export default DanmakuEngine;
