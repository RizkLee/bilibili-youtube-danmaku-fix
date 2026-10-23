# B2Y Fix — 在 YouTube / 夸克网盘显示 Bilibili 弹幕

这是 [B2Y（bilibili-youtube-danmaku）](https://github.com/ahaduoduoduo/bilibili-youtube-danmaku) 的社区修改版：在 YouTube 和夸克网盘播放视频时，搜索、匹配并叠加显示 B 站弹幕，并针对番剧弹幕获取、分 P、导入本地 XML 和时间轴对齐做了补充。

**本项目仓库：** [RizkLee/bilibili-youtube-danmaku-fix](https://github.com/RizkLee/bilibili-youtube-danmaku-fix)

> **本修复版已提供 [GitHub Releases 安装包](https://github.com/RizkLee/bilibili-youtube-danmaku-fix/releases/latest)。** Chrome 和 Edge 用户可直接下载对应 ZIP 解压安装，**无需 Node.js、npm 或自己构建**。原作者的 Chrome / Firefox 商店条目及 Release 不包含本项目的新增功能。

## 主要功能

| 功能 | 说明 |
| --- | --- |
| YouTube 弹幕 | 按视频标题自动搜索、匹配 B 站视频，也可以粘贴 B 站链接手动匹配 |
| 夸克网盘弹幕 | 在网盘视频播放页面搜索或手动指定 B 站弹幕来源 |
| 番剧链接 | 支持 B 站 `/bangumi/play/ep...`（单集）和 `/bangumi/play/ss...`（整季）链接；整季可选择目标剧集 |
| 大会员番剧弹幕 | 改进番剧信息解析与分段弹幕请求，尝试获取部分原版无法加载的番剧弹幕；实际可用性取决于 B 站接口权限 |
| 分 P 视频 | 支持普通投稿的 BV/av 链接及 `?p=N` 参数，按指定分 P 获取弹幕 |
| 本地 XML 导入 | 将本地 B 站弹幕 `.xml` 文件导入当前 YouTube 或夸克网盘视频 |
| 时间轴对齐 | 提供 `1×`、`24/25×` 和自定义倍率，并保留按秒调整的时间偏移 |
| 弹幕显示设置 | 字体大小、透明度、滚动速度、显示区域、过滤等；支持搜索弹幕及定位时间点 |

YouTube 的自动匹配可使用**新版标题搜索**，也可在面板中切换到**旧版识别模式**；遇到多个候选结果时，可以选择“弹幕最多”或“弹出选择”。视频匹配与弹幕下载仍受 B 站接口响应、网络环境及视频内容差异影响。

## 下载与安装（Chrome / Edge，无需构建）

进入 **[本项目最新 Release 下载页](https://github.com/RizkLee/bilibili-youtube-danmaku-fix/releases/latest)**，展开 **Assets**，根据浏览器下载对应安装包：

| 浏览器 | 下载文件 |
| --- | --- |
| Chrome | `B2Y-Fix-v2.1.0-chrome-mv3.zip` |
| Microsoft Edge | `B2Y-Fix-v2.1.0-edge-mv3.zip` |

文件名会随版本更新；以后下载新版时，选择文件名中含 `chrome-mv3` 或 `edge-mv3` 的 ZIP 即可。**不要误下 GitHub 自动生成的 Source code ZIP**，那是源码，不是现成的扩展程序。

1. **解压**下载的 ZIP 到一个固定文件夹，打开该文件夹应能直接看到 `manifest.json`。
2. Chrome 打开 `chrome://extensions/`；Edge 打开 `edge://extensions/`。
3. 开启右上方的**开发者模式 / 开发人员模式**，点击**加载已解压的扩展程序 / 加载解压缩的扩展**。
4. 选择第 1 步解压的、**包含 `manifest.json` 的文件夹**，即可安装。以后请保留这个文件夹。

如已安装原作者发布的 B2Y，请先停用旧扩展，以免同时叠加两套弹幕。升级本修复版时，可将新版文件解压覆盖到原安装文件夹，再在扩展管理页点击刷新。

**其他浏览器：** 本次 Release 只发布已通过构建验证的 Chrome MV3、Edge MV3 安装包。Firefox 和 Safari 尚无经验证的可直接安装版本；请勿将 Chrome / Edge ZIP 当作对应浏览器的正式发行包。

### 从源码构建（可选）

开发者可从[本仓库](https://github.com/RizkLee/bilibili-youtube-danmaku-fix)获取源码并自行构建：

```bash
git clone https://github.com/RizkLee/bilibili-youtube-danmaku-fix.git
cd bilibili-youtube-danmaku-fix
npm ci
npm run build:chrome
```

生成的 Chrome 扩展文件夹为 `.output/chrome-mv3`，按上述方式加载即可。普通用户使用 Release ZIP 就够了。

## 使用方法

### 1. 自动匹配弹幕

在 YouTube 打开一个普通视频播放页，或在夸克网盘打开视频播放器。扩展会尝试按视频标题寻找对应的 B 站投稿并加载弹幕。点击浏览器工具栏中的扩展图标，可以查看匹配状态、调整搜索或修改弹幕显示设置。

如果自动匹配到的不是目标视频，可在面板中搜索其他候选结果，或直接使用下文的手动匹配。YouTube 的“识别模式”和“多匹配处理方式”也可以按需调整。

### 2. 粘贴 B 站视频链接手动匹配

在扩展面板的手动匹配输入框中粘贴 B 站视频链接，点击**手动匹配**。支持以下链接形式：

```text
https://www.bilibili.com/video/BVxxxxxxxxxx
https://www.bilibili.com/video/BVxxxxxxxxxx?p=2
https://www.bilibili.com/video/av123456
https://www.bilibili.com/bangumi/play/ep65413
https://www.bilibili.com/bangumi/play/ss231879
```

- **BV / av 投稿：** 默认使用第 1 P；如果视频有多个分 P，可加 `?p=2` 等参数。
- **ep 番剧链接：** 指定某一集，直接尝试获取该集弹幕。
- **ss 番剧链接：** 指向整季。第一次点击手动匹配后，面板会加载剧集列表；**选定具体剧集，再次点击手动匹配**。

即使视频本身属于 B 站大会员内容，弹幕接口也可能可以读取；但插件**不会解锁付费视频或绕过 B 站的账号、地区等访问限制**。如果接口拒绝请求，请参阅常见问题。

### 3. 导入本地 XML 弹幕

如果已经取得对应视频的 B 站 XML 弹幕文件：

1. 打开目标 YouTube 视频或夸克网盘视频页面。
2. 点击扩展图标，找到**导入本地弹幕**按钮。
3. 选择本地 `.xml` 文件；导入后即可在当前视频上显示弹幕。

这种方式可以避免在线获取弹幕接口失败的问题，适用于已有 XML 文件的情况。导入结果保存在浏览器的扩展本地存储中，关联当前视频；重新导入可能替换当前视频的既有弹幕数据。不要将本功能误认为可以直接下载受限制视频的弹幕文件。

## 对齐弹幕时间轴

部分片源发生了 24fps / 25fps 速度差异：例如 YouTube 按 24fps 播放，但 B 站将相同帧序列按 25fps 播放，此时 B 站版本时长更短，弹幕会逐渐偏离。仅修改固定偏移量无法修正这种**随播放时间累积**的误差。

在 YouTube 或夸克网盘的扩展面板中找到 **弹幕时间轴倍率**：

| 情况 | 选择 |
| --- | --- |
| 双方时间轴一致 | **正常（1×）** |
| B 站 25fps，当前视频 24fps | **B站25fps → 视频24fps（24/25×）**，即 `0.96` |
| 存在其他比例差异 | **自定义**，输入 `0.25` 至 `4` 的倍率 |

计算关系为：

```text
读取的 B 站弹幕时间（秒） = 当前视频播放时间（秒） × 弹幕时间轴倍率 + 时间偏移（秒）
```

例如选择 `0.96` 后，当前视频播放到 **100 秒** 时，会取 B 站约 **96 秒** 处的弹幕。如果双方片头长度不同，可以再用**时间偏移**进行微调。**滚动速度**只影响弹幕在屏幕上移动的速度，与时间轴倍率无关。

时间轴倍率作为扩展设置保存，切换其他视频后如果不再需要校正，请将其恢复到 `1×`。

## 常见问题

**需要登录 B 站或手动提供 Cookie 吗？**

通常，读取公开弹幕不必登录。若 B 站接口对某些番剧或请求要求登录，可尝试在**同一浏览器**中登录自己的 B 站账号再重试。插件的网络请求会按实现使用浏览器的凭据机制，**无需把 Cookie 复制粘贴到扩展面板，也无需导出 Cookie**。是否成功仍由 B 站接口决定，登录不保证一定能获取弹幕。

**为什么粘贴了番剧链接仍无法获取？**

请先确认 `ss` 整季链接已选定集数，并且对应视频所在地区和账号具备必要权限。也可能遇到接口风控、接口变更或网络错误。可尝试使用具体 `ep` 链接；如果已有合法获取的 XML 文件，则可通过本地导入加载。

**为什么弹幕出现了，但与视频内容不同步？**

先检查是否选错分 P 或番剧集数，再用时间偏移修正片头差异。如果偏差随播放时间不断增大，再调整时间轴倍率。若两边视频存在删减、重剪或广告差异，单一倍率和偏移量可能无法使所有段落完全对齐。

**为什么安装了商店里的 B2Y，却找不到这些功能？**

原作者的应用商店版本与本修复版是独立发布渠道。请从 **[本项目 Releases](https://github.com/RizkLee/bilibili-youtube-danmaku-fix/releases/latest)** 下载并加载 ZIP 安装包。
## 开发与构建

项目使用 [WXT](https://wxt.dev/) 构建，主要代码位于 `entrypoints/`（后台、YouTube、夸克网盘及弹窗界面），公共逻辑位于 `utils/`。可使用下面的命令：

```bash
npm ci                # 安装锁定版本的依赖
npm run dev           # 开发模式
npm run build         # 默认 Chrome 构建
npm run build:firefox # Firefox 构建（未全面验证）
npm run build:edge    # Edge 构建（未全面验证）
npm run build:safari  # Safari 构建（未全面验证）
node --test tests/*.test.mjs
```

这里的浏览器构建命令表示**项目提供相应构建能力**，不代表已通过所有浏览器的实际安装测试。测试命令主要覆盖番剧链接、弹幕分段以及时间轴计算等逻辑，无法替代真实 B 站账号、地区与浏览器环境下的验证。

### 自动发布 Release

仓库的 `.github/workflows/release.yml` 在推送 `v版本号` Git 标签后触发：核对 `package.json` 版本、运行自动化测试、构建 Chrome 和 Edge，并将两个可安装 ZIP 附加到 GitHub Release。发布新版本时需先更新 `package.json`、`package-lock.json` 和发布说明，再提交并推送对应标签。普通用户只需从 Releases 下载。
欢迎通过本仓库的 Issues 反馈问题；反馈时请提供目标页面类型、B 站链接形式、复现步骤和错误信息，**不要提交 Cookie 或其他账号凭据**。

## 来源、致谢与许可

本项目基于 [ahaduoduoduo/bilibili-youtube-danmaku](https://github.com/ahaduoduoduo/bilibili-youtube-danmaku) 修改，并整合了 [hansamar 提交的本地 XML 导入与分 P 支持（上游 PR #43）](https://github.com/ahaduoduoduo/bilibili-youtube-danmaku/pull/43)。感谢原作者与贡献者的工作。

项目遵循仓库中的 [MIT License](LICENSE)，并保留原作者版权声明。此仓库是独立维护的修改版，与原作者的浏览器商店发行版无关。
