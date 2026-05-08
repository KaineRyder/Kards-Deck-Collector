const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const rootDir = path.resolve(__dirname, '..');
const enableDeveloperOptions = process.env.KARDS_ENABLE_DEVELOPER_OPTIONS === 'true';

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, ''));
}

function loadBundledConfig() {
  const configPaths = [
    path.join(rootDir, 'app-config.json'),
    path.join(rootDir, 'release', 'app-config.json'),
  ];

  for (const configPath of configPaths) {
    const config = readJsonIfExists(configPath);
    if (config.deckImageServerUrl) {
      console.log(`Bundling deck image config from ${path.relative(rootDir, configPath)}`);
      return config;
    }
  }

  if (process.env.DECK_IMAGE_SERVER_URL) {
    console.log('Bundling deck image config from environment variables');
    return {
      deckImageServerUrl: process.env.DECK_IMAGE_SERVER_URL,
      deckCodeField: process.env.DECK_IMAGE_CODE_FIELD || 'deck_code',
      deckCodeEncoding: process.env.DECK_IMAGE_CODE_ENCODING === 'base64' ? 'base64' : 'plain',
      allowInsecureTls: process.env.DECK_IMAGE_ALLOW_INSECURE_TLS === 'true',
    };
  }

  console.warn('No bundled deck image config found. Desktop builds will require app-config.json or DECK_IMAGE_SERVER_URL.');
  return {};
}

esbuild.build({
  entryPoints: [
    path.join(rootDir, 'electron', 'main.ts'),
    path.join(rootDir, 'electron', 'preload.ts'),
  ],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outdir: path.join(rootDir, 'dist-electron'),
  outExtension: { '.js': '.cjs' },
  external: ['electron'],
  define: {
    __KARDS_BUNDLED_APP_CONFIG__: JSON.stringify(loadBundledConfig()),
    __KARDS_ENABLE_DEVELOPER_OPTIONS__: JSON.stringify(enableDeveloperOptions),
  },
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
