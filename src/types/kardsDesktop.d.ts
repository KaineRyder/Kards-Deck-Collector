export {};

declare global {
  interface KardsDesktopAppInfo {
    name: string;
    version: string;
    userDataPath: string;
    packaged: boolean;
    developerOptions: boolean;
  }

  interface KardsDesktopBackupOpenResult {
    canceled: boolean;
    filePath?: string;
    content?: string;
  }

  interface KardsDesktopBackupSaveResult {
    canceled: boolean;
    filePath?: string;
  }

  interface KardsDesktopDeckImageConfig {
    deckImageServerMode?: 'default' | 'custom';
    deckImageServerUrl?: string;
    deckCodeField?: string;
    deckCodeEncoding?: 'plain' | 'base64';
    allowInsecureTls?: boolean;
  }

  interface Window {
    kardsDesktop?: {
      generateDeckImage: (code: string) => Promise<string>;
      getAppInfo: () => Promise<KardsDesktopAppInfo>;
      readClipboardText: () => Promise<string>;
      getDeckImageConfig: () => Promise<KardsDesktopDeckImageConfig>;
      saveDeckImageConfig: (config: KardsDesktopDeckImageConfig) => Promise<KardsDesktopDeckImageConfig>;
      saveBackup: (backup: unknown) => Promise<KardsDesktopBackupSaveResult>;
      openBackup: () => Promise<KardsDesktopBackupOpenResult>;
    };
  }
}
