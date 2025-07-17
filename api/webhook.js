const TelegramBot = require('node-telegram-bot-api');

// Debug: Log environment variables (without sensitive values)
console.log('Environment check:', {
  BOT_TOKEN: process.env.BOT_TOKEN ? 'SET' : 'MISSING',
  SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING', 
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
  NODE_ENV: process.env.NODE_ENV || 'development',
  VERCEL: process.env.VERCEL || 'false'
});

// Initialize bot without polling for webhook mode
const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

// Verify required environment variables
const requiredVars = ['BOT_TOKEN', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these in your Vercel project settings');
} else {
  console.log('✅ All required environment variables are set');
}

// Initialize services
const supabaseService = require('../supabase');

// Initialize bot with webhook mode (no polling)
const bot = new TelegramBot(config.BOT_TOKEN, { polling: false });

// Debug: Test Supabase connection
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabaseService.client
      .from('admin_settings')  // Changed from 'your_table' to 'admin_settings' which should exist
      .select('*')
      .limit(1);
      
    if (error) throw error;
    console.log('✅ Supabase connection test successful');
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error.message);
  }
}

// Run connection test on startup
testSupabaseConnection();

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

// Utility function to create inline keyboard
function createInlineKeyboard(buttons) {
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

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

// Message handler function
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  console.log('Received message:', messageText, 'from chatId:', chatId);

  // Handle user sessions for multi-step processes
  if (userSessions.has(chatId)) {
    const session = userSessions.get(chatId);
    
    if (session.state === SESSION_STATES.WAITING_EMAIL) {
      session.email = messageText;
      session.state = SESSION_STATES.WAITING_PASSWORD;
      userSessions.set(chatId, session);
      await bot.sendMessage(chatId, '🔑 Please enter your password:');
      return;
    }
    
    if (session.state === SESSION_STATES.WAITING_PASSWORD) {
      const { email } = session;
      userSessions.delete(chatId); // Clear session
      await performLogin(chatId, email, messageText);
      return;
    }
    
    if (session.state === SESSION_STATES.WAITING_URL) {
      const newUrl = messageText.trim();
      userSessions.delete(chatId); // Clear session
      
      if (!newUrl.startsWith('http')) {
        await bot.sendMessage(chatId, '❌ Invalid URL format. Please provide a valid HTTP/HTTPS URL.');
        return;
      }
      
      try {
        const result = await supabaseService.updateVideoUrl(newUrl);
        if (result.success) {
          await bot.sendMessage(chatId, `✅ Video URL updated successfully!\n\nNew URL: ${newUrl}`);
        } else {
          await bot.sendMessage(chatId, `❌ Failed to update video URL: ${result.error}`);
        }
      } catch (error) {
        console.error('Error updating video URL:', error);
        await bot.sendMessage(chatId, '🔥 Error updating video URL. Please try again later.');
      }
      return;
    }
  }

  // Handle direct login command with parameters
  const loginMatch = messageText.match(/^\/login\s+(.+)/);
  if (loginMatch) {
    const params = loginMatch[1].trim().split(/\s+/);
    if (params.length >= 2) {
      const email = params[0];
      const password = params.slice(1).join(' '); // Handle passwords with spaces
      await performLogin(chatId, email, password);
      return;
    } else {
      await bot.sendMessage(chatId, '❌ Invalid login format.\n\nUsage: /login <email> <password>\nExample: /login admin@example.com yourpassword');
      return;
    }
  }

  // Command handlers
  if (messageText === '/start') {
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
    return;
  }

  if (messageText === '/help') {
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
    return;
  }

  if (messageText === '/login') {
    if (isAdminAuthenticated(chatId)) {
      await bot.sendMessage(chatId, '✅ You are already logged in as admin.\n\nUse /logout to end your session first.');
      return;
    }
    
    userSessions.set(chatId, { state: SESSION_STATES.WAITING_EMAIL });
    await bot.sendMessage(chatId, '📧 Please enter your email address:');
    return;
  }

  // Admin commands
  if (!isAdminAuthenticated(chatId)) {
    if (messageText.match(/^\/(disable_?video|enable_?video|change_?url|toggle_?chat|logout)/)) {
      await bot.sendMessage(chatId, '🔐 Authentication required. Please use /login first.');
      return;
    }
  }

  // Admin-only commands
  if (messageText.match(/^\/disable_?video$/)) {
    try {
      const result = await supabaseService.updateVideoStatus(false);
      if (result.success) {
        await bot.sendMessage(chatId, '✅ Video streaming has been disabled.');
      } else {
        await bot.sendMessage(chatId, `❌ Failed to disable video: ${result.error}`);
      }
    } catch (error) {
      console.error('Error disabling video:', error);
      await bot.sendMessage(chatId, '🔥 Error disabling video. Please try again later.');
    }
    return;
  }

  if (messageText.match(/^\/enable_?video$/)) {
    try {
      const result = await supabaseService.updateVideoStatus(true);
      if (result.success) {
        await bot.sendMessage(chatId, '✅ Video streaming has been enabled.');
      } else {
        await bot.sendMessage(chatId, `❌ Failed to enable video: ${result.error}`);
      }
    } catch (error) {
      console.error('Error enabling video:', error);
      await bot.sendMessage(chatId, '🔥 Error enabling video. Please try again later.');
    }
    return;
  }

  if (messageText.match(/^\/toggle_?chat$/)) {
    try {
      const currentStatus = await supabaseService.getChatStatus();
      const newStatus = !currentStatus.enabled;
      const result = await supabaseService.updateChatStatus(newStatus);
      
      if (result.success) {
        const statusText = newStatus ? 'enabled' : 'disabled';
        await bot.sendMessage(chatId, `✅ Chat has been ${statusText}.`);
      } else {
        await bot.sendMessage(chatId, `❌ Failed to toggle chat: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling chat:', error);
      await bot.sendMessage(chatId, '🔥 Error toggling chat. Please try again later.');
    }
    return;
  }

  if (messageText.match(/^\/change_?url$/)) {
    userSessions.set(chatId, { state: SESSION_STATES.WAITING_URL });
    await bot.sendMessage(chatId, '🔗 Please enter the new video URL:');
    return;
  }

  if (messageText === '/logout') {
    if (isAdminAuthenticated(chatId)) {
      adminSessions.delete(chatId);
      await bot.sendMessage(chatId, '✅ You have been logged out successfully.');
    } else {
      await bot.sendMessage(chatId, '❌ You are not currently logged in.');
    }
    return;
  }

  // Public commands
  if (messageText === '/status') {
    try {
      const videoStatus = await supabaseService.getVideoStatus();
      const chatStatus = await supabaseService.getChatStatus();
      const statusMessage = `
📊 *Platform Status*

🎥 Video Streaming: ${videoStatus.enabled ? '✅ Enabled' : '❌ Disabled'}
💬 Chat System: ${chatStatus.enabled ? '✅ Enabled' : '❌ Disabled'}

Last Updated: ${new Date().toLocaleString()}
      `;
      await bot.sendMessage(chatId, statusMessage);
    } catch (error) {
      console.error('Error getting status:', error);
      await bot.sendMessage(chatId, '🔥 Error retrieving status. Please try again later.');
    }
    return;
  }

  if (messageText === '/get_url') {
    try {
      const result = await supabaseService.getVideoUrl();
      if (result.success) {
        await bot.sendMessage(chatId, `🔗 Current video URL:\n\n${result.url}`);
      } else {
        await bot.sendMessage(chatId, `❌ Failed to get video URL: ${result.error}`);
      }
    } catch (error) {
      console.error('Error getting video URL:', error);
      await bot.sendMessage(chatId, '🔥 Error retrieving video URL. Please try again later.');
    }
    return;
  }

  if (messageText === '/get_stats') {
    try {
      const stats = await supabaseService.getStats();
      if (stats.success) {
        const statsMessage = `
📈 *Platform Statistics*

👥 Total Users: ${stats.data.totalUsers || 0}
💬 Total Messages: ${stats.data.totalMessages || 0}
🚫 Banned Users: ${stats.data.bannedUsers || 0}
⏰ Active Timeouts: ${stats.data.activeTimeouts || 0}

Last Updated: ${new Date().toLocaleString()}
        `;
        await bot.sendMessage(chatId, statsMessage);
      } else {
        await bot.sendMessage(chatId, `❌ Failed to get statistics: ${stats.error}`);
      }
    } catch (error) {
      console.error('Error getting stats:', error);
      await bot.sendMessage(chatId, '🔥 Error retrieving statistics. Please try again later.');
    }
    return;
  }

  // Default response for unknown commands
  await bot.sendMessage(chatId, '❓ Unknown command. Use /help to see available commands.');
}

// Webhook handler for Vercel
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const update = req.body;
      
      if (update.message) {
        await handleMessage(update.message);
      }
      
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
