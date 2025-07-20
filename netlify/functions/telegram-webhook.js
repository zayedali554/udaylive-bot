const config = require('../../config');
const supabaseService = require('../../supabase');

// Store authenticated admin sessions (in-memory for serverless)
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

// Utility function to create reply keyboard (appears below text input)
function createReplyKeyboard(buttons, oneTime = true) {
  return {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: oneTime,
      selective: true
    }
  };
}

// Utility function to remove keyboard
function removeKeyboard() {
  return {
    reply_markup: {
      remove_keyboard: true
    }
  };
}

// Function to send message to Telegram
async function sendMessage(chatId, text, options = {}) {
  const url = `https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: options.parse_mode || 'Markdown',
    ...options
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Function to perform login
async function performLogin(chatId, email, password) {
  try {
    console.log('Attempting login for email:', email);
    const result = await supabaseService.checkAdminAuth(email, password);
    
    if (result.success) {
      adminSessions.add(chatId);
      
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
          { text: '🚪 Logout' }
        ]
      ], false);
      
      await sendMessage(chatId, '✅ *Login successful!*\n\nYou are now authenticated as admin.\n\n👇 *Choose an admin action:*', adminKeyboard);
    } else {
      await sendMessage(chatId, `❌ *Login failed.*\n\n${result.error || 'Invalid credentials'}\n\nPlease try again with /login`, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Login error:', error);
    await sendMessage(chatId, '🔥 *Error during login.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
  }
}

// Function to perform URL change
async function performUrlChange(chatId, newUrl) {
  try {
    console.log('Attempting URL change to:', newUrl);
    const success = await supabaseService.updateVideoSource(newUrl);
    
    // Restore admin keyboard after URL change
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
        { text: '🚪 Logout' }
      ]
    ], false);
    
    if (success) {
      await sendMessage(chatId, `✅ *Video URL updated successfully!*\n\n🔗 *New URL:* ${newUrl}\n\nThe video source has been changed.`, { parse_mode: 'Markdown', ...adminKeyboard });
    } else {
      await sendMessage(chatId, '❌ *Failed to update video URL.*\n\nPlease try again.', { parse_mode: 'Markdown', ...adminKeyboard });
    }
  } catch (error) {
    console.error('URL change error:', error);
    await sendMessage(chatId, '🔥 *Error updating video URL.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
  }
}

// Handle different commands
async function handleCommand(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;
  const command = text.split(' ')[0].toLowerCase();

  console.log('Processing command:', command, 'from chatId:', chatId);

  // Handle reply keyboard button presses
  if (text && !text.startsWith('/')) {
    // Map button text to commands
    const buttonCommands = {
      '🔴 Disable Video': '/disable_video',
      '🟢 Enable Video': '/enable_video',
      '🔗 Change URL': '/change_url',
      '💬 Toggle Chat': '/toggle_chat',
      '🗑️ Clear Messages': '/clear_messages',
      '📊 Platform Status': '/status',
      '📈 Statistics': '/get_stats',
      '🚪 Logout': '/logout'
    };

    if (buttonCommands[text]) {
      // Create a fake message with the corresponding command
      const fakeMsg = {
        ...msg,
        text: buttonCommands[text]
      };
      return await handleCommand(fakeMsg);
    }
    
    // If not a button command, handle as interactive session
    return await handleInteractiveSession(msg);
  }

  switch (command) {
    case '/start':
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

      const startKeyboard = createReplyKeyboard([
        [{ text: '/login' }, { text: '/help' }],
        [{ text: '/status' }, { text: '/get_stats' }]
      ]);

      await sendMessage(chatId, welcomeMessage, startKeyboard);
      break;

    case '/help':
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
      const helpKeyboard = createReplyKeyboard([
        [{ text: '/login' }, { text: '/status' }],
        [{ text: '/get_stats' }, { text: '/start' }]
      ]);
      await sendMessage(chatId, helpMessage, helpKeyboard);
      break;

    case '/login':
      if (text.trim() === '/login') {
        // Interactive login
        if (isAdminAuthenticated(chatId)) {
          await sendMessage(chatId, '✅ You are already logged in as admin.\n\nUse /logout to end your session first.');
          return;
        }

        // Start login process
        userSessions.set(chatId, { state: SESSION_STATES.WAITING_EMAIL });
        const loginKeyboard = removeKeyboard();
        await sendMessage(chatId, '🔑 Admin Login Process\n\nPlease enter your email address:', loginKeyboard);
      } else {
        // Legacy login format
        if (isAdminAuthenticated(chatId)) {
          await sendMessage(chatId, '✅ You are already logged in as admin.\n\nUse /logout to end your session first.');
          return;
        }

        const args = text.substring(7).trim();
        const parts = args.split(' ');

        if (parts.length < 2) {
          await sendMessage(chatId, '❌ *Invalid login format.*\n\nUsage: `/login email password`\n\nExample: `/login admin@example.com yourpassword`', { parse_mode: 'Markdown' });
          return;
        }

        const email = parts[0];
        const password = parts.slice(1).join(' ');
        await performLogin(chatId, email, password);
      }
      break;

    case '/logout':
      if (isAdminAuthenticated(chatId)) {
        adminSessions.delete(chatId);
        const startKeyboard = createReplyKeyboard([
          [{ text: '/login' }, { text: '/help' }],
          [{ text: '/status' }, { text: '/get_stats' }]
        ]);
        await sendMessage(chatId, '👋 *Logged out successfully!*\n\nYou have been logged out from the admin session.', { parse_mode: 'Markdown', ...startKeyboard });
      } else {
        await sendMessage(chatId, '❌ *You are not logged in.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
      }
      break;

    case '/test':
      console.log('Test command received from chatId:', chatId);
      await sendMessage(chatId, '✅ Test command working!');
      break;

    case '/status':
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

        await sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Status error:', error);
        await sendMessage(chatId, '🔥 *Error fetching platform status.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
      }
      break;

    case '/get_url':
      try {
        const currentUrl = await supabaseService.getVideoSource();
        
        if (currentUrl) {
          await sendMessage(chatId, `🔗 *Current Video URL:*\n\n\`${currentUrl}\`\n\n📺 This is the active video source.`, { parse_mode: 'Markdown' });
        } else {
          await sendMessage(chatId, '❌ *No video URL configured.*\n\nUse /changeurl to set a video source.', { parse_mode: 'Markdown' });
        }
      } catch (error) {
        console.error('Get URL error:', error);
        await sendMessage(chatId, '🔥 *Error fetching video URL.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
      }
      break;

    case '/get_stats':
      try {
        const stats = await supabaseService.getPlatformStats();
        
        const statsMessage = `
📈 *Platform Statistics*

💬 *Total Messages:* ${stats.totalMessages}
👥 *Unique Users:* ${stats.uniqueUsers}
⏰ *Last Updated:* ${new Date(stats.timestamp).toLocaleString()}
📊 *System Health:* 🟢 Online
        `;

        await sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Get stats error:', error);
        await sendMessage(chatId, '🔥 *Error fetching platform statistics.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
      }
      break;

    case '/disable_video':
    case '/disablevideo':
      console.log('Disable video command received from chatId:', chatId);
      console.log('Admin sessions:', Array.from(adminSessions));

      if (!isAdminAuthenticated(chatId)) {
        console.log('User not authenticated, sending auth required message');
        await sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
        return;
      }

      try {
        console.log('Attempting to disable video streaming...');
        const success = await supabaseService.updateVideoLiveStatus(false);
        console.log('Disable video result:', success);
        
        if (success) {
          await sendMessage(chatId, '🔴 *Video streaming disabled successfully!*\n\nThe video stream is now offline.', { parse_mode: 'Markdown' });
        } else {
          console.error('Failed to disable video - supabase operation returned false');
          await sendMessage(chatId, '❌ *Failed to disable video streaming.*\n\nPlease try again.', { parse_mode: 'Markdown' });
        }
      } catch (error) {
        console.error('Disable video error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        await sendMessage(chatId, '🔥 *Error disabling video streaming.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
      }
      break;

    case '/enable_video':
    case '/enablevideo':
      console.log('Enable video command received from chatId:', chatId);
      console.log('Is admin authenticated:', isAdminAuthenticated(chatId));

      if (!isAdminAuthenticated(chatId)) {
        console.log('User not authenticated, sending auth required message');
        await sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
        return;
      }

      try {
        console.log('Attempting to enable video streaming...');
        const success = await supabaseService.updateVideoLiveStatus(true);
        console.log('Enable video result:', success);
        
        if (success) {
          await sendMessage(chatId, '🟢 *Video streaming enabled successfully!*\n\nThe video stream is now live.', { parse_mode: 'Markdown' });
        } else {
          console.error('Failed to enable video - supabase operation returned false');
          await sendMessage(chatId, '❌ *Failed to enable video streaming.*\n\nPlease try again.', { parse_mode: 'Markdown' });
        }
      } catch (error) {
        console.error('Enable video error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        await sendMessage(chatId, '🔥 *Error enabling video streaming.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
      }
      break;

    case '/change_url':
    case '/changeurl':
      console.log('Change URL command received from chatId:', chatId);
      console.log('Is admin authenticated:', isAdminAuthenticated(chatId));

      if (!isAdminAuthenticated(chatId)) {
        console.log('User not authenticated, sending auth required message');
        await sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
        return;
      }

      if (text.trim() === '/change_url' || text.trim() === '/changeurl') {
        // Interactive URL change
        userSessions.set(chatId, { state: SESSION_STATES.WAITING_URL });
        const urlKeyboard = removeKeyboard();
        await sendMessage(chatId, '🔗 *Change Video URL*\n\nPlease enter the new video URL:', { parse_mode: 'Markdown', ...urlKeyboard });
      } else {
        // Direct URL change
        const newUrl = text.substring(text.indexOf(' ') + 1).trim();
        if (!newUrl) {
          await sendMessage(chatId, '❌ *No URL provided.*\n\nUsage: `/changeurl <url>`\n\nExample: `/changeurl https://example.com/video.m3u8`', { parse_mode: 'Markdown' });
          return;
        }
        await performUrlChange(chatId, newUrl);
      }
      break;

    case '/clear_messages':
    case '/clearmessages':
      console.log('Clear messages command received from chatId:', chatId);
      
      if (!isAdminAuthenticated(chatId)) {
        console.log('User not authenticated, sending auth required message');
        await sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
        return;
      }

      try {
        console.log('Attempting to clear all messages...');
        const success = await supabaseService.clearMessages();
        console.log('Clear messages result:', success);
        
        if (success) {
          await sendMessage(chatId, '🗑️ *All messages cleared successfully!*\n\nThe chat history has been deleted.', { parse_mode: 'Markdown' });
        } else {
          console.error('Failed to clear messages - supabase operation returned false');
          await sendMessage(chatId, '❌ *Failed to clear messages.*\n\nPlease try again.', { parse_mode: 'Markdown' });
        }
      } catch (error) {
        console.error('Clear messages error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        await sendMessage(chatId, '🔥 *Error clearing messages.*\n\nPlease try again later.', { parse_mode: 'Markdown' });
      }
      break;

    case '/toggle_chat':
    case '/togglechat':
      console.log('Toggle chat command received from chatId:', chatId);
      console.log('Is admin authenticated:', isAdminAuthenticated(chatId));

      if (!isAdminAuthenticated(chatId)) {
        console.log('User not authenticated, sending auth required message');
        await sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
        return;
      }

      try {
        const currentStatus = await supabaseService.getChatStatus();
        const newStatus = !currentStatus;
        const success = await supabaseService.updateChatStatus(newStatus);
        
        if (success) {
          const statusText = newStatus ? '🟢 Enabled' : '🔴 Disabled';
          await sendMessage(chatId, `💬 Chat system ${statusText.toLowerCase()} successfully!\n\nStatus: ${statusText}`);
        } else {
          await sendMessage(chatId, '❌ Failed to toggle chat status.\n\nPlease try again.');
        }
      } catch (error) {
        console.error('Toggle chat error:', error);
        await sendMessage(chatId, '🔥 Error toggling chat status.\n\nPlease try again later.');
      }
      break;

    default:
      // Handle non-command messages for interactive sessions
      await handleInteractiveSession(msg);
      break;
  }
}

// Handle interactive sessions for multi-step processes
async function handleInteractiveSession(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;
  
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
        await sendMessage(chatId, '❌ *Invalid email format.*\n\nPlease enter a valid email address:', { parse_mode: 'Markdown' });
        return;
      }
      
      // Store email and ask for password
      session.email = text.trim();
      session.state = SESSION_STATES.WAITING_PASSWORD;
      userSessions.set(chatId, session);
      await sendMessage(chatId, '🔐 *Email received!*\n\nNow please enter your password:', { parse_mode: 'Markdown' });
      break;
      
    case SESSION_STATES.WAITING_PASSWORD:
      if (!text || text.trim().length === 0) {
        await sendMessage(chatId, '❌ *Password cannot be empty.*\n\nPlease enter your password:', { parse_mode: 'Markdown' });
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
        await sendMessage(chatId, '❌ *URL cannot be empty.*\n\nPlease enter a valid URL:', { parse_mode: 'Markdown' });
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
}

// Main webhook handler
exports.handler = async (event, context) => {
  console.log('Webhook received:', JSON.stringify(event, null, 2));
  
  // Debug: Check environment variables
  console.log('Environment check:');
  console.log('BOT_TOKEN exists:', !!process.env.BOT_TOKEN);
  console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
  console.log('SUPABASE_KEY exists:', !!process.env.SUPABASE_KEY);
  console.log('SUPABASE_URL value:', process.env.SUPABASE_URL?.substring(0, 30) + '...');
  console.log('SUPABASE_KEY value:', process.env.SUPABASE_KEY?.substring(0, 20) + '...');

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only handle POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const update = JSON.parse(event.body);
    console.log('Telegram update received:', JSON.stringify(update, null, 2));

    // Handle message updates
    if (update.message) {
      const msg = update.message;
      console.log('Message received:', {
        chatId: msg.chat.id,
        text: msg.text,
        from: msg.from.username || msg.from.first_name
      });

      await handleCommand(msg);
    }
    
    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      
      console.log('Callback query received:', {
        chatId: chatId,
        data: data,
        from: callbackQuery.from.username || callbackQuery.from.first_name
      });
      
      // Answer the callback query to remove loading state
      await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQuery.id })
      });
      
      // Handle the callback data as a command
      const fakeMsg = {
        chat: { id: chatId },
        text: '/' + data,
        from: callbackQuery.from
      };
      
      await handleCommand(fakeMsg);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
