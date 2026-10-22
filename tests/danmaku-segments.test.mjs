import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadDanmakuSegments } from '../utils/danmaku-segments.js';

test('正常获取全部分段，允许合法的空弹幕段', async () => {
    const requested = [];
    const segments = await downloadDanmakuSegments(3, async (index) => {
        requested.push(index);
        return index === 2 ? [] : [{ progress: index * 1000 }];
    }, async () => {});
    assert.deepEqual(requested, [1, 2, 3]);
    assert.deepEqual(segments, [{ progress: 1000 }, { progress: 3000 }]);
});

test('首段失败时立即拒绝，不继续请求其他分段', async () => {
    let count = 0;
    await assert.rejects(downloadDanmakuSegments(4, async () => {
        count++;
        throw new Error('HTTP 403');
    }, async () => {}), /第 1\/4 段.*HTTP 403/);
    assert.equal(count, 1);
});

test('中途失败时拒绝整个下载，避免保存缺少时间段的数据', async () => {
    await assert.rejects(downloadDanmakuSegments(3, async (index) => {
        if (index === 2) throw new Error('接口返回 -352');
        return [{ progress: 1000 }];
    }, async () => {}), /第 2\/3 段.*-352/);
});
