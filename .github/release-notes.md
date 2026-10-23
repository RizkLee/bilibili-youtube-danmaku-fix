这是 [RizkLee/bilibili-youtube-danmaku-fix](https://github.com/RizkLee/bilibili-youtube-danmaku-fix) 的独立修改版，保留原版 B2Y 功能并增加：

- 改进 B 站番剧（`ep` / `ss`）弹幕获取，支持从整季链接选择集数。
- 支持大会员番剧的部分弹幕接口；实际获取仍受 B 站账号、地区及接口权限限制。
- 支持 BV/av 分 P 链接（`?p=N`）和导入本地 XML 弹幕。
- 在 YouTube、夸克网盘面板提供弹幕时间轴倍率，支持 24/25 倍校正和自定义倍率。

### 安装

1. **Chrome** 下载 `B2Y-Fix-*-chrome-mv3.zip`；**Edge** 下载 `B2Y-Fix-*-edge-mv3.zip`。
2. 解压 ZIP，确保解压后的文件夹中直接包含 `manifest.json`。
3. 打开 Chrome 的 `chrome://extensions/` 或 Edge 的 `edge://extensions/`，开启开发者模式，点击「加载已解压的扩展程序」并选择该文件夹。

安装不需要 Node.js、npm 或自行构建源码。本仓库的 Release 与原作者发布的浏览器商店版本不同。Firefox 和 Safari 暂未提供经验证的安装包。

详细使用说明见 [README](https://github.com/RizkLee/bilibili-youtube-danmaku-fix#readme)。
