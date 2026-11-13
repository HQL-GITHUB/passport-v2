# 给 AI 助手的说明

文化旅行护照的移动端 H5 交互原型：Vite + 原生 JavaScript ES Modules + CSS，没有运行时依赖。数据全部由浏览器里的本机后端（`src/api/local/`）提供。

结构与数据模型见 [docs/architecture.md](docs/architecture.md)，改什么去哪个文件见 [README.md](README.md) 的「后续开发入口」。动手前先读这两处里相关的段落。

## 已经定下的方向

- 这个仓库保持为原型，**不引入前端框架、TypeScript 或运行时依赖**，除非被明确要求。正式版会用 uni-app（Vue 3 + TypeScript）另起工程，这里的页面层届时重写。
- 能带到正式版的是 `src/domain/`、`src/api/`（契约与规则）和样式。所以业务规则只写进这两个目录，不写进页面。

## 命令

| 命令                         | 用途                                                  |
| ---------------------------- | ----------------------------------------------------- |
| `npm run dev`                | 开发服务器，<http://127.0.0.1:4173>                   |
| `npm test`                   | 单元测试，不到一秒                                    |
| `npm run lint`               | ESLint                                                |
| `npm run format`             | Prettier 排版（`format:check` 只检查）                |
| `npm run test:e2e`           | 构建并运行浏览器测试，约一分半                        |
| `npm run shot -- <页面地址>` | 按手机尺寸截图到 `.work/shots/`，用来看样式改动的结果 |

- 浏览器测试需要 Playwright 自带的 Chromium；没有安装时用 `PLAYWRIGHT_BROWSER_CHANNEL=msedge npm run test:e2e`。结果以末尾的 `N passed` / `N failed` 一行为准，不要只看退出码，也不要用 `| tail` 截掉它。
- `npm run shot` 会自己找可用的浏览器。页面地址是 `#/` 之后的部分，不要带 `#/`：`npm run shot -- discover venue/museum`。`--full` 截整页，`--width 320` 换宽度，`--click "<选择器>"` 先点一下再截（打开弹窗、切换标签）。地址写错或页面报错会在输出里说明。

## 改完要做的

1. `npm test`、`npm run lint`、`npm run format`。
2. 改了页面、交互或样式：跑浏览器测试。
3. 改了样式或页面结构：`npm run shot` 截出改到的页面，**读图确认**，再截一两个共用同一批样式的页面。测试只检查行为，不比对画面，改坏别处的样式不会报错。
4. 页面表、接口、数据结构、目录结构、命令有变化时，同步更新 README 与 docs/architecture.md 里对应的表格和段落。

## 必须遵守的约定

- **文字经 `safe()` 写入页面**。页面是拼出来的 HTML，目录、其他收藏家、持有人填写的文字和图片地址都要转义；id、日期、数字、枚举值直接写。`tests/unit/escaping.test.js` 会检查。
- **数据只通过 `store` 改**。`appContext.data` 是后端回答的副本，不直接改它，也不直接读写 `localStorage`。`data`、`catalog`、`community` 会被整体替换，不要在模块初始化时缓存。
- **「今天」用 `clock.today()`**，不用 `new Date()`。演示日期固定为 `src/config.js` 里的 `demoDate`。
- **颜色只引用 `src/styles/tokens.css` 里的变量**，不直接写色值（物件自己的颜色除外，见架构说明的「配色」）。
- **样式文件的导入顺序就是级联关系**（`styles/index.css`）。`.button`、`.page`、`.modal-sub`、`.page-actions` 等类名多处共用，改它们要看所有用到的页面。
- **页面里的标记会被别处引用**。改类名、id、`data-*` 之前，先在 `src/controllers/`、`src/actions/` 和 `tests/e2e/` 里搜这个选择器：控制器有不少地方直接改 DOM，而不是重新渲染。

## 加东西时要动的地方

页面、按钮、弹窗之间靠名字连接，这三类漏掉一处 `npm test` 就会失败（`wiring.test.js`、`escaping.test.js`）。后端方法与目录没有这样的核对，要自己对齐。

- **页面**：`src/app/screens.js` 加一行；`src/views/` 写出它的页面函数（以及页面操作区、页头按钮的函数）；`tests/unit/escaping.test.js` 的场景表加一行。讲的是新一种东西时，`src/app/subjects.js` 也加一行。
- **按钮**：标记上写 `data-action="名字"`，在 `src/actions/` 对应功能的动作表里加同名函数。输入框用 `data-input`、`data-change` 和字段表。
- **弹窗**：`src/controllers/dialogs.js` 的弹窗表加一行；`src/views/` 写出返回 `{ title, body }` 的函数；用 `openModal('名字')` 打开；在转义测试的场景里列出它。
- **后端方法**：`src/api/local/index.js` 实现；`src/api/contract.d.ts` 与架构说明的方法表同步；`tests/unit/api.test.js` 加测试。
- **场馆、纪念章**：`src/api/local/data/catalog.js`。新的章面还要有图片与样式（见 README）。

## 写法

- 注释用英文，说明为什么这样做；文档用中文。
- 模板字符串前加 `/* HTML */`，Prettier 才会排版它。页面文件里有不少几百字符的长行，改到时顺手拆成多行，不必专门整理。
- `artifacts/`、`dist/`、`.work/`、`test-results/` 是生成或留存目录，不提交，也不要去改。

## 提交

- 只在被要求时提交。提交在当前分支（包括 `main`）并推送，不另开分支；线上站点跟随 `main`。
- 提交信息沿用现有写法：一句英文，说清这次做了什么。
