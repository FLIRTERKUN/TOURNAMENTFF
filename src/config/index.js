import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  botToken: process.env.BOT_TOKEN || '',
  botUsername: process.env.BOT_USERNAME || 'FreeFireTournamentBot',
  ownerTelegramId: process.env.OWNER_TELEGRAM_ID ? parseInt(process.env.OWNER_TELEGRAM_ID, 10) : 0,
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  webhookUrl: process.env.WEBHOOK_URL || '',
  webappUrl: process.env.WEBAPP_URL || 'https://ff-tournament.tgcloud.io',
  environment: process.env.NODE_ENV || 'development',
  isServerless: process.env.TG_CLOUD_SERVERLESS === 'true' || process.env.VERCEL === '1'
};
