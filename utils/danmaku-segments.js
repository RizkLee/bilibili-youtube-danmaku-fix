// 只有所有时间段均成功下载，调用方才能保存弹幕，避免覆盖已存在的完整数据。
export async function downloadDanmakuSegments(segmentCount, fetchSegment, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
    if (!Number.isSafeInteger(segmentCount) || segmentCount <= 0) {
        throw new Error('无效的弹幕分段数量');
    }
    const allDanmakus = [];
    for (let index = 1; index <= segmentCount; index++) {
        let segment;
        try {
            segment = await fetchSegment(index);
            if (!Array.isArray(segment)) throw new Error('弹幕解析结果不是数组');
        } catch (error) {
            throw new Error(`第 ${index}/${segmentCount} 段弹幕下载失败，数据不完整：${error.message}`, { cause: error });
        }
        console.log(`第${index}段弹幕获取成功: ${segment.length}条`);
        allDanmakus.push(...segment);
        if (index < segmentCount) await pause(300);
    }
    return allDanmakus;
}
