const API = 'https://api.bilibili.com';

// 番剧使用 PGC 接口；单集 duration 的单位是毫秒，普通视频接口则是秒。
async function fetchBilibiliJson(url) {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error(`B站接口请求失败（HTTP ${response.status}）`);
    const data = await response.json();
    if (data.code !== 0) throw new Error(`B站接口返回错误（${data.code}）：${data.message || '未知错误'}`);
    return data;
}

async function getSeasonData(key, id) {
    if (!/^\d+$/.test(String(id))) throw new Error('无效的番剧或剧集 ID');
    const data = await fetchBilibiliJson(`${API}/pgc/view/web/season?${key}=${encodeURIComponent(id)}`);
    const season = data.result;
    if (!season || !Array.isArray(season.episodes)) {
        throw new Error('番剧接口没有返回集数信息（可能受到地区或账号权限限制）');
    }
    return season;
}

function normalizeEpisode(ep, seasonTitle = '') {
    const cid = Number(ep.cid);
    const aid = Number(ep.aid);
    const duration = Number(ep.duration) / 1000;
    if (!Number.isSafeInteger(cid) || cid <= 0 || !Number.isSafeInteger(aid) || aid <= 0 ||
        !Number.isFinite(duration) || duration <= 0) {
        throw new Error(`剧集 ${ep.id} 缺少有效的 CID、AID 或时长`);
    }
    const label = ep.title || String(ep.id);
    return {
        episodeId: Number(ep.id),
        bvid: ep.bvid || '',
        aid,
        cid,
        duration,
        title: seasonTitle ? `${seasonTitle} ${label}${ep.long_title ? ` ${ep.long_title}` : ''}` : label,
        episodeLabel: `${label}${ep.long_title ? ` ${ep.long_title}` : ''}`,
        pic: ep.cover || '',
        author: '',
        bilibili_url: `https://www.bilibili.com/bangumi/play/ep${ep.id}`,
        badge: ep.badge || ''
    };
}

async function getBangumiSeasonEpisodes(seasonId) {
    const season = await getSeasonData('season_id', seasonId);
    return {
        title: season.title || '',
        episodes: season.episodes.map((ep) => ({
            id: Number(ep.id),
            label: `${ep.title || ep.id}${ep.long_title ? ` ${ep.long_title}` : ''}`,
            badge: ep.badge || ''
        }))
    };
}

async function getBangumiEpisodeDetail(epid) {
    const season = await getSeasonData('ep_id', epid);
    const episode = season.episodes.find((ep) => String(ep.id) === String(epid));
    if (!episode) throw new Error(`番剧中找不到 ep${epid}`);
    return normalizeEpisode(episode, season.title);
}

function findEpisodeByNumber(eps, episodeNumber) {
    if (!Array.isArray(eps)) return null;
    const number = Number(episodeNumber);
    if (!Number.isInteger(number) || number < 1) return null;
    const match = eps.find((ep) => {
        const title = String(ep.title ?? '');
        const parsed = title.match(/^第0*(\d+)[话集]/) || title.match(/^0*(\d+)$/);
        return parsed && Number(parsed[1]) === number;
    });
    return match || eps[number - 1] || null;
}

// 复用主后台的真实 MD5 WBI 签名，避免两套签名逻辑不一致。
async function searchBilibiliBangumi(title, episodeNumber, { getWbiKeys, encWbi }) {
    if (!title?.trim()) throw new Error('番剧标题为空');
    const keys = await getWbiKeys();
    const query = encWbi(
        { search_type: 'media_bangumi', keyword: title, page: 1 },
        keys.img_key,
        keys.sub_key
    );
    const data = await fetchBilibiliJson(`${API}/x/web-interface/wbi/search/type?${query}`);
    const results = data.data?.result || [];
    if (!results.length) throw new Error(`未找到番剧：${title}`);
    const plainTitle = (value) => String(value || '').replace(/<[^>]*>/g, '').trim();
    const match = results.find((item) => plainTitle(item.title) === title.trim()) || results[0];

    // 搜索结果可能只给出部分 eps；通过 season_id 查询完整剧集。
    const episodes = match.season_id
        ? (await getSeasonData('season_id', match.season_id)).episodes
        : match.eps;
    const target = findEpisodeByNumber(episodes, episodeNumber);
    if (!target) throw new Error(`《${title}》没有找到第 ${episodeNumber} 集`);
    return getBangumiEpisodeDetail(target.id);
}

export { searchBilibiliBangumi, findEpisodeByNumber, getBangumiEpisodeDetail, getBangumiSeasonEpisodes };
