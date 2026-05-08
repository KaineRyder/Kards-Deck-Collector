# KARDS 卡组记录器 (KARDS Deck Recorder)

一个专为二战题材卡牌游戏 **KARDS** 打造的深度还原卡组管理与记录工具。本应用旨在为玩家提供一个极具沉浸感、高度还原游戏原生界面的平台，支持卡组代码导入、精细化合集管理、以及极致的个性化外观调节。

## ✨ 核心特性

- **🎖️ 极度还原的沉浸 UI**：
  - **动态背景系统**：根据所选卡组自动呈现主/盟国标志性 Logo。
  - **桌布收藏夹**：内置 20+ KARDS自带战场桌布，支持自定义上传与管理。
  - **军武质感**：深度定制的毛玻璃特效、金属边框及纸张纹理。

- **📂 强大的合集管理 (Collections)**：
  - **多维度归档**：自由创建“天梯”、“整活”、“比赛”等合集，解决卡组堆叠烦恼。
  - **直观交互**：支持拖拽排序合集顺序，实时重命名。
  - **快速检索**：卡组名称、代码、标签、国家全字段检索。

- **📋 智能卡组解析**：
  - **标准支持**：支持 `%%` 开头的官方卡组代码。
  - **自动核验**：实时计算卡牌总数、主盟国信息，并针对非 40 张卡组显示警告。
  - **竞技场支持**：特有的竞技场卡组（Arena Decks）标记与管理。

- **🎨 极致的个性化调节**：
  - **双重主题模式**：支持深色/浅色模式无缝切换。
  - **动态配色**：浅色模式下可自定义基础底色，系统自动生成和谐的 UI 配色体系。
  - **UI 增强**：支持 UI 缩放 (Scaling)、面板透明度 (Opacity) 及 Logo 透明度调节。
  - **高级卡背**：内置各阵营基础与老兵卡背（德国未找到），支持自定义图片裁剪 (`react-easy-crop`) 及分类管理。

- **💾 数据持久化 (Offline First)**：
  - 采用 `localforage` (IndexedDB) 进行海量数据与图片的存储，性能远超 `localStorage`，确保数据安全不丢失。

## ⚙️ 开发者配置 (Environment Variables)

为了保护后端接口不被泄露，项目采用了 **Backend Proxy (后端代理)** 模式。请在根目录创建 `.env` 文件并参考 `.env.example` 进行配置：

- `DECK_IMAGE_SERVER_URL`: 指向 Kards 卡组图片解析服务器的秘密地址。
- `GEMINI_API_KEY`: 如需启用 AI 辅助功能，请配置 Google Gemini API Key。

**安全机制**：前端 UI 仅访问本地 `/api/*` 路由，由 Node.js 服务端在隐藏状态下完成远程转发，确保敏感 URL 不会暴露在浏览器端。

## 🚀 技术栈

- **前端**：React 19 + TypeScript
- **构建**：Vite 6
- **样式**：Tailwind CSS 4 (原生变量整合)
- **动画**：Motion (Framer Motion)
- **存储**：LocalForage (IndexedDB)
- **工具**：Lucide React (图标), React Easy Crop (图片裁剪)

## 🛠️ 项目结构

```text
/
├── public/assets/          # 游戏内置素材 (卡背、国旗、图标、桌布)
├── electron/               # Electron 主进程与预加载脚本
├── scripts/                # 桌面构建、启动与打包辅助脚本
├── src/
│   ├── components/         # 复用 UI 组件
│   ├── lib/
│   │   ├── colorUtils.ts   # 动态主题颜色生成引擎
│   │   └── cropImage.ts    # 图片裁剪处理工具
│   ├── App.tsx             # 核心业务逻辑与主渲染界面
│   ├── index.css           # 全局样式与 Tailwind 变量定义
│   └── main.tsx            # 应用入口
├── server.ts               # Full-stack 服务端入口 (Express)
├── metadata.json           # 应用元数据 (权限、名称)
└── package.json            # 依赖管理
```

## 📖 如何使用

1. **导入**：在主界面点击“+”号或左侧侧边栏，粘贴您的卡组代码。
2. **组织**：在“合集”页面创建分类，将散乱的卡组拖入对应的合集中。
3. **装修**：
   - 点击顶部“设置 (齿轮)”图标，调节 UI 大小、透明度。
   - 切换“主题模式”，并在浅色模式下尝试不同的底色。
   - 点击卡组封面的大图，上传并挑选最心仪的卡背。
4. **同步**：项目为离线持久化存储，无需注册。如需多端同步，建议配合浏览器的 IndexedDB 导出或手动复制卡组码。

## ⚠️ 存储说明

本应用将图片（如自定义桌布和卡背）以 Base64 格式存储在浏览器的 **IndexedDB** 中。虽然容量远大于 localStorage，但仍然建议单张图片压缩在 500KB 以内，以获得最流畅的加载体验。

## Windows 桌面版

项目已经加入 Electron 桌面运行时，支持 Windows 便携版 exe。

常用开发命令：

- `npm run dev:desktop`：启动 Vite + Electron 桌面开发版。
- `npm run build:desktop`：构建网页端资源和 Electron 主进程。
- `npm run dist:win:dir`：生成 Windows unpacked 测试版，输出目录为 `release/win-unpacked/`。

unpacked 测试版入口：

```text
release/win-unpacked/KARDS Deck Collector.exe
```

设置窗口里新增了“数据备份”，可以导出或导入卡组、合集、设置、自定义桌布、自定义卡背和缓存图片。桌面版生成卡组解析图时会优先走 Electron 主进程代理；没有配置解析图服务时，只影响解析图功能，不影响离线管理卡组。

### Windows 打包

- `npm run dist:win:portable`：生成 Windows 便携版，输出 `release/KARDS Deck Collector 0.0.0.exe`。
- `npm run dist:win:portable:dev`：生成带调试配置入口的便携版，便于本地联调解析图服务。

打包时可以通过本机私有 `app-config.json` 或环境变量注入解析图服务配置。`app-config.json` 已被 `.gitignore` 忽略，不会进入开源仓库。

### 卡组解析图服务配置

开源仓库不会保存真实服务器地址。开发者需要接入解析图服务时，可以复制示例配置：

```powershell
Copy-Item app-config.example.json app-config.json
```

然后编辑 `app-config.json`：

```json
{
  "deckImageServerUrl": "https://your-server.example/api/kards/draw_deck",
  "deckCodeField": "deck_code",
  "deckCodeEncoding": "plain",
  "allowInsecureTls": true
}
```

桌面版读取顺序：

1. `KARDS_APP_CONFIG` 指定的配置文件
2. 用户数据目录中的 `app-config.json`
3. 便携版 exe 同目录的 `app-config.json`
4. 项目根目录的 `app-config.json`
5. 打包时注入的默认配置
6. 环境变量 `DECK_IMAGE_SERVER_URL`

发送到服务器的请求体为：

```json
{
  "deck_code": "%%27|0B0l0meFgvjeooq0qnsOsQv8w2w7;0d1VfXjMmToYqYw8wawcwS;wb;"
}
```

如果服务器端需要 Base64，把配置改成：

```json
{
  "deckImageServerUrl": "https://your-server.example/api/kards/draw_deck",
  "deckCodeField": "deck_code",
  "deckCodeEncoding": "base64",
  "allowInsecureTls": true
}
```

此时请求体为：

```json
{
  "deck_code": "base64编码后的卡组码",
  "encoding": "base64"
}
```

服务器可以直接返回图片二进制，也可以返回图片 URL：

```json
{
  "imageUrl": "https://your-server.example/generated-image.png"
}
```

也兼容返回 `image_url` 或 `url` 字段。如果服务器返回 Base64 图片，支持 `imageData`、`image_data`、`imageBase64`、`image_base64`，也支持放在 `data.image_base64` 里。程序会先解码 Base64 并识别真实图片格式，再交给前端显示。

### 换行符规范

仓库使用 `.gitattributes` 统一源码、JSON、Markdown、HTML、YAML 等文本文件为 LF 换行，并将图片资源标记为 binary。Windows 上如果遇到换行符提示，可以执行：

```powershell
git add --renormalize .
```

注意：`dist:win:dir` 为了避免 Windows 当前用户缺少符号链接权限导致打包失败，会跳过 exe 图标/签名资源编辑。正式安装包可在开启 Windows 开发者模式或管理员权限后再运行完整 `npm run dist:win`。

如果从终端启动 Electron 后窗口立即退出，请检查当前终端是否设置了 `ELECTRON_RUN_AS_NODE=1`。`npm run dev:desktop` 已自动清除此变量；手动运行 exe 时可先执行：

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
```

---

*“翼载荣光，同志”*
