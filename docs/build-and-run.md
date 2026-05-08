# 编译与运行指南

这个项目可以理解成三层：

```text
React 界面
  -> dist/

Electron 主进程和 preload
  -> dist-electron/

Windows 应用包
  -> release/
```

## 日常开发

如果你想一边改代码，一边直接打开桌面程序看效果，用这个：

```bash
npm run dev:desktop
```

它会做这些事：

- 启动 Vite 前端开发服务器。
- 编译 Electron 主进程和 preload 代码。
- 打开 Electron 桌面窗口。
- 适合日常检查 UI 和桌面端行为。

如果你只想在浏览器里调试网页版本：

```bash
npm run dev
```

然后打开终端里显示的地址。

## 检查代码

运行 TypeScript 校验：

```bash
npm run lint
```

运行卡组导入提取逻辑的测试：

```bash
npm run test:deck-import
```

改了解析、导入、类型相关代码后，建议至少跑这两个。

## 编译网页和服务器版本

编译网页界面和 Node 服务：

```bash
npm run build
```

它实际会依次运行：

```bash
npm run build:web
npm run build:server
```

输出内容：

- `dist/`：生产版网页界面文件。
- `dist/server.cjs`：打包后的 Node 服务文件。

这个命令适合网页/服务器版本，不会生成 Windows 桌面 `.exe`。

## 编译桌面版运行文件

编译桌面程序需要的运行文件：

```bash
npm run build:desktop
```

它实际会依次运行：

```bash
npm run build:web
npm run build:electron
```

输出内容：

- `dist/`：桌面程序窗口加载的生产版界面。
- `dist-electron/`：编译后的 Electron 主进程和 preload 文件。

这个命令会准备好桌面应用运行所需代码，但还不会生成打包后的 `.exe`。

## 生成可直接双击的 EXE

如果你想要一个便携版 `.exe`，用这个：

```bash
npm run dist:win:portable
```

输出位置：

```text
release/KARDS Deck Collector 0.0.0.exe
```

这是最适合自己使用的版本。生成后可以直接双击运行，不需要安装。

## 生成解包目录版

如果你想要一个完整的应用文件夹，用这个：

```bash
npm run dist:win:dir
```

输出位置：

```text
release/win-unpacked/KARDS Deck Collector.exe
```

这个版本适合测试打包后的真实程序，也可以直接双击运行。

## 生成 Windows 安装包

如果你想生成正式安装包，用这个：

```bash
npm run dist:win
```

输出位置：

```text
release/
```

这个更适合发给其他用户安装。

## 推荐工作流

日常开发：

```bash
npm run dev:desktop
```

改完代码后检查：

```bash
npm run lint
npm run test:deck-import
npm run build:desktop
```

想生成一个可以双击运行的程序：

```bash
npm run dist:win:portable
```

## 清理编译产物

删除生成的编译目录：

```bash
npm run clean
```

它会删除：

- `dist/`
- `dist-electron/`
- `release/`

如果你觉得编译结果像是旧文件残留，或者想重新干净打包，可以先运行这个命令。
