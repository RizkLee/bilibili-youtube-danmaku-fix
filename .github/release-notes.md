### v2.2.1 更新

- 修复全屏后弹幕字号变大：全屏与非全屏使用相同字号（全屏只是多出更多轨道），移除“随播放器缩放”。
- “按标题自动匹配”开关移到面板顶部的来源卡片中（位于“显示弹幕”下方），YouTube 与夸克网盘均可直接看到。

### v2.2.0 更新

- **全新面板设计**：与 Morphe 安卓补丁统一的设计语言，分组卡片、快捷操作、可折叠分区、浅色 / 深色主题；夸克网盘页内面板同步更新。
- **按标题自动匹配开关**：关闭后不会把视频标题发送到 B 站搜索，只在手动搜索或粘贴链接时请求。
- **弹幕渲染重写**：弹幕准时出现、不再提前约 1 秒；全屏切换时屏幕上的弹幕按新尺寸重排；选轨防重叠与追尾；顶部 / 底部弹幕固定居中显示，高级弹幕不再以乱码滚动。

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
