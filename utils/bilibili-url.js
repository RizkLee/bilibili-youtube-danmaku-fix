function avToBv(avid) {
    const table = 'fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF';
    const s = [11, 10, 3, 8, 4, 6];
    const xor = 177451812;
    const add = 8728348608n;
    const x = (BigInt(avid) ^ BigInt(xor)) + add;
    const r = Array.from('BV1  4 1 7  ');
    for (let i = 0; i < 6; i++) r[s[i]] = table[Number((x / 58n ** BigInt(i)) % 58n)];
    return r.join('');
}

// 严格验证 URL 域名，支持普通投稿、番剧分集和整季链接。
export function parseBilibiliSource(input) {
    let url;
    try { url = new URL(input.trim()); } catch { return null; }
    if (!['https:', 'http:'].includes(url.protocol) ||
        !['bilibili.com', 'www.bilibili.com', 'm.bilibili.com'].includes(url.hostname)) {
        return null;
    }
    const ep = url.pathname.match(/^\/bangumi\/play\/ep(\d+)\/?$/i);
    if (ep) return { episodeId: Number(ep[1]) };
    const ss = url.pathname.match(/^\/bangumi\/play\/ss(\d+)\/?$/i);
    if (ss) return { seasonId: Number(ss[1]) };
    const bv = url.pathname.match(/^\/video\/(BV[\w]+)\/?$/i);
    if (bv) return { bvid: bv[1] };
    const av = url.pathname.match(/^\/video\/av(\d+)\/?$/i);
    if (av) return { bvid: avToBv(av[1]) };
    return null;
}
