const config = require('../../config');
const supabaseService = require('../../supabase');
const sessionStorage = require('../../session-storage');

// Store user interaction sessions for multi-step processes (temporary)
const userSessions = new Map();

// Session states
const SESSION_STATES = {
  WAITING_EMAIL: 'waiting_email',
  WAITING_PASSWORD: 'waiting_password',
  WAITING_URL: 'waiting_url'
};

// Utility function to check if user is authenticated admin
async function isAdminAuthenticated(chatId) {
  return await sessionStorage.isAuthenticated(chatId);
}

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
      // Store session with timestamp, email, and password for admin operations
      await sessionStorage.setSession(chatId, email, password);
      
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
      
      await sendMessage(chatId, '✅ *Login successful!*\n\nYou are now authenticated as admin.\n🕒 *Session valid for 24 hours*\n\n👇 *Choose an admin action:*', adminKeyboard);
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
    const credentials = await getAdminCredentials(chatId);
    if (!credentials) {
      await sendMessage(chatId, '🔄 *Session update required.*\n\nPlease login again with /login to refresh your admin session.', { parse_mode: 'Markdown' });
      return;
    }
    const success = await supabaseService.updateVideoSource(newUrl, credentials);
    
    if (success) {
      await sendMessage(chatId, `✅ *Video URL updated successfully!*\n\n🔗 *New URL:* ${newUrl}\n\nThe video source has been changed.`, { parse_mode: 'Markdown' });
    } else {
      await sendMessage(chatId, '❌ *Failed to update video URL.*\n\nPlease try again.', { parse_mode: 'Markdown' });
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
  let command = text.split(' ')[0].toLowerCase();

  // Map reply keyboard button texts to commands
  const buttonTextMap = {
    '📊 Platform Status': '/status',
    '🔗 Get Video URL': '/get_url',
    '📈 Statistics': '/get_stats',
    '🔐 Admin Login': '/login',
    '❓ Help & Commands': '/help',
    '🔴 Disable Video': '/disable_video',
    '🟢 Enable Video': '/enable_video',
    '🔗 Change URL': '/change_url',
    '💬 Toggle Chat': '/toggle_chat',
    '🗑️ Clear Messages': '/clear_messages',
    '🚪 Logout': '/logout'
  };

  // Check if the text matches a button text and convert to command
  if (buttonTextMap[text]) {
    command = buttonTextMap[text];
    // For login button, ensure it triggers interactive login
    if (text === '🔐 Admin Login') {
      command = '/login';
      // Override the text to ensure interactive login is triggered
      msg.text = '/login';
    }
    // For change URL button, ensure it triggers interactive URL change
    if (text === '🔗 Change URL') {
      command = '/change_url';
      // Override the text to ensure interactive URL change is triggered
      msg.text = '/change_url';
    }
  }

  console.log('Processing command:', command, 'from chatId:', chatId);

  switch (command) {
    case '/start':
      const welcomeMessage = `🎬 *Welcome to Genius Hub Admin Bot!*

This bot allows you to control your video streaming platform remotely.

👇 *Choose an option below:*`;
      
      const startKeyboard = createReplyKeyboard([
        [
          { text: '🔐 Admin Login' },
          { text: '❓ Help & Commands' }
        ]
      ]);
      
      await sendMessage(chatId, welcomeMessage, startKeyboard);
      break;

    case '/help':
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
      await sendMessage(chatId, helpMessage);
      break;

    case '/login':
      if (msg.text.trim() === '/login') {
        // Interactive login
        const isAuthenticatedLogin1 = await isAdminAuthenticated(chatId);
        if (isAuthenticatedLogin1) {
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
          
          await sendMessage(chatId, `✅ *Welcome back, Admin!*\n\nYou are already logged in as: ${session.email}\n\n👇 *Choose an admin action:*`, adminKeyboard);
          return;
        }
        userSessions.set(chatId, { state: SESSION_STATES.WAITING_EMAIL });
        await sendMessage(chatId, '🔑 Admin Login Process\n\nPlease enter your email address:');
      } else {
        // Legacy login format
        const isAuthenticatedLogin2 = await isAdminAuthenticated(chatId);
        if (isAuthenticatedLogin2) {
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
          
          await sendMessage(chatId, `✅ *Welcome back, Admin!*\n\nYou are already logged in as: ${session.email}\n\n👇 *Choose an admin action:*`, adminKeyboard);
          return;
        }

        const args = msg.text.substring(7).trim();
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
      const isAuthenticated = await isAdminAuthenticated(chatId);
      console.log('Admin sessions check - authenticated:', isAuthenticated);

      if (!isAuthenticated) {
        console.log('User not authenticated, sending auth required message');
        await sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
        return;
      }

      try {
        console.log('Attempting to disable video streaming...');
        const credentials = await getAdminCredentials(chatId);
        if (!credentials) {
          await sendMessage(chatId, '🔄 *Session update required.*\n\nPlease login again with /login to refresh your admin session.', { parse_mode: 'Markdown' });
          return;
        }
        const success = await supabaseService.updateVideoLiveStatus(false, credentials);
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
      const isAuthenticatedEnable = await isAdminAuthenticated(chatId);
      console.log('Is admin authenticated:', isAuthenticatedEnable);

      if (!isAuthenticatedEnable) {
        console.log('User not authenticated, sending auth required message');
        await sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
        return;
      }

      try {
        console.log('Attempting to enable video streaming...');
        const credentials = await getAdminCredentials(chatId);
        if (!credentials) {
          await sendMessage(chatId, '🔄 *Session update required.*\n\nPlease login again with /login to refresh your admin session.', { parse_mode: 'Markdown' });
          return;
        }
        const success = await supabaseService.updateVideoLiveStatus(true, credentials);
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
      const isAuthenticatedChangeUrl = await isAdminAuthenticated(chatId);
      console.log('Is admin authenticated:', isAuthenticatedChangeUrl);

      if (!isAuthenticatedChangeUrl) {
        console.log('User not authenticated, sending auth required message');
        await sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
        return;
      }

      if (msg.text.trim() === '/change_url' || msg.text.trim() === '/changeurl') {
        // Interactive URL change
        userSessions.set(chatId, { state: SESSION_STATES.WAITING_URL });
        await sendMessage(chatId, '🔗 *Change Video URL*\n\nPlease enter the new video URL:', { parse_mode: 'Markdown' });
      } else {
        // Direct URL change
        const newUrl = msg.text.substring(msg.text.indexOf(' ') + 1).trim();
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
      
      const isAuthenticatedClear = await isAdminAuthenticated(chatId);
      if (!isAuthenticatedClear) {
        console.log('User not authenticated, sending auth required message');
        await sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
        return;
      }

      try {
        console.log('Attempting to clear all messages...');
        const credentials = await getAdminCredentials(chatId);
        if (!credentials) {
          await sendMessage(chatId, '🔄 *Session update required.*\n\nPlease login again with /login to refresh your admin session.', { parse_mode: 'Markdown' });
          return;
        }
        const success = await supabaseService.clearMessages(credentials);
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
      const isAuthenticatedToggle = await isAdminAuthenticated(chatId);
      console.log('Is admin authenticated:', isAuthenticatedToggle);

      if (!isAuthenticatedToggle) {
        console.log('User not authenticated, sending auth required message');
        await sendMessage(chatId, '🔐 *Admin authentication required.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
        return;
      }

      try {
        const credentials = await getAdminCredentials(chatId);
        if (!credentials) {
          await sendMessage(chatId, '🔄 *Session update required.*\n\nPlease login again with /login to refresh your admin session.', { parse_mode: 'Markdown' });
          return;
        }
        const currentStatus = await supabaseService.getChatStatus();
        const newStatus = !currentStatus;
        const success = await supabaseService.updateChatStatus(newStatus, credentials);
        
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

    case '/logout':
      console.log('Logout command received from chatId:', chatId);
      
      const isAuthenticatedLogout = await isAdminAuthenticated(chatId);
      if (!isAuthenticatedLogout) {
        await sendMessage(chatId, '❌ *You are not logged in.*\n\nUse /login to authenticate first.', { parse_mode: 'Markdown' });
        return;
      }
      
      // Remove session
      await sessionStorage.removeSession(chatId);
      
      // Show public keyboard
      const publicKeyboard = createReplyKeyboard([
        [
          { text: '🔐 Admin Login' },
          { text: '❓ Help & Commands' }
        ]
      ]);
      
      await sendMessage(chatId, '🚪 *Logged out successfully!*\n\nYour admin session has been ended.\n\n👇 *Choose an option:*', publicKeyboard);
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
