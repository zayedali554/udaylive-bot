module.exports = {
  // Telegram Bot Configuration
  BOT_TOKEN: process.env.BOT_TOKEN,
  
  // Supabase Configuration - Using environment variables directly
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_ANON_KEY,
  
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
    TOGGLE_CHAT: '/toggle_chat',
    GET_STATS: '/get_stats'
  }
};
