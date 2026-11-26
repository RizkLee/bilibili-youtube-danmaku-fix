import test from 'node:test';
import assert from 'node:assert/strict';

import { displayMode, isDarkColor, laneAccepts, lowerBound, playerScale } from '../utils/danmaku-engine.js';

test('font scale follows the player height and stays within readable bounds', () => {
    assert.equal(playerScale(720), 1);
    assert.equal(playerScale(1080), 1.5);
    assert.equal(playerScale(200), 0.75);
    assert.equal(playerScale(4000), 2);
    assert.equal(playerScale(1080, false), 1);
    assert.equal(playerScale(0), 1);
});

test('fullscreen keeps the same text size relative to the picture', () => {
    const base = 24;
    const small = base * playerScale(540);
    const full = base * playerScale(1080);
    assert.equal(full / 1080, small / 540);
});

test('display modes map Bilibili modes and skip advanced comments', () => {
    assert.equal(displayMode({ mode: 'rtl', text: 'a' }), 'rtl');
    assert.equal(displayMode({ mode: 'top', text: '顶部' }), 'top');
    assert.equal(displayMode({ mode: 'bottom', text: '底部' }), 'bottom');
    assert.equal(displayMode({ mode: 'special', text: 'x' }), null);
    assert.equal(displayMode({ mode: 'top', text: '[0,0,"1-1",4.5,"高级弹幕"]' }), null);
    assert.equal(displayMode({ text: 'no mode' }), 'rtl');
});

test('lanes reject overlapping or catching-up comments', () => {
    const W = 1000;
    const D = 8000;
    // Empty lane.
    assert.equal(laneAccepts(W, null, 200, 0, D), true);
    // Previous just entered: its tail is still outside the stage.
    assert.equal(laneAccepts(W, { width: 300, progress: 500, duration: D }, 100, 0, D), false);
    // Previous fully inside and far ahead; a short new comment (slower) cannot catch up.
    assert.equal(laneAccepts(W, { width: 100, progress: 4000, duration: D }, 100, 0, D), true);
    // A very long new comment moves faster and would catch up with a short previous one.
    assert.equal(laneAccepts(W, { width: 50, progress: 900, duration: D }, 1500, 0, D), false);
});

test('lowerBound finds the first comment at or after a time', () => {
    const list = [0, 1, 1, 2, 5].map((time) => ({ time }));
    assert.equal(lowerBound(list, -1), 0);
    assert.equal(lowerBound(list, 1), 1);
    assert.equal(lowerBound(list, 1.5), 3);
    assert.equal(lowerBound(list, 9), 5);
});

test('dark colours get a light outline', () => {
    assert.equal(isDarkColor('#000000'), true);
    assert.equal(isDarkColor('#ffffff'), false);
    assert.equal(isDarkColor('#fe0302'), false);
});
