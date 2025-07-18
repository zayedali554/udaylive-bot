const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const supabaseService = require('./supabase');

// Initialize bot
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// Set bot commands menu
bot.setMyCommands([
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

// Store authenticated admin sessions
const adminSessions = new Set();

// Store user interaction sessions for multi-step processes
const userSessions = new Map();

// Session states
const SESSION_STATES = {
  WAITING_EMAIL: 'waiting_email',
  WAITING_PASSWORD: 'waiting_password',
  WAITING_URL: 'waiting_url'
};

// Utility function to check if user is authenticated admin
function isAdminAuthenticated(chatId) {
  return adminSessions.has(chatId);
}

// Utility function to create inline keyboard
function createInlineKeyboard(buttons) {
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🎬 *Welcome to Genius Hub Admin Bot!*

This bot allows you to control your video streaming platform remotely.

*Available Commands:*
/help - Show all commands
/login - Authenticate as admin
/status - Check platform status
/get_url - Get current video URL
/get_stats - Get platform statistics

*Admin Commands (after login):*
/disablevideo or /disable_video - Disable video streaming
/enablevideo or /enable_video - Enable video streaming  
/changeurl or /change_url - Change video source URL
/togglechat or /toggle_chat - Toggle chat on/off
/logout - Logout from admin session

🔐 Use /login to authenticate and access admin features.
  `;

  await bot.sendMessage(chatId, welcomeMessage);
});

// Help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
📋 *Genius Hub Admin Bot Commands*

*Public Commands:*
/start - Welcome message
/help - Show this help
/status - Check platform status
/get_url - Get current video URL
/get_stats - Get platform statistics

*Admin Commands:* (Requires authentication)
/login <email> <password> - Authenticate as admin
/disablevideo or /disable_video - Disable video streaming
/enablevideo or /enable_video - Enable video streaming
/changeurl or /change_url <url> - Change video source URL
/togglechat or /toggle_chat - Toggle chat on/off
/logout - Logout from admin session

*Usage Examples:*
\`/changeurl https://example.com/video.m3u8\`
\`/change_url https://example.com/video.m3u8\`
\`/login admin@example.com yourpassword\`

🔐 Admin authentication required for control commands.
  `;

  await bot.sendMessage(chatId, helpMessage);
});

// Login command - Interactive step-by-step
bot.onText(/\/login$/, async (msg) => {
  const chatId = msg.chat.id;

  if (isAdminAuthenticated(chatId)) {
    await bot.sendMessage(chatId, '✅ You are already logged in as admin.\n\nUse /logout to end your session first.');
    return;
  }

  // Start login process
  userSessions.set(chatId, { state: SESSION_STATES.WAITING_EMAIL });
  await bot.sendMessage(chatId, '🔑 Admin Login Process\n\nPlease enter your email address:');
});

// Handle legacy login format (backward compatibility)
bot.onText(/\/login\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1];

  if (isAdminAuthenticated(chatId)) {
    await bot.sendMessage(chatId, '✅ You are already logged in as admin.\n\nUse /logout to end your session first.');
    return;
  }

  const parts = args.split(' ');
  if (parts.length < 2) {
    await bot.sendMessage(chatId, '❌ Invalid format.\n\nPlease use /login for step-by-step login or /login <email> <password> for quick login.');
    return;
  }

  const email = parts[0];
  const password = parts.slice(1).join(' ');

  await performLogin(chatId, email, password);
});

// Function to perform login
async function performLogin(chatId, email, password) {
  try {
    const authResult = await supabaseService.checkAdminAuth(email, password);
    
    if (authResult.success) {
      adminSessions.add(chatId);
      userSessions.delete(chatId); // Clear any pending session
      console.log('Admin login successful for chatId:', chatId);
      console.log('Admin sessions after login:', Array.from(adminSessions));
      bot.sendMessage(chatId, '✅ Admin login successful!\n\nYou now have access to admin commands:\n• /disablevideo or /disable_video - Disable video streaming\n• /enablevideo or /enable_video - Enable video streaming\n• /changeurl or /change_url - Change video source\n• /togglechat or /toggle_chat - Toggle chat system\n• /logout - End admin session');
    } else {
      console.log('Admin login failed for chatId:', chatId, 'Error:', authResult.error);
      bot.sendMessage(chatId, `❌ Authentication failed\n\n${authResult.error || 'Invalid credentials'}. Please try again with /login.`);
    }
  } catch (error) {
    console.error('Login error:', error);
    await bot.sendMessage(chatId, '🔥 Login error occurred.\n\nPlease try again later.');
  }
}

// Test command for debugging
bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id;
  console.log('Test command received from chatId:', chatId);
  await bot.sendMessage(chatId, '✅ Test command working!');
});

// Logout command
bot.onText(/\/logout/, async (msg) => {
  const chatId = msg.chat.id;
  console.log('Logout command received from chatId:', chatId);
  
  if (adminSessions.has(chatId)) {
    adminSessions.delete(chatId);
    userSessions.delete(chatId); // Clear any pending interactive sessions
    supabaseService.clearAdminCredentials(); // Clear stored credentials
    await bot.sendMessage(chatId, '👋 Logged out successfully!\n\nYou no longer have admin access. Use /login to authenticate again.');
  } else {
    await bot.sendMessage(chatId, '❌ You are not logged in.\n\nUse /login to authenticate first.');
  }
});

// Status command (public)
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const videoLiveStatus = await supabaseService.getVideoLiveStatus();
    const chatStatus = await supabaseService.getChatStatus();
    const currentUrl = await supabaseService.getVideoSource();

    const statusMessage = `
📊 *Platform Status*

🎥 *Video Streaming:* ${videoLiveStatus ? '🟢 Enabled' : '🔴 Disabled'}
💬 *Chat System:* ${chatStatus ? '🟢 Enabled' : '🔴 Disabled'}
🔗 *Current URL:* ${currentUrl ? '✅ Set' : '❌ Not Set'}

⏰ *Last Updated:* ${new Date().toLocaleString()}
    `;

    await bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Status error:', error);
    await bot.sendMessage(chatId, '🔥 *Error fetching platform status.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
  }
});

// Get current URL command (public)
bot.onText(/\/get_url/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const currentUrl = await supabaseService.getVideoSource();
    
    if (currentUrl) {
      await bot.sendMessage(chatId, `🔗 *Current Video URL:*\n\n\`${currentUrl}\``, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, '❌ *No video URL is currently set.*', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Get URL error:', error);
    await bot.sendMessage(chatId, '🔥 *Error fetching video URL.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
  }
});

// Get platform statistics (public)
bot.onText(/\/get_stats/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const stats = await supabaseService.getPlatformStats();
    
    const statsMessage = `
📈 *Platform Statistics*

💬 *Total Messages:* ${stats.totalMessages}
👥 *Unique Users:* ${stats.uniqueUsers}
⏰ *Last Updated:* ${new Date(stats.timestamp).toLocaleString()}

📊 *System Health:* 🟢 Online
    `;

    await bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Get stats error:', error);
    await bot.sendMessage(chatId, '🔥 *Error fetching platform statistics.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
  }
});

// Disable video command (admin only)
bot.onText(/\/disable_?video/, async (msg) => {
  const chatId = msg.chat.id;
  console.log('Disable video command received from chatId:', chatId);
  console.log('Admin sessions:', Array.from(adminSessions));
  console.log('Is admin authenticated:', isAdminAuthenticated(chatId));

  if (!isAdminAuthenticated(chatId)) {
    console.log('User not authenticated, sending auth required message');
    await bot.sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
    return;
  }

  console.log('User authenticated, proceeding with disable video');
  try {
    const success = await supabaseService.updateVideoLiveStatus(false);
    console.log('Update video live status result:', success);
    
    if (success) {
      await bot.sendMessage(chatId, '🔴 *Video streaming disabled successfully!*\n\nUsers will no longer be able to watch the video stream.', { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, '❌ *Failed to disable video streaming.*\n\nPlease try again.', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Disable video error:', error);
    await bot.sendMessage(chatId, '🔥 *Error disabling video streaming.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
  }
});

// Enable video command (admin only)
bot.onText(/\/enable_?video/, async (msg) => {
  const chatId = msg.chat.id;
  console.log('Enable video command received from chatId:', chatId);
  console.log('Is admin authenticated:', isAdminAuthenticated(chatId));

  if (!isAdminAuthenticated(chatId)) {
    console.log('User not authenticated, sending auth required message');
    await bot.sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
    return;
  }

  try {
    const success = await supabaseService.updateVideoLiveStatus(true);
    
    if (success) {
      await bot.sendMessage(chatId, '🟢 *Video streaming enabled successfully!*\n\nUsers can now watch the video stream.', { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, '❌ *Failed to enable video streaming.*\n\nPlease try again.', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Enable video error:', error);
    await bot.sendMessage(chatId, '🔥 *Error enabling video streaming.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
  }
});

// Change URL command - Interactive step-by-step (admin only)
bot.onText(/\/change_?url$/, async (msg) => {
  const chatId = msg.chat.id;
  console.log('Change URL command received from chatId:', chatId);
  console.log('Is admin authenticated:', isAdminAuthenticated(chatId));

  if (!isAdminAuthenticated(chatId)) {
    console.log('User not authenticated, sending auth required message');
    await bot.sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
    return;
  }

  // Start URL change process
  userSessions.set(chatId, { state: SESSION_STATES.WAITING_URL });
  await bot.sendMessage(chatId, '🔗 *Change Video URL*\n\nPlease enter the new video URL:\n\nℹ️ *URL must start with http:// or https://*', { parse_mode: 'Markdown' });
});

// Handle legacy change URL format (backward compatibility)
bot.onText(/\/change_?url\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const newUrl = match[1];
  console.log('Change URL command received from chatId:', chatId, 'New URL:', newUrl);
  console.log('Is admin authenticated:', isAdminAuthenticated(chatId));

  if (!isAdminAuthenticated(chatId)) {
    console.log('User not authenticated, sending auth required message');
    await bot.sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
    return;
  }

  await performUrlChange(chatId, newUrl);
});

// Function to perform URL change
async function performUrlChange(chatId, newUrl) {
  // Basic URL validation
  if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
    await bot.sendMessage(chatId, '❌ *Invalid URL format.*\n\nURL must start with http:// or https://\n\nPlease try again with /changeurl', { parse_mode: 'Markdown' });
    return;
  }

  try {
    const success = await supabaseService.updateVideoSource(newUrl);
    
    if (success) {
      userSessions.delete(chatId); // Clear any pending session
      await bot.sendMessage(chatId, `🔗 *Video URL updated successfully!*\n\n*New URL:* \`${newUrl}\`\n\nThe change will take effect immediately for all users.`, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, '❌ *Failed to update video URL.*\n\nPlease try again with /changeurl', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Change URL error:', error);
    await bot.sendMessage(chatId, '🔥 *Error updating video URL.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
  }
}

// Clear messages command (admin only)
bot.onText(/\/clear_?messages/, async (msg) => {
  const chatId = msg.chat.id;
  console.log('Clear messages command received from chatId:', chatId);
  console.log('Is admin authenticated:', isAdminAuthenticated(chatId));

  if (!isAdminAuthenticated(chatId)) {
    console.log('User not authenticated, sending auth required message');
    await bot.sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
    return;
  }

  try {
    console.log('Attempting to clear all messages...');
    const success = await supabaseService.clearMessages();
    console.log('Clear messages result:', success);
    
    if (success) {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔴 Disable Video', callback_data: 'disable_video' },
            { text: '🟢 Enable Video', callback_data: 'enable_video' }
          ],
          [
            { text: '💬 Toggle Chat', callback_data: 'toggle_chat' },
            { text: '🗑️ Clear Messages', callback_data: 'clear_messages' }
          ],
          [
            { text: '📊 Get Stats', callback_data: 'get_stats' },
            { text: '🔗 Change URL', callback_data: 'change_url' }
          ]
        ]
      };
      await bot.sendMessage(chatId, '🗑️ *All messages cleared successfully!*\n\nThe chat history has been deleted.', { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      console.error('Failed to clear messages - supabase operation returned false');
      await bot.sendMessage(chatId, '❌ *Failed to clear messages.*\n\nPlease try again.', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Clear messages error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    await bot.sendMessage(chatId, '🔥 *Error clearing messages.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
  }
});

// Toggle chat command (admin only)
bot.onText(/\/toggle_?chat/, async (msg) => {
  const chatId = msg.chat.id;
  console.log('Toggle chat command received from chatId:', chatId);
  console.log('Is admin authenticated:', isAdminAuthenticated(chatId));

  if (!isAdminAuthenticated(chatId)) {
    console.log('User not authenticated, sending auth required message');
    await bot.sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
    return;
  }

  try {
    const currentStatus = await supabaseService.getChatStatus();
    const newStatus = !currentStatus;
    const success = await supabaseService.updateChatStatus(newStatus);
    
    if (success) {
      const statusText = newStatus ? '🟢 Enabled' : '🔴 Disabled';
      await bot.sendMessage(chatId, `💬 Chat system ${statusText.toLowerCase()} successfully!\n\nStatus: ${statusText}`);
    } else {
      await bot.sendMessage(chatId, '❌ Failed to toggle chat status.\n\nPlease try again.');
    }
  } catch (error) {
    console.error('Toggle chat error:', error);
    await bot.sendMessage(chatId, '🔥 Error toggling chat status.\n\nPlease try again later.');
  }
});



// Handle interactive sessions for multi-step processes
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Debug: Log all messages received
  console.log('Message received:', {
    chatId: msg.chat.id,
    text: msg.text,
    from: msg.from.username || msg.from.first_name
  });
  
  // Skip if message is a command (starts with /)
  if (text && text.startsWith('/')) {
    return;
  }
  
  // Check if user has an active session
  const session = userSessions.get(chatId);
  if (!session) {
    return;
  }
  
  // Handle different session states
  switch (session.state) {
    case SESSION_STATES.WAITING_EMAIL:
      if (!text || !text.includes('@')) {
        await bot.sendMessage(chatId, '❌ *Invalid email format.*\n\nPlease enter a valid email address:', { parse_mode: 'Markdown' });
        return;
      }
      
      // Store email and ask for password
      session.email = text.trim();
      session.state = SESSION_STATES.WAITING_PASSWORD;
      userSessions.set(chatId, session);
      await bot.sendMessage(chatId, '🔐 *Email received!*\n\nNow please enter your password:', { parse_mode: 'Markdown' });
      break;
      
    case SESSION_STATES.WAITING_PASSWORD:
      if (!text || text.trim().length === 0) {
        await bot.sendMessage(chatId, '❌ *Password cannot be empty.*\n\nPlease enter your password:', { parse_mode: 'Markdown' });
        return;
      }
      
      // Perform login with stored email and received password
      const email = session.email;
      const password = text.trim();
      userSessions.delete(chatId); // Clear session before login attempt
      await performLogin(chatId, email, password);
      break;
      
    case SESSION_STATES.WAITING_URL:
      if (!text || text.trim().length === 0) {
        await bot.sendMessage(chatId, '❌ *URL cannot be empty.*\n\nPlease enter a valid URL:', { parse_mode: 'Markdown' });
        return;
      }
      
      // Perform URL change
      const newUrl = text.trim();
      userSessions.delete(chatId); // Clear session before URL change attempt
      await performUrlChange(chatId, newUrl);
      break;
      
    default:
      // Unknown state, clear session
      userSessions.delete(chatId);
      break;
  }
});

// Handle callback queries (inline keyboard button clicks)
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  console.log('Callback query received:', {
    chatId: chatId,
    data: data,
    from: callbackQuery.from.username || callbackQuery.from.first_name
  });
  
  // Answer the callback query to remove loading state
  await bot.answerCallbackQuery(callbackQuery.id);
  
  // Create a fake message object to reuse existing command handlers
  const fakeMsg = {
    chat: { id: chatId },
    text: '/' + data,
    from: callbackQuery.from
  };
  
  // Handle the callback data as a command by triggering the appropriate regex handlers
  if (data === 'disable_video') {
    fakeMsg.text = '/disable_video';
    bot.emit('text', fakeMsg);
  } else if (data === 'enable_video') {
    fakeMsg.text = '/enable_video';
    bot.emit('text', fakeMsg);
  } else if (data === 'toggle_chat') {
    fakeMsg.text = '/toggle_chat';
    bot.emit('text', fakeMsg);
  } else if (data === 'clear_messages') {
    fakeMsg.text = '/clear_messages';
    bot.emit('text', fakeMsg);
  } else if (data === 'get_stats') {
    fakeMsg.text = '/get_stats';
    bot.emit('text', fakeMsg);
  } else if (data === 'change_url') {
    fakeMsg.text = '/change_url';
    bot.emit('text', fakeMsg);
  }
});

// Error handling
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Start message
console.log('🤖 Genius Hub Telegram Bot started successfully!');
console.log('📱 Bot is now listening for commands...');
console.log('🔗 Bot Token:', config.BOT_TOKEN.substring(0, 20) + '...');
console.log('🗄️ Connected to Supabase:', config.SUPABASE_URL);
