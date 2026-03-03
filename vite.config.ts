import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import sharp from 'sharp';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react({
        babel: {
          plugins: [
            'babel-plugin-react-compiler',
          ],
        },
      }),
      {
        name: 'bgg-api-middleware',
        configureServer(server) {
          // Handle /api/bgg/search
          server.middlewares.use('/api/bgg/search', async (req, res) => {
            try {
              const url = new URL(req.url || '', 'http://localhost');
              const query = url.searchParams.get('q');
              console.log('[BGG Search] Query:', query);
              console.log('[BGG Search] API Key exists:', !!env.BGG_API_KEY);
              
              // Pass env to handler via req
              // @ts-expect-error - adding custom property
              req.bggApiKey = env.BGG_API_KEY;
              
              // @ts-expect-error - no types for JS module
              const { default: handler } = await import('./api/bgg/search.js');
              await handler(req, res);
            } catch (err) {
              console.error('[BGG Search] Error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal server error', details: String(err) }));
            }
          });

          // Handle /api/bgg/details
          server.middlewares.use('/api/bgg/details', async (req, res) => {
            try {
              const url = new URL(req.url || '', 'http://localhost');
              const ids = url.searchParams.get('ids');
              console.log('[BGG Details] IDs:', ids);
              console.log('[BGG Details] API Key exists:', !!env.BGG_API_KEY);
              
              // Pass env to handler via req
              // @ts-expect-error - adding custom property
              req.bggApiKey = env.BGG_API_KEY;
              
              // @ts-expect-error - no types for JS module
              const { default: handler } = await import('./api/bgg/details.js');
              await handler(req, res);
            } catch (err) {
              console.error('[BGG Details] Error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal server error', details: String(err) }));
            }
          });
        },
      },
      {
        name: 'image-convert-middleware',
        configureServer(server) {
          server.middlewares.use('/img/convert', async (req, res) => {
            try {
              const urlObj = new URL(req.url || '', 'http://localhost');
              const src = urlObj.searchParams.get('url') || '';
              if (!src) {
                res.statusCode = 400;
                res.end('Missing url');
                return;
              }

              const response = await fetch(src);
              if (!response.ok) {
                res.statusCode = 400;
                res.end('Failed to fetch source image');
                return;
              }
              const buffer = Buffer.from(await response.arrayBuffer());

              // Resize so that the longer side is 500px, preserve aspect, no upscaling
              const image = sharp(buffer);
              const metadata = await image.metadata();
              const width = metadata.width || 0;
              const height = metadata.height || 0;
              const longerSide = Math.max(width, height);
              const scale = longerSide > 0 ? Math.min(500 / longerSide, 1) : 1;
              const targetWidth = Math.round(width * scale) || undefined;
              const targetHeight = Math.round(height * scale) || undefined;

              const output = await image
                .resize({
                  width: targetWidth,
                  height: targetHeight,
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .png({ compressionLevel: 9, palette: true, effort: 6 })
                .toBuffer();

              res.setHeader('Content-Type', 'image/png');
              res.setHeader('Cache-Control', 'no-store');
              res.end(output);
            } catch (err) {
              res.statusCode = 500;
              res.end(`Error converting image: ${err}`);
            }
          });
        },
      },
    ],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/img/api': {
          target: 'https://cf.geekdo-images.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/img\/api/, ''),
        },
      },
    },
  };
});
