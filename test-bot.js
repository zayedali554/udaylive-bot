const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

// Initialize bot
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

console.log('🤖 Test Bot started!');
console.log('📱 Bot Token:', config.BOT_TOKEN.substring(0, 20) + '...');

// Test command
bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id;
  console.log('Test command received from chatId:', chatId);
  await bot.sendMessage(chatId, '✅ Test command working!');
});

// Test admin command
bot.onText(/\/disable_video/, async (msg) => {
  const chatId = msg.chat.id;
  console.log('Disable video command received from chatId:', chatId);
  await bot.sendMessage(chatId, '🔴 Disable video command received!');
});

// Log all messages
bot.on('message', (msg) => {
  console.log('Message received:', {
    chatId: msg.chat.id,
    text: msg.text,
    from: msg.from.username || msg.from.first_name
  });
});

// Error handling
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});
