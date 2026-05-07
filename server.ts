import express from 'express';
import { createServer as createViteServer } from 'vite';
import rateLimit from 'express-rate-limit';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);

  app.use(express.json());

  // 设置防 DDOS 限流防御
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 requests per minute
    standardHeaders: true, 
    legacyHeaders: false, 
    validate: { xForwardedForHeader: false },
    message: { error: '请求过于频繁，请稍后再试' }
  });

  app.post('/api/deck-image', apiLimiter, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: '卡组码不能为空' });
      }

      // 配置你自己的目标服务器 URL，防止前端泄露
      const SERVER_URL = process.env.DECK_IMAGE_SERVER_URL || '';
      
      if (!SERVER_URL) {
        // 如果后端还没配服务器地址，先用占位响应或报错
        // 这里模拟了一下等待时间
        await new Promise(resolve => setTimeout(resolve, 800));
        return res.status(503).json({ error: '请在服务端（.env）配置 DECK_IMAGE_SERVER_URL' });
      }

      // 请求隐蔽在后端发出，避免被抓包
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });
      
      if (!response.ok) {
        let errText = await response.text().catch(() => '');
        console.error(`Remote server error: ${response.status} ${errText.substring(0, 100)}`);
        return res.status(response.status).json({ error: `解析服务器返回错误状态: ${response.status}` });
      }
      
      const contentType = response.headers.get('content-type') || '';
      let imageBuffer: ArrayBuffer;
      let mimeType = 'image/png'; // 默认格式

      if (contentType.includes('application/json')) {
        let text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Remote server returned invalid JSON:', text.substring(0, 100));
          return res.status(502).json({ error: '解析服务器返回了无效的JSON格式' });
        }

        if (data.imageUrl) {
           // 目标服务器返回了图片链接，在后端代为请求获取二进制数据
           const imgRes = await fetch(data.imageUrl);
           if (!imgRes.ok) {
             return res.status(502).json({ error: '无法获取解析服务器提供的图片地址' });
           }
           mimeType = imgRes.headers.get('content-type') || mimeType;
           imageBuffer = await imgRes.arrayBuffer();
        } else {
           return res.status(502).json({ error: '解析服务器未返回 imageUrl 字段' });
        }
      } else if (contentType.includes('image/')) {
        // 目标服务器直接返回了图片数据
        mimeType = contentType;
        imageBuffer = await response.arrayBuffer();
      } else {
        let text = await response.text();
        console.error('Remote server returned unsupported Content-Type:', contentType, 'Preview:', text.substring(0, 100));
        return res.status(502).json({ error: `解析服务器返回了不支持的内容类型: ${contentType}` });
      }

      const base64 = Buffer.from(imageBuffer).toString('base64');
      const dataUri = `data:${mimeType};base64,${base64}`;
      res.json({ imageData: dataUri });
    } catch (err: any) {
      console.error('Deck image parse error:', err);
      res.status(500).json({ error: err.message || '内部服务器错误' });
    }
  });

  // 针对 API 路由的专用 JSON 错误处理
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({ 
      error: err.message || '内部服务器错误',
      path: req.path
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const __dirname = path.resolve();
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
