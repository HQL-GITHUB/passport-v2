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

| 命令                       | 用途                                                       |
| -------------------------- | ---------------------------------------------------------- |
| `npm run dev`              | 启动开发服务器，默认端口 4173                              |
| `npm run build`            | 构建静态网站到 `dist/site/`                                |
| `npm run preview`          | 在端口 4174 预览网站构建产物                               |
| `npm run build:standalone` | 生成内含代码、样式与演示图片的离线 HTML                    |
| `npm run build:all`        | 同时生成网站和离线版本                                     |
| `npm test`                 | 运行数据规则、迁移与名称核对的单元测试                     |
| `npm run test:e2e`         | 生成网站与离线文件，并运行浏览器回归测试                   |
| `npm run lint`             | 用 ESLint 检查未使用的变量、未定义的名字等                 |
| `npm run format`           | 格式化源码、配置、测试和文档                               |
| `npm run format:check`     | 检查格式，不改动文件                                       |
| `npm run verify`           | 依次执行单元测试、代码检查、格式检查、网站构建、浏览器测试 |

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
│  ├─ config.js               # 演示日期、存储键
│  ├─ app/                    # 应用组装、页面表、页面主体表、事件分发、导航、渲染调度
│  ├─ actions/                # 按钮动作表与字段表，按功能分组
│  ├─ api/contract.d.ts       # 后端接口的类型定义，以及分页社区接口的草案
│  ├─ api/local/              # 后端接口的本机演示实现：规则、演示内容（data/）与票根原图存储
│  ├─ assets/                 # 随应用发布的图片（WebP）、数字字体，以及它们的清单 index.js
│  ├─ domain/                 # 页面与后端共用的纯规则：目录查询、到访键、日期校验、可领的章
│  ├─ state/                  # 界面状态、数据仓库和数据查询（selectors）
│  ├─ controllers/            # 领取、记忆编辑、发布、弹窗表、搜索、领取仪式、分享卡与轻提示
│  ├─ views/                  # 各页面、页面操作区与弹窗的 HTML 渲染函数
│  ├─ lib/                    # 不依赖应用状态的部件与工具：翻页、徽章查看、轮播、票根裁剪遮挡、图片、文字格式
│  └─ styles/                 # 设计变量与按功能划分的样式，index.css 决定导入顺序
├─ assets-src/                # 插画与照片的 PNG 原图，不进入构建
├─ scripts/                   # 离线构建、浏览器测试服务器管理、由原图生成 WebP
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

单元测试覆盖同次到访合并、旧记录迁移、独立记忆、已清空记录保持、无章到访和日期校验，后端接口的每个方法（领取、票根识别与入册、取消、发布、公开设置和首次使用演示），榜单的排名规则，以及页面主体表（`tests/unit/subjects.test.js`：各种页面怎样读写地址、记下哪个场馆或章）。`tests/unit/wiring.test.js` 核对靠名字连接的部分：页面里每个 `data-action`、`data-input`、`data-change` 都有对应的动作或字段，页面表与弹窗表提到的页面函数都存在，跳转、弹窗与页面主体用到的名字都在表里；反过来，没有按钮的动作和没有被画出的页面函数也会报出来。`tests/unit/escaping.test.js` 核对转义：给目录、其他收藏家与持有人的文字都加上标签和引号，把每个页面与弹窗画一遍，检查没有一处原样写进 HTML。

浏览器测试按功能分文件（`tests/e2e/` 下的 `discovery`、`navigation`、`book`、`stamps`、`visits`、`claim`、`passport`、`square`、`collectors`、`map`、`mobile`、`medal`），覆盖原图恢复、独立移除、无章到访、分享遮挡与下载、首次使用状态切换，以及单文件离线运行。

徽章回归同时检查源码、网站构建与离线版中的详情页、放大查看层和领取成功页，覆盖上下倾斜与正反面。可执行 `npm run test:e2e -- tests/e2e/medal.spec.js --browser=webkit` 验证 WebKit（首次运行需先执行 `npx playwright install webkit`）。Playwright 的 WebKit 不能代替 iPhone Safari 和微信的真机合成验证。

首次运行浏览器测试时安装 Chromium：

```sh
npx playwright install chromium
npm run verify
```

如果本机已有 Google Chrome 或 Microsoft Edge，也可以指定使用已安装的浏览器（Edge 为 `msedge`）：

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

- 增加或修改场馆、纪念章：`src/api/local/data/catalog.js`。
- 调整页面布局：`src/views/` 与 `src/styles/` 中对应功能的文件。
- 增加页面：在 `src/app/screens.js` 的页面表里加一行，并在 `src/views/` 写出它的渲染函数；返回去向、数据缺失时的替代页面、页头与页面操作区的按钮都写在这一行里。页面里的文字一律经 `safe()` 写入，并在 `tests/unit/escaping.test.js` 的场景表里加上这个页面。
- 增加弹窗：在 `src/controllers/dialogs.js` 的弹窗表里加一行，并在 `src/views/` 写出返回标题与内容的函数。
- 修改示意地图与场馆在图上的位置：`src/views/map.js` 与 `src/api/local/data/catalog.js` 的 `at` 字段。
- 增加按钮动作或输入框的响应：`src/actions/` 中对应功能的动作表、字段表。
- 增加或替换插画与照片：把 PNG 原图放进 `assets-src/`，执行 `python scripts/optimize-images.py`（需要 Pillow）生成 `src/assets/` 里的 WebP，并在 `src/assets/index.js` 里登记。
- 修改领取与票根入册的交互流程：`src/controllers/claims.js`。
- 修改领取规则、编号与票根识别（演示中由本机后端决定）：`src/api/local/index.js` 与 `src/domain/claims.js`。
- 修改到访归档、编号、数据迁移：`src/api/local/passport.js`。
- 接入账号与服务端存储：按 [架构说明](docs/architecture.md) 的「后端接口」与 `src/api/contract.d.ts` 的类型另写一个实现，在 `src/app/create-app.js` 换上。
- 修改分享卡：`src/controllers/share-card.js` 与 `src/lib/ticket-editor.js`。
- 修改榜单规则、公开范围与演示收藏家：`src/state/community.js`、`src/views/collectors.js` 与 `src/api/local/data/collectors.js`。
- 修改广场的信息流、发布与留言簿：`src/views/square.js`，以及 `src/state/community.js` 中的 `posts`。

应用依赖在 `src/app/create-app.js` 中统一组装。模块通过同一个 `appContext` 读取当前状态；不要在模块初始化时缓存可被替换的 `data`、`catalog` 与 `community`，也不要直接改动 `data`：改动一律通过 `store` 发给后端。详细关系见 [架构说明](docs/architecture.md)。

## 原型边界

场馆、开放信息和章面均为概念内容。其他收藏家、榜单、名次与广场上的动态同样是本机的演示数据，没有账号；公开设置只影响本机上的预览，发布到广场的内容也只保存在本机。票根识别使用明确标示的示例结果，未连接真实 OCR、票号核验、NFC 读写、账号和场馆服务。图片重复检测只演示完全相同文件的本地去重。

纪念章的收藏编号由本机按章与领取日期模拟生成，不是真实的发行序号，也不保证跨设备唯一。展览纪念章的发行量与发行进度同样是演示数据，发行量在 `src/api/local/data/catalog.js` 的 `limit` 字段中设置。接入服务后，编号与发行进度应由服务端在领取时签发并随记录返回。

`src/config.js` 中的演示日期固定为 **2026-11-10**，用于重现历史票根匹配与日期校验；代码一律通过 `clock.today()` 读取。接入真实服务时，需要一并替换演示日期、数据目录与验证逻辑。

设计记录见 [design-notes.txt](docs/design-notes.txt)，插画生成记录见 [asset-prompts.json](docs/asset-prompts.json) 与 [asset-prompts-expansion.json](docs/asset-prompts-expansion.json)。工具文档：[Vite](https://vite.dev/guide/)、[Playwright](https://playwright.dev/docs/test-configuration)。
