import 'dotenv/config';
import { app, BrowserWindow, dialog, ipcMain, protocol } from 'electron';
import fs from 'fs/promises';
import path from 'path';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'kards',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

app.commandLine.appendSwitch('disable-crash-reporter');

const isDev = !app.isPackaged;
const rendererUrl = process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:5173';
const appName = 'KARDS Deck Collector';
let mainWindow: BrowserWindow | null = null;

type BackupPayload = {
  schemaVersion: number;
  exportedAt: string;
  data: Record<string, unknown>;
};

type AppConfig = {
  deckImageServerUrl?: string;
  deckCodeField?: string;
  deckCodeEncoding?: 'plain' | 'base64';
  allowInsecureTls?: boolean;
};

declare const __KARDS_BUNDLED_APP_CONFIG__: AppConfig;
declare const __KARDS_ENABLE_DEVELOPER_OPTIONS__: boolean;

const bundledAppConfig = __KARDS_BUNDLED_APP_CONFIG__;
const enableDeveloperOptions = __KARDS_ENABLE_DEVELOPER_OPTIONS__;

function getUserAppConfigPath() {
  return path.join(app.getPath('userData'), 'app-config.json');
}

async function readJsonConfig(filePath: string): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as AppConfig;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error: any) {
    if (error?.code === 'ENOENT') return {};
    throw new Error(`Invalid app config at ${filePath}: ${error?.message || String(error)}`);
  }
}

async function loadAppConfig(): Promise<AppConfig> {
  const configPaths = [
    process.env.KARDS_APP_CONFIG,
    app.isReady() ? getUserAppConfigPath() : undefined,
    process.env.PORTABLE_EXECUTABLE_DIR
      ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'app-config.json')
      : undefined,
    path.join(path.dirname(process.execPath), 'app-config.json'),
    path.join(process.cwd(), 'app-config.json'),
  ].filter((configPath): configPath is string => Boolean(configPath));

  for (const configPath of configPaths) {
    const config = await readJsonConfig(configPath);
    if (config.deckImageServerUrl) {
      return config;
    }
  }

  if (bundledAppConfig.deckImageServerUrl) {
    return bundledAppConfig;
  }

  return {};
}

function encodeDeckCode(code: string) {
  return Buffer.from(code.trim(), 'utf-8').toString('base64');
}

function buildDeckImageRequestBody(code: string, appConfig: AppConfig) {
  const encoding = appConfig.deckCodeEncoding || 'plain';
  const field = appConfig.deckCodeField || 'deck_code';
  const deckCode = encoding === 'base64' ? encodeDeckCode(code) : code.trim();

  return {
    [field]: deckCode,
    ...(encoding === 'base64' ? { encoding: 'base64' } : {}),
  };
}

function findImageData(data: any): string | undefined {
  return data?.imageData
    || data?.image_data
    || data?.imageBase64
    || data?.image_base64
    || data?.data?.imageData
    || data?.data?.image_data
    || data?.data?.imageBase64
    || data?.data?.image_base64;
}

function findImageUrl(data: any): string | undefined {
  return data?.imageUrl
    || data?.image_url
    || data?.url
    || data?.data?.imageUrl
    || data?.data?.image_url
    || data?.data?.url;
}

function detectImageMime(buffer: Buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }

  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }

  if (buffer.subarray(0, 3).toString('ascii') === 'GIF') {
    return 'image/gif';
  }

  return 'image/jpeg';
}

function normalizeImageData(imageData: string) {
  const trimmed = imageData.trim();
  const dataUriMatch = trimmed.match(/^data:([^;,]+)?(;base64)?,(.*)$/i);
  const base64 = dataUriMatch ? dataUriMatch[3] : trimmed;
  const buffer = Buffer.from(base64, 'base64');
  const mimeType = detectImageMime(buffer);

  return `data:${mimeType};base64,${base64}`;
}

function getRendererDistPath(relativePath = 'index.html') {
  const normalized = decodeURIComponent(relativePath).replace(/^\/+/, '') || 'index.html';
  return path.join(__dirname, '..', 'dist', normalized);
}

function getIconPath() {
  return path.join(__dirname, '..', 'dist', 'assets', 'kards_logos', 'Common', 'KardsLogoBlack.png');
}

async function showLoadFailure(mainWindow: BrowserWindow, details: string) {
  const message = [
    '<!doctype html>',
    '<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#151515;color:#eee;padding:32px;">',
    '<h1>KARDS Deck Collector</h1>',
    '<p>The desktop renderer could not be loaded.</p>',
    `<pre style="white-space:pre-wrap;background:#242424;padding:16px;border:1px solid #444;">${details}</pre>`,
    '</body></html>',
  ].join('');

  await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(message)}`);
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: appName,
    icon: getIconPath(),
    show: false,
    backgroundColor: '#111111',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    if (mainWindow) {
      showLoadFailure(mainWindow, `Code: ${errorCode}\nDetails: ${errorDescription}\nURL: ${validatedUrl}`).catch(console.error);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  try {
    if (isDev) {
      await mainWindow.loadURL(rendererUrl);
    } else {
      await mainWindow.loadURL('kards://app/index.html');
    }
  } catch (error) {
    await showLoadFailure(mainWindow, error instanceof Error ? error.stack || error.message : String(error));
  }
}

function registerAppProtocol() {
  if (isDev) return;

  protocol.registerFileProtocol('kards', (request, callback) => {
    try {
      const url = new URL(request.url);
      const filePath = getRendererDistPath(url.pathname);
      callback({ path: filePath });
    } catch (error) {
      callback({ error: -6 });
    }
  });
}

async function requestDeckImage(code: unknown) {
  if (typeof code !== 'string' || !code.trim()) {
    throw new Error('Deck code is required.');
  }

  const appConfig = await loadAppConfig();
  const serverUrl = appConfig.deckImageServerUrl || process.env.DECK_IMAGE_SERVER_URL || '';
  if (!serverUrl) {
    throw new Error('Please configure deckImageServerUrl in app-config.json or set DECK_IMAGE_SERVER_URL before generating deck images.');
  }

  if (appConfig.allowInsecureTls || process.env.DECK_IMAGE_ALLOW_INSECURE_TLS === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const requestBody = buildDeckImageRequestBody(code, appConfig);
  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Deck image service returned ${response.status}${errorText ? `: ${errorText.slice(0, 100)}` : ''}`);
  }

  const contentType = response.headers.get('content-type') || '';
  let imageBuffer: ArrayBuffer;
  let mimeType = 'image/png';

  if (contentType.includes('application/json')) {
    const data = await response.json();
    const imageData = findImageData(data);
    if (imageData) {
      return normalizeImageData(imageData);
    }

    const imageUrl = findImageUrl(data);
    if (!imageUrl) {
      throw new Error('Deck image service did not return imageUrl, image_url, url, imageData, or image_data.');
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Could not fetch deck image URL: ${imageResponse.status}`);
    }

    mimeType = imageResponse.headers.get('content-type') || mimeType;
    imageBuffer = await imageResponse.arrayBuffer();
  } else if (contentType.includes('image/')) {
    mimeType = contentType;
    imageBuffer = await response.arrayBuffer();
  } else {
    throw new Error(`Deck image service returned unsupported content type: ${contentType || 'unknown'}`);
  }

  const base64 = Buffer.from(imageBuffer).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

function registerIpcHandlers() {
  ipcMain.handle('deck-image:generate', async (_event, code: unknown) => {
    return requestDeckImage(code);
  });

  ipcMain.handle('app:get-info', () => ({
    name: appName,
    version: app.getVersion(),
    userDataPath: app.getPath('userData'),
    packaged: app.isPackaged,
    developerOptions: enableDeveloperOptions,
  }));

  ipcMain.handle('app-config:get', async () => {
    if (!enableDeveloperOptions) {
      throw new Error('Developer options are disabled in this build.');
    }

    return loadAppConfig();
  });

  ipcMain.handle('app-config:set', async (_event, config: AppConfig) => {
    if (!enableDeveloperOptions) {
      throw new Error('Developer options are disabled in this build.');
    }

    const nextConfig: AppConfig = {
      deckImageServerUrl: typeof config.deckImageServerUrl === 'string' ? config.deckImageServerUrl.trim() : '',
      deckCodeField: config.deckCodeField?.trim() || 'deck_code',
      deckCodeEncoding: config.deckCodeEncoding === 'base64' ? 'base64' : 'plain',
      allowInsecureTls: Boolean(config.allowInsecureTls),
    };

    await fs.mkdir(path.dirname(getUserAppConfigPath()), { recursive: true });
    await fs.writeFile(getUserAppConfigPath(), JSON.stringify(nextConfig, null, 2), 'utf-8');
    return nextConfig;
  });

  ipcMain.handle('backup:save', async (_event, backup: BackupPayload) => {
    if (!backup || backup.schemaVersion !== 1 || typeof backup.data !== 'object') {
      throw new Error('Invalid backup payload.');
    }

    const defaultPath = path.join(
      app.getPath('documents'),
      `kards-deck-collector-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );

    const result = await dialog.showSaveDialog({
      title: 'Export KARDS backup',
      defaultPath,
      filters: [{ name: 'KARDS backup', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    await fs.writeFile(result.filePath, JSON.stringify(backup, null, 2), 'utf-8');
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('backup:open', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import KARDS backup',
      properties: ['openFile'],
      filters: [{ name: 'KARDS backup', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true };
    }

    const content = await fs.readFile(result.filePaths[0], 'utf-8');
    return {
      canceled: false,
      filePath: result.filePaths[0],
      content,
    };
  });
}

app.setName(appName);
registerIpcHandlers();

app.whenReady().then(async () => {
  registerAppProtocol();
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
}).catch((error) => {
  dialog.showErrorBox(appName, error instanceof Error ? error.message : String(error));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
