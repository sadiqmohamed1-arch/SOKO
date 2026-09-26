import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { authRouter } from './src/server/auth.ts';
import { adminRouter } from './src/server/admin.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      platform: 'SOKO.ae B2B Procurement Network',
      environment: isProd ? 'production' : 'development',
      time: new Date().toISOString(),
    });
  });

  if (!isProd) {
    // Dynamic import vite for development mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log(`[Vite Dev Server] Middleware mounted`);
  } else {
    // Production: serve built static files from dist/
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn(`[Production] dist directory not found at ${distPath}`);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SOKO Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SOKO Server] Failed to start:', err);
  process.exit(1);
});
