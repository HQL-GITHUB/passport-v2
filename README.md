# 文化旅行护照

面向博物馆、美术馆与文化旅行的移动端交互原型。以“一次到访”为单位，收藏参观日期、票根原图、纪念章、照片和感想。

当前采用 **Vite + 原生 JavaScript ES Modules + CSS**，没有前端运行时框架依赖。支持开发热更新、静态网站构建、单文件离线导出和自动化测试。

## 快速开始

环境要求：Node.js 22.12 或以上版本，npm。仓库提交了 `package-lock.json`，推荐通过 `npm ci` 安装锁定的依赖。

```sh
cd passport-v2
npm ci
npm run dev
```

打开 <http://127.0.0.1:4173>。在项目目录中执行命令时，省略第一行 `cd`。

如果 4173 已被其他预览进程占用，先关闭该进程，或执行 `npm run dev -- --port 4176`。端口改变会切换浏览器的本地存储空间。

## 常用命令

| 命令                       | 用途                                             |
| -------------------------- | ------------------------------------------------ |
| `npm run dev`              | 启动开发服务器，默认端口 4173                    |
| `npm run build`            | 构建静态网站到 `dist/site/`                      |
| `npm run preview`          | 在端口 4174 预览网站构建产物                     |
| `npm run build:standalone` | 生成内含代码、样式与演示图片的离线 HTML          |
| `npm run build:all`        | 同时生成网站和离线版本                           |
| `npm test`                 | 运行数据规则与迁移的单元测试                     |
| `npm run test:e2e`         | 生成网站与离线文件，并运行浏览器回归测试         |
| `npm run format`           | 格式化源码、配置、测试和文档                     |
| `npm run format:check`     | 检查格式，不改动文件                             |
| `npm run verify`           | 依次执行单元测试、格式检查、网站构建、浏览器测试 |

网站构建用于通过 HTTP 服务部署。需要直接双击、离线打开时，使用：

```text
dist/standalone/旅行护照.html
```

该文件只内置演示内容，不会把当前浏览器里的私人票根和个人记录打包进去。`dist/` 为生成目录，请修改 `src/` 中的源码后重新构建。

## 项目结构

```text
passport-v2/
├─ index.html                 # HTML 外壳、图标与桌面评审侧栏
├─ src/
│  ├─ main.js                 # 应用入口与样式加载
│  ├─ config.js               # 演示日期、路由、存储键
│  ├─ app/                    # 应用组装、事件分发、导航、渲染调度
│  ├─ assets/                 # 纪念章插画、建筑图片与数字字体
│  ├─ data/                   # 场馆、纪念章目录及初始演示记录
│  ├─ domain/                 # 到访合并、数据规范化与旧记录迁移
│  ├─ state/                  # 界面状态、运行时状态和数据查询
│  ├─ storage/                # localStorage 元数据、IndexedDB 原图
│  ├─ controllers/            # 领取、记忆编辑、弹窗与搜索交互
│  ├─ views/                  # 各页面的 HTML 渲染函数
│  ├─ services/               # 分享卡绘制与文件导出
│  ├─ lib/                    # 展示工具、图片工具、票根裁剪遮挡
│  ├─ ui/                     # 轻提示等通用反馈
│  └─ styles/                 # 设计变量、基础样式、票根与到访样式
├─ scripts/                   # 离线构建与浏览器测试服务器管理
├─ tests/
│  ├─ unit/                   # Node.js 原生测试，无需浏览器
│  └─ e2e/                    # Playwright 浏览器测试
├─ docs/                      # 架构说明、设计记录、图片生成提示词
├─ artifacts/                 # 本地保留的历史原型、截图和分享样例
└─ dist/                      # 网站与单文件构建产物
```

`artifacts/`、`dist/`、依赖和测试报告均已加入 `.gitignore`。历史原型保留在 `artifacts/legacy/`，不参与当前构建。

## 已有体验

- 护照首页：足迹、章册、想去；按参观日期组织到访。
- 发现：场馆搜索、城市与类别筛选、场馆详情和领取位置；可切换为手绘示意地图，已收藏、待出发与想去各有标记。
- 领取：现场扫码、NFC 碰一碰、拍摄或导入票根的演示流程。
- 到访记忆：同一场馆、同一天合并多张票根与多枚纪念章。
- 票根原图：本地保存、刷新恢复、完整查看、单独移除。
- 自定义场馆：没有匹配的纪念章，也能保存到访、票根和个人记录。
- 分享：私人内容默认关闭；票根可手动裁剪、遮挡，确认后生成分享卡。
- 广场：收藏家发布的单次到访，双列图文卡片，点开是这一条的页面，可以点赞、加入想去；自己的到访从旅行卡发布，不含票根，可以撤回；场馆页有留言簿。
- 收藏家：按城市与年度的榜单（只计现场领取）、别人的护照、每枚章的收藏者名录，以及自己的公开设置。
- 演示状态：可体验首次使用，再切回已有收藏。

## 数据与隐私

| 内容                                   | 位置                                                          |
| -------------------------------------- | ------------------------------------------------------------- |
| 到访、章册、票根元数据、感想及参观照片 | `localStorage` 的 `cultural-passport-prototype-v3`            |
| 兼容读取的第二版数据                   | `cultural-passport-prototype-v2`，不会覆盖旧键                |
| 导入的票根原图                         | IndexedDB `cultural-passport-memory-v3` 的 `tickets` 对象仓库 |
| 界面选择、待提交票根、分享处理副本     | 当前页面运行时内存                                            |

到访键为 `venueId/参观日期`。票根移除操作只移除票根原图和展示状态，保留到访、徽章与防止重复领取所需的元数据。原图处理只作用于分享副本。

这些数据保存在当前浏览器与当前来源中，不会上传，也没有云端同步。更换端口、浏览器或从网站切换为本地 HTML，会进入另一个存储空间。清理浏览器站点数据会清除本机记录。

## 测试

单元测试覆盖同次到访合并、旧记录迁移、独立记忆、已清空记录保持、无章到访和日期校验。

浏览器测试覆盖原图恢复、独立移除、无章到访、分享遮挡与下载、首次使用状态切换，以及单文件离线运行。

徽章回归同时检查源码、网站构建与离线版中的详情页、放大查看层和领取成功页，覆盖上下倾斜与正反面。可执行 `npm run test:e2e -- tests/e2e/medal.spec.js --browser=webkit` 验证 WebKit（首次运行需先执行 `npx playwright install webkit`）。Playwright 的 WebKit 不能代替 iPhone Safari 和微信的真机合成验证。

首次运行浏览器测试时安装 Chromium：

```sh
npx playwright install chromium
npm run verify
```

如果本机已有 Google Chrome，也可以指定使用已安装的浏览器：

```powershell
$env:PLAYWRIGHT_BROWSER_CHANNEL = 'chrome'
npm run test:e2e
```

如果浏览器安装在自定义位置，或系统无法自动定位 Chrome，可以显式指定可执行文件路径：

```powershell
$env:PLAYWRIGHT_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:e2e
```

指定可执行文件后会优先使用该路径，忽略浏览器 channel。

测试使用独立的 4175 端口和隔离的浏览器上下文，不读取开发预览中的个人记录。失败时的 trace 保存在 `test-results/`。

## 后续开发入口

- 增加或修改场馆、纪念章：`src/data/catalog.js`。
- 调整页面布局：`src/views/` 与 `src/styles/`。
- 修改示意地图与场馆在图上的位置：`src/views/map.js` 与 `src/data/catalog.js` 的 `at` 字段。
- 修改领取规则与票根识别流程：`src/controllers/claims.js`。
- 修改到访归档、数据迁移：`src/domain/visits.js`。
- 接入账号与服务端存储：从 `src/storage/` 开始。
- 修改分享卡：`src/services/share-card.js` 与 `src/lib/ticket-editor.js`。
- 修改榜单规则、公开范围与演示收藏家：`src/state/community.js`、`src/views/collectors.js` 与 `src/data/collectors.js`。
- 修改广场的信息流、发布与留言簿：`src/views/square.js`，以及 `src/state/community.js` 中的 `posts`。

应用依赖在 `src/app/create-app.js` 中统一组装。模块通过同一个 `appContext` 读取当前状态；不要在模块初始化时缓存可被替换的 `data`。详细关系见 [架构说明](docs/architecture.md)。

## 原型边界

场馆、开放信息和章面均为概念内容。其他收藏家、榜单、名次与广场上的动态同样是本机的演示数据，没有账号；公开设置只影响本机上的预览，发布到广场的内容也只保存在本机。票根识别使用明确标示的示例结果，未连接真实 OCR、票号核验、NFC 读写、账号和场馆服务。图片重复检测只演示完全相同文件的本地去重。

纪念章的收藏编号由本机按章与领取日期模拟生成，不是真实的发行序号，也不保证跨设备唯一。展览纪念章的发行量与发行进度同样是演示数据，发行量在 `src/data/catalog.js` 的 `limit` 字段中设置。接入服务后，编号与发行进度应由服务端在领取时签发并随记录返回。

`src/config.js` 中的演示日期固定为 **2026-11-10**，用于重现历史票根匹配与日期校验。接入真实服务时，需要一并替换演示日期、数据目录与验证逻辑。

设计记录见 [design-notes.txt](docs/design-notes.txt)，插画生成记录见 [asset-prompts.json](docs/asset-prompts.json) 与 [asset-prompts-expansion.json](docs/asset-prompts-expansion.json)。工具文档：[Vite](https://vite.dev/guide/)、[Playwright](https://playwright.dev/docs/test-configuration)。
