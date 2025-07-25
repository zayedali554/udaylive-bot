const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const supabaseService = require('./supabase');
const sessionStorage = require('./session-storage');

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

// Store user interaction sessions for multi-step processes
const userSessions = new Map();

// Session states
const SESSION_STATES = {
  WAITING_EMAIL: 'waiting_email',
  WAITING_PASSWORD: 'waiting_password',
  WAITING_URL: 'waiting_url'
};

// Function to get admin credentials from session
async function getAdminCredentials(chatId) {
  try {
    const session = await sessionStorage.getSession(chatId);
    if (!session) {
      console.log('No session found for chatId:', chatId);
      throw new Error('No session found');
    }
    if (!session.email) {
      console.log('Session missing email for chatId:', chatId);
      throw new Error('Session missing email');
    }
    if (!session.password) {
      console.log('Session missing password for chatId:', chatId, '- User needs to login again after schema update');
      throw new Error('Session missing password - please login again');
    }
    return { email: session.email, password: session.password };
  } catch (error) {
    console.error('Error getting admin credentials:', error);
    return null;
  }
}

// Utility function to check if user is authenticated admin
async function isAdminAuthenticated(chatId) {
  try {
    return await sessionStorage.isAuthenticated(chatId);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

// Utility function to create inline keyboard
function createInlineKeyboard(buttons) {
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// Utility function to create reply keyboard
function createReplyKeyboard(buttons) {
  return {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: false
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

  // Create inline keyboard with Admin Login button
  const startKeyboard = createInlineKeyboard([
    [{ text: '🔑 Admin Login', callback_data: 'admin_login' }]
  ]);

  await bot.sendMessage(chatId, welcomeMessage, startKeyboard);
});

// Help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
🎦 *Genius Hub Admin Bot* 🤖

—————————————————————

🌍 *PUBLIC COMMANDS*

🚀 \`/start\` - Welcome message & quick access
❓ \`/help\` - Show this comprehensive help guide
📊 \`/status\` - Check platform status (video/chat)
🔗 \`/get_url\` - Get current video stream URL
📈 \`/get_stats\` - View platform statistics

—————————————————————

🔐 *ADMIN COMMANDS*

🔑 *Authentication:*
\`/login\` - Interactive step-by-step login
\`/login email password\` - Quick login format
🚪 \`/logout\` - End admin session

🎥 *Video Controls:*
🔴 \`/disable_video\` - Stop video streaming
🟢 \`/enable_video\` - Start video streaming
🔗 \`/change_url\` - Update video source URL

💬 *Chat Management:*
🔄 \`/toggle_chat\` - Enable/disable chat system
🗑️ \`/clear_messages\` - Clear all chat messages

—————————————————————

📝 *USAGE EXAMPLES:*

🔑 Login: \`/login admin@example.com mypassword\`
🔗 Change URL: \`/change_url https://stream.example.com/live.m3u8\`
📊 Check status: \`/status\`

—————————————————————

ℹ️ *IMPORTANT NOTES:*

• 🕒 Admin sessions last **24 hours**
• 🔐 Authentication required for all control commands
• 🔄 Changes take effect immediately on your platform
• 📱 Use reply keyboard buttons for easier access

—————————————————————

🚀 **Ready to get started?** Use \`/login\` to authenticate and access admin controls!
  `;

  await bot.sendMessage(chatId, helpMessage);
});

// Login command - Interactive step-by-step
bot.onText(/\/login$/, async (msg) => {
  const chatId = msg.chat.id;

  if (await isAdminAuthenticated(chatId)) {
    // Show admin menu since user is already authenticated
    const session = await sessionStorage.getSession(chatId);
    const adminKeyboard = createReplyKeyboard([
      [
        { text: '🔴 Disable Video' },
        { text: '🟢 Enable Video' }
      ],
      [
        { text: '🔗 Change URL' },
        { text: '💬 Toggle Chat' }
      ],
      [
        { text: '🗑️ Clear Messages' },
        { text: '📊 Platform Status' }
      ],
      [
        { text: '📈 Statistics' },
        { text: '🔗 Get Video URL' }
      ],
      [
        { text: '🚪 Logout' }
      ]
    ]);
    
    await bot.sendMessage(chatId, `✅ *Welcome back, Admin!*\n\nYou are already logged in as: ${session.email}\n\n👇 *Choose an admin action:*`, adminKeyboard);
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

  if (await isAdminAuthenticated(chatId)) {
    // Show admin menu since user is already authenticated
    const session = await sessionStorage.getSession(chatId);
    const adminKeyboard = createReplyKeyboard([
      [
        { text: '🔴 Disable Video' },
        { text: '🟢 Enable Video' }
      ],
      [
        { text: '🔗 Change URL' },
        { text: '💬 Toggle Chat' }
      ],
      [
        { text: '🗑️ Clear Messages' },
        { text: '📊 Platform Status' }
      ],
      [
        { text: '📈 Statistics' },
        { text: '🔗 Get Video URL' }
      ],
      [
        { text: '🚪 Logout' }
      ]
    ]);
    
    await bot.sendMessage(chatId, `✅ *Welcome back, Admin!*\n\nYou are already logged in as: ${session.email}\n\n👇 *Choose an admin action:*`, adminKeyboard);
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
      // Store session with email and password for persistent admin operations
      await sessionStorage.setSession(chatId, email, password);
      userSessions.delete(chatId); // Clear any pending session
      console.log('Admin login successful for chatId:', chatId, 'Email:', email);
      
      // Create admin keyboard with buttons
      const adminKeyboard = createReplyKeyboard([
        [
          { text: '🔴 Disable Video' },
          { text: '🟢 Enable Video' }
        ],
        [
          { text: '🔗 Change URL' },
          { text: '💬 Toggle Chat' }
        ],
        [
          { text: '🗑️ Clear Messages' },
          { text: '📊 Platform Status' }
        ],
        [
          { text: '📈 Statistics' },
          { text: '🔗 Get Video URL' }
        ],
        [
          { text: '🚪 Logout' }
        ]
      ]);
      
      bot.sendMessage(chatId, '✅ *Login successful!*\n\nYou are now authenticated as admin.\n🕒 *Session valid for 24 hours*\n\n👇 *Choose an admin action:*', adminKeyboard);
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
  
  const session = adminSessions.get(chatId);
  if (session) {
    adminSessions.delete(chatId);
    userSessions.delete(chatId); // Clear any pending interactive sessions
    supabaseService.clearAdminCredentials(); // Clear stored credentials
    await bot.sendMessage(chatId, `👋 Logged out successfully!\n\nSession ended for: ${session.email}\n\nYou no longer have admin access. Use /login to authenticate again.`);
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

  if (!(await isAdminAuthenticated(chatId))) {
    console.log('User not authenticated, sending auth required message');
    await bot.sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
    return;
  }

  console.log('User authenticated, proceeding with disable video');
  try {
    console.log('Attempting to disable video streaming...');
    const credentials = await getAdminCredentials(chatId);
    if (!credentials) {
      await bot.sendMessage(chatId, '🔄 *Session update required.*\n\nPlease login again with /login to refresh your admin session.', { parse_mode: 'Markdown' });
      return;
    }
    const success = await supabaseService.updateVideoLiveStatus(false, credentials);
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

  if (!(await isAdminAuthenticated(chatId))) {
    console.log('User not authenticated, sending auth required message');
    await bot.sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
    return;
  }

  try {
    console.log('Attempting to enable video streaming...');
    const credentials = await getAdminCredentials(chatId);
    if (!credentials) {
      await bot.sendMessage(chatId, '🔄 *Session update required.*\n\nPlease login again with /login to refresh your admin session.', { parse_mode: 'Markdown' });
      return;
    }
    const success = await supabaseService.updateVideoLiveStatus(true, credentials);
    
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

  if (!(await isAdminAuthenticated(chatId))) {
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

  if (!(await isAdminAuthenticated(chatId))) {
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
    console.log('Attempting URL change to:', newUrl);
    const credentials = await getAdminCredentials(chatId);
    if (!credentials) {
      await bot.sendMessage(chatId, '🔄 *Session update required.*\n\nPlease login again with /login to refresh your admin session.', { parse_mode: 'Markdown' });
      return;
    }
    const success = await supabaseService.updateVideoSource(newUrl, credentials);
    
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

  if (!(await isAdminAuthenticated(chatId))) {
    console.log('User not authenticated, sending auth required message');
    await bot.sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
    return;
  }

  try {
    console.log('Attempting to clear all messages...');
    const credentials = await getAdminCredentials(chatId);
    if (!credentials) {
      await bot.sendMessage(chatId, '🔄 *Session update required.*\n\nPlease login again with /login to refresh your admin session.', { parse_mode: 'Markdown' });
      return;
    }
    const success = await supabaseService.clearMessages(credentials);
    console.log('Clear messages result:', success);
    
    if (success) {
      await bot.sendMessage(chatId, '🗑️ *All messages cleared successfully!*\n\nThe chat history has been deleted.', { parse_mode: 'Markdown' });
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

  if (!(await isAdminAuthenticated(chatId))) {
    console.log('User not authenticated, sending auth required message');
    await bot.sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
    return;
  }

  try {
    console.log('Attempting to toggle chat status...');
    const credentials = await getAdminCredentials(chatId);
    if (!credentials) {
      await bot.sendMessage(chatId, '🔄 *Session update required.*\n\nPlease login again with /login to refresh your admin session.', { parse_mode: 'Markdown' });
      return;
    }
    const currentStatus = await supabaseService.getChatStatus();
    const newStatus = !currentStatus;
    const success = await supabaseService.updateChatStatus(newStatus, credentials);
    
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
  } else if (data === 'admin_login') {
    fakeMsg.text = '/login';
    bot.emit('text', fakeMsg);
  }
});

// Error handling
// Handle reply keyboard button presses
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Skip if it's a command (starts with /)
  if (text && text.startsWith('/')) {
    return;
  }
  
  // Handle reply keyboard buttons
  if (text) {
    switch (text) {
      case '🔴 Disable Video':
        // Create fake message to trigger existing handler
        const disableMsg = { chat: { id: chatId }, text: '/disable_video', from: msg.from };
        bot.emit('text', disableMsg);
        break;
        
      case '🟢 Enable Video':
        const enableMsg = { chat: { id: chatId }, text: '/enable_video', from: msg.from };
        bot.emit('text', enableMsg);
        break;
        
      case '🔗 Change URL':
        const changeUrlMsg = { chat: { id: chatId }, text: '/change_url', from: msg.from };
        bot.emit('text', changeUrlMsg);
        break;
        
      case '💬 Toggle Chat':
        const toggleChatMsg = { chat: { id: chatId }, text: '/toggle_chat', from: msg.from };
        bot.emit('text', toggleChatMsg);
        break;
        
      case '🗑️ Clear Messages':
        const clearMsg = { chat: { id: chatId }, text: '/clear_messages', from: msg.from };
        bot.emit('text', clearMsg);
        break;
        
      case '📊 Platform Status':
        const statusMsg = { chat: { id: chatId }, text: '/status', from: msg.from };
        bot.emit('text', statusMsg);
        break;
        
      case '📈 Statistics':
        const statsMsg = { chat: { id: chatId }, text: '/get_stats', from: msg.from };
        bot.emit('text', statsMsg);
        break;
        
      case '🔗 Get Video URL':
        const getUrlMsg = { chat: { id: chatId }, text: '/get_url', from: msg.from };
        bot.emit('text', getUrlMsg);
        break;
        
      case '🚪 Logout':
        const logoutMsg = { chat: { id: chatId }, text: '/logout', from: msg.from };
        bot.emit('text', logoutMsg);
        break;
        
      default:
        // Handle multi-step processes (email/password input)
        const session = userSessions.get(chatId);
        if (session) {
          if (session.state === SESSION_STATES.WAITING_EMAIL) {
            // Store email and ask for password
            session.email = text;
            session.state = SESSION_STATES.WAITING_PASSWORD;
            userSessions.set(chatId, session);
            await bot.sendMessage(chatId, '🔑 Please enter your password:');
          } else if (session.state === SESSION_STATES.WAITING_PASSWORD) {
            // Perform login with stored email and entered password
            const email = session.email;
            const password = text;
            userSessions.delete(chatId); // Clear session
            await performLogin(chatId, email, password);
          } else if (session.state === SESSION_STATES.WAITING_URL) {
            // Perform URL change
            const newUrl = text;
            userSessions.delete(chatId); // Clear session
            await performUrlChange(chatId, newUrl);
          }
        }
        break;
    }
  }
});

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
