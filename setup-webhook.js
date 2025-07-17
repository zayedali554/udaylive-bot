const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

const bot = new TelegramBot(config.BOT_TOKEN);

async function setupWebhook() {
  const webhookUrl = process.argv[2];
  
  if (!webhookUrl) {
    console.error('Please provide webhook URL as argument');
    console.log('Usage: node setup-webhook.js https://your-vercel-app.vercel.app/api/webhook');
    process.exit(1);
  }

  try {
    // Set webhook
    await bot.setWebHook(webhookUrl);
    console.log('✅ Webhook set successfully:', webhookUrl);
    
    // Set bot commands menu
    await bot.setMyCommands([
      { command: 'start', description: 'Welcome message and bot info' },
      { command: 'help', description: 'Show all available commands' },
      { command: 'login', description: 'Authenticate as admin' },
      { command: 'status', description: 'Check platform status' },
      { command: 'get_url', description: 'Get current video URL' },
      { command: 'get_stats', description: 'Get platform statistics' },
      { command: 'disablevideo', description: 'Disable video streaming (admin)' },
      { command: 'enablevideo', description: 'Enable video streaming (admin)' },
      { command: 'changeurl', description: 'Change video source URL (admin)' },
      { command: 'togglechat', description: 'Toggle chat on/off (admin)' },
      { command: 'logout', description: 'Logout from admin session' }
    ]);
    console.log('✅ Bot commands menu set successfully');
    
    // Get webhook info
    const webhookInfo = await bot.getWebHookInfo();
    console.log('📋 Webhook info:', webhookInfo);
    
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
  }
}

setupWebhook();
