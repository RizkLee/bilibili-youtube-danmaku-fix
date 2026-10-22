import test from 'node:test';
import assert from 'node:assert/strict';
import { areDurationsAligned, normalizeTimelineRate, toDanmakuTime } from '../utils/timeline.js';
import { parseBilibiliSource } from '../utils/bilibili-url.js';

test('normal video uses the unscaled timeline', () => {
    assert.equal(toDanmakuTime(100), 100);
    assert.equal(toDanmakuTime(100, 1, 3), 103);
});

test('25fps Bilibili source maps from 24fps video with 24/25', () => {
    assert.equal(toDanmakuTime(100, 24 / 25), 96);
    assert.equal(toDanmakuTime(125, 24 / 25, 2), 122);
    assert.equal(toDanmakuTime(100, 25 / 24), 104.16666666666667);
});

test('bad timeline rates fall back to normal', () => {
    for (const rate of [null, '', 'nope', 0, -1, 10, Infinity]) {
        assert.equal(normalizeTimelineRate(rate), 1);
    }
});

test('FPS speed mismatch alone must not trigger sponsor removal', () => {
    assert.equal(areDurationsAligned(1440, 1500, 24 / 25), true);
    assert.equal(areDurationsAligned(1440, 1500, 1), false);
    assert.equal(areDurationsAligned(1300, 1500, 24 / 25), false);
});

test('BV and av links preserve valid multipart pages', () => {
    assert.deepEqual(parseBilibiliSource('https://www.bilibili.com/video/BV1xx411c7mD?p=2'),
        { bvid: 'BV1xx411c7mD', p: 2 });
    assert.equal(parseBilibiliSource('https://www.bilibili.com/video/av170001?p=3')?.p, 3);
    assert.deepEqual(parseBilibiliSource('https://www.bilibili.com/video/BV1xx411c7mD'),
        { bvid: 'BV1xx411c7mD' });
});

test('invalid multipart pages cannot silently load a different episode', () => {
    for (const p of ['0', '-2', '1.5', 'abc', '99999999999999999999']) {
        assert.equal(parseBilibiliSource(`https://www.bilibili.com/video/BV1xx411c7mD?p=${p}`), null);
    }
});
