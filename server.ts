import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import rateLimit from 'express-rate-limit';
import path from 'path';

type DeckImageServiceResponse = {
  imageData?: string;
  image_data?: string;
  imageBase64?: string;
  image_base64?: string;
  imageUrl?: string;
  image_url?: string;
  url?: string;
  data?: DeckImageServiceResponse;
};

const encodeDeckCode = (code: string) => Buffer.from(code.trim(), 'utf-8').toString('base64');

const buildDeckImageRequestBody = (code: string) => {
  const encoding = process.env.DECK_IMAGE_CODE_ENCODING === 'base64' ? 'base64' : 'plain';
  const field = process.env.DECK_IMAGE_CODE_FIELD || 'deck_code';
  const deckCode = encoding === 'base64' ? encodeDeckCode(code) : code.trim();

  return {
    [field]: deckCode,
    ...(encoding === 'base64' ? { encoding: 'base64' } : {}),
  };
};

const findImageData = (data: DeckImageServiceResponse) => (
  data.imageData
    || data.image_data
    || data.imageBase64
    || data.image_base64
    || data.data?.imageData
    || data.data?.image_data
    || data.data?.imageBase64
    || data.data?.image_base64
);

const findImageUrl = (data: DeckImageServiceResponse) => (
  data.imageUrl
    || data.image_url
    || data.url
    || data.data?.imageUrl
    || data.data?.image_url
    || data.data?.url
);

const detectImageMime = (buffer: Buffer) => {
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
};

const normalizeImageData = (imageData: string) => {
  const trimmed = imageData.trim();
  const dataUriMatch = trimmed.match(/^data:([^;,]+)?(;base64)?,(.*)$/i);
  const base64 = dataUriMatch ? dataUriMatch[3] : trimmed;
  const buffer = Buffer.from(base64, 'base64');
  const mimeType = detectImageMime(buffer);

  return `data:${mimeType};base64,${base64}`;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(express.json());

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: { error: 'Too many requests. Please try again later.' },
  });

  app.post('/api/deck-image', apiLimiter, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'Deck code is required.' });
      }

      const serverUrl = process.env.DECK_IMAGE_SERVER_URL || '';
      if (!serverUrl) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return res.status(503).json({ error: 'Please configure DECK_IMAGE_SERVER_URL on the server.' });
      }

      if (process.env.DECK_IMAGE_ALLOW_INSECURE_TLS === 'true') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildDeckImageRequestBody(code)),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`Remote server error: ${response.status} ${errText.substring(0, 100)}`);
        return res.status(response.status).json({ error: `Deck image service returned ${response.status}.` });
      }

      const contentType = response.headers.get('content-type') || '';
      let imageBuffer: ArrayBuffer;
      let mimeType = 'image/png';

      if (contentType.includes('application/json')) {
        const text = await response.text();
        let data: DeckImageServiceResponse;
        try {
          data = JSON.parse(text) as DeckImageServiceResponse;
        } catch {
          console.error('Remote server returned invalid JSON:', text.substring(0, 100));
          return res.status(502).json({ error: 'Deck image service returned invalid JSON.' });
        }

        const imageData = findImageData(data);
        if (imageData) {
          return res.json({ imageData: normalizeImageData(imageData) });
        }

        const imageUrl = findImageUrl(data);
        if (!imageUrl) {
          return res.status(502).json({
            error: 'Deck image service did not return image data or an image URL.',
          });
        }

        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          return res.status(502).json({ error: 'Could not fetch the image URL returned by the deck image service.' });
        }

        mimeType = imageResponse.headers.get('content-type') || mimeType;
        imageBuffer = await imageResponse.arrayBuffer();
      } else if (contentType.includes('image/')) {
        mimeType = contentType;
        imageBuffer = await response.arrayBuffer();
      } else {
        const text = await response.text();
        console.error('Remote server returned unsupported Content-Type:', contentType, 'Preview:', text.substring(0, 100));
        return res.status(502).json({ error: `Deck image service returned unsupported content type: ${contentType}` });
      }

      const base64 = Buffer.from(imageBuffer).toString('base64');
      res.json({ imageData: `data:${mimeType};base64,${base64}` });
    } catch (err: any) {
      console.error('Deck image parse error:', err);
      res.status(500).json({ error: err.message || 'Internal server error.' });
    }
  });

  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    console.error('API Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error.',
      path: req.path,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const rootDir = path.resolve();
    const distPath = path.join(rootDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
