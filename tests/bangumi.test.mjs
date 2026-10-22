import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBilibiliSource } from '../utils/bilibili-url.js';
import {
    getBangumiEpisodeDetail,
    getBangumiSeasonEpisodes,
    findEpisodeByNumber,
    searchBilibiliBangumi
} from '../entrypoints/background/bangumi.js';

test('手动链接识别 BV、av、ep、ss，并拒绝伪装域名', () => {
    assert.deepEqual(parseBilibiliSource('https://www.bilibili.com/bangumi/play/ep65413'), {
        episodeId: 65413
    });
    assert.deepEqual(parseBilibiliSource('https://www.bilibili.com/bangumi/play/ss231879?x=1'), {
        seasonId: 231879
    });
    assert.deepEqual(parseBilibiliSource('https://www.bilibili.com/video/BV1us411m7WT'), {
        bvid: 'BV1us411m7WT'
    });
    assert.deepEqual(parseBilibiliSource('https://www.bilibili.com/video/av2657770'), {
        bvid: 'BV1us411m7WT'
    });
    assert.equal(parseBilibiliSource('https://evil.com/video/BV1us411m7WT'), null);
    assert.equal(parseBilibiliSource('https://www.bilibili.com.evil.com/bangumi/play/ep65413'), null);
    assert.equal(parseBilibiliSource('javascript:alert(1)'), null);
});

test('集数优先按标题匹配，无法匹配时才按顺序回退', () => {
    const eps = [{ id: 10, title: '预告' }, { id: 20, title: '01' }, { id: 30, title: '第02话' }];
    assert.equal(findEpisodeByNumber(eps, 1).id, 20);
    assert.equal(findEpisodeByNumber(eps, 2).id, 30);
    assert.equal(findEpisodeByNumber(eps, 3).id, 30);
});

test('番剧接口返回完整集数，且分集时长从毫秒正确转换为秒', async () => {
    const original = globalThis.fetch;
    const requested = [];
    globalThis.fetch = async (url, options) => {
        requested.push([String(url), options]);
        return {
            ok: true,
            json: async () => ({
                code: 0,
                result: {
                    title: '示例番剧',
                    episodes: [
                        { id: 65413, title: '01', long_title: '友谊的魔力（上）',
                            bvid: 'BV1us411m7WT', aid: 2657770,
                            cid: 29709044623, duration: 1325000, badge: '会员' },
                        { id: 65414, title: '02', aid: 123, cid: 456, duration: 1450000 }
                    ]
                }
            })
        };
    };
    try {
        const episode = await getBangumiEpisodeDetail('65413');
        assert.equal(episode.cid, 29709044623);
        assert.equal(episode.duration, 1325);
        assert.equal(episode.bilibili_url, 'https://www.bilibili.com/bangumi/play/ep65413');
        assert.equal(episode.title, '示例番剧 01 友谊的魔力（上）');
        const season = await getBangumiSeasonEpisodes(231879);
        assert.equal(season.episodes.length, 2);
        assert.equal(season.episodes[0].badge, '会员');
        assert.match(requested[0][0], /ep_id=65413/);
        assert.match(requested[1][0], /season_id=231879/);
        assert.ok(requested.every(([, options]) => options.credentials === 'include'));
    } finally {
        globalThis.fetch = original;
    }
});

test('自动番剧搜索共用签名器，并通过 season_id 获取全剧集', async () => {
    const original = globalThis.fetch;
    const requested = [];
    globalThis.fetch = async (url) => {
        requested.push(String(url));
        let value;
        if (String(url).includes('/wbi/search/type')) {
            value = { code: 0, data: { result: [
                { title: '<em>目标番剧</em>', season_id: 800, eps: [{ id: 1, title: '01' }] }
            ] } };
        } else {
            value = { code: 0, result: { title: '目标番剧', episodes: [
                { id: 1, title: '01', cid: 1001, aid: 1002, duration: 360000 },
                { id: 2, title: '02', cid: 2001, aid: 2002, duration: 480000 }
            ] } };
        }
        return { ok: true, json: async () => value };
    };
    try {
        const result = await searchBilibiliBangumi('目标番剧', 2, {
            getWbiKeys: async () => ({ img_key: 'a', sub_key: 'b' }),
            encWbi: (params) => {
                assert.equal(params.keyword, '目标番剧');
                return 'signed=yes';
            }
        });
        assert.equal(result.episodeId, 2);
        assert.equal(result.cid, 2001);
        assert.ok(requested[0].includes('signed=yes'));
        assert.ok(requested.some((url) => url.includes('season_id=800')));
        assert.ok(requested.some((url) => url.includes('ep_id=2')));
    } finally {
        globalThis.fetch = original;
    }
});

test('番剧接口被拒绝时明确报错，不能假装下载成功', async () => {
    const original = globalThis.fetch;
    try {
        globalThis.fetch = async () => ({ ok: false, status: 403 });
        await assert.rejects(getBangumiEpisodeDetail(65413), /HTTP 403/);

        globalThis.fetch = async () => ({
            ok: true,
            json: async () => ({ code: -101, message: '账号未登录' })
        });
        await assert.rejects(getBangumiEpisodeDetail(65413), /-101.*账号未登录/);
    } finally {
        globalThis.fetch = original;
    }
});

test('无效的番剧 CID 或时长不能进入弹幕下载流程', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => ({
        ok: true,
        json: async () => ({
            code: 0,
            result: {
                title: '测试',
                episodes: [{ id: 65413, aid: 2657770, cid: 0, duration: 1325000 }]
            }
        })
    });
    try {
        await assert.rejects(getBangumiEpisodeDetail(65413), /CID、AID 或时长/);
    } finally {
        globalThis.fetch = original;
    }
});
