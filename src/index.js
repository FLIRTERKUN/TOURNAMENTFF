import express from 'express';
import { config } from './config/index.js';
import { apiRouter } from './services/apiRouter.js';
import { initBot, handleBotWebhookUpdate } from './bot/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Security and CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-telegram-init-data, x-mock-telegram-id, x-mock-first-name');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'freefire-tournament-platform'
  });
});

// Telegram Bot Webhook endpoint (compatible with TG Cloud Serverless)
app.post('/api/webhook/telegram', express.json(), async (req, res) => {
  try {
    await handleBotWebhookUpdate(req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).send('ERROR_HANDLED');
  }
});

// REST API
app.use('/api', apiRouter);

// Serve static frontend in production if built
const webappDistPath = path.join(__dirname, '../webapp/dist');
app.use(express.static(webappDistPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(webappDistPath, 'index.html'), err => {
    if (err) {
      res.status(200).send('Free Fire Tournament Mini App API is running.');
    }
  });
});

// Start server if not running as serverless function
if (process.env.NODE_ENV !== 'test' && !config.isServerless) {
  const bot = initBot();
  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    if (bot && !config.webhookUrl) {
      // Long-polling mode for local development
      bot.start({
        onStart: botInfo => {
          console.log(`Bot @${botInfo.username} started successfully with polling`);
        }
      }).catch(err => {
        console.warn('Bot polling start warning:', err.message);
      });
    }
  });
}

export default app;
