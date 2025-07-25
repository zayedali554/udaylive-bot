require('dotenv').config();

module.exports = {
  // Telegram Bot Configuration
  BOT_TOKEN: process.env.BOT_TOKEN,
  
  // Supabase Configuration (Same as main config.js)
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  
  // Admin Configuration
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  
  // Bot Settings
  BOT_NAME: 'Genius Hub Admin Bot',
  BOT_VERSION: '1.0.0',
  
  // Command Prefixes
  COMMANDS: {
    START: '/start',
    HELP: '/help',
    LOGIN: '/login',
    LOGOUT: '/logout',
    STATUS: '/status',
    DISABLE_VIDEO: '/disable_video',
    ENABLE_VIDEO: '/enable_video',
    CHANGE_URL: '/change_url',
    GET_URL: '/get_url',
    CLEAR_MESSAGES: '/clear_messages',
    TOGGLE_CHAT: '/toggle_chat',
    GET_STATS: '/get_stats'
  }
};
