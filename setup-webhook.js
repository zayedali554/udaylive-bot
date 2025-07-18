const config = require('./config');

// Function to set up Telegram webhook
async function setupWebhook(webhookUrl) {
  const telegramApiUrl = `https://api.telegram.org/bot${config.BOT_TOKEN}/setWebhook`;
  
  try {
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook set successfully!');
      console.log('🔗 Webhook URL:', webhookUrl);
      console.log('📱 Bot is now ready to receive messages via webhook');
    } else {
      console.error('❌ Failed to set webhook:', result.description);
    }
    
    return result;
  } catch (error) {
    console.error('🔥 Error setting webhook:', error);
    return { ok: false, error: error.message };
  }
}

// Function to get current webhook info
async function getWebhookInfo() {
  const telegramApiUrl = `https://api.telegram.org/bot${config.BOT_TOKEN}/getWebhookInfo`;
  
  try {
    const response = await fetch(telegramApiUrl);
    const result = await response.json();
    
    if (result.ok) {
      console.log('📋 Current webhook info:');
      console.log('🔗 URL:', result.result.url || 'Not set');
      console.log('✅ Has custom certificate:', result.result.has_custom_certificate);
      console.log('📊 Pending update count:', result.result.pending_update_count);
      console.log('⏰ Last error date:', result.result.last_error_date ? new Date(result.result.last_error_date * 1000) : 'None');
      console.log('❌ Last error message:', result.result.last_error_message || 'None');
    } else {
      console.error('❌ Failed to get webhook info:', result.description);
    }
    
    return result;
  } catch (error) {
    console.error('🔥 Error getting webhook info:', error);
    return { ok: false, error: error.message };
  }
}

// Function to delete webhook (switch back to polling)
async function deleteWebhook() {
  const telegramApiUrl = `https://api.telegram.org/bot${config.BOT_TOKEN}/deleteWebhook`;
  
  try {
    const response = await fetch(telegramApiUrl, {
      method: 'POST'
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook deleted successfully!');
      console.log('📱 Bot is now back to polling mode');
    } else {
      console.error('❌ Failed to delete webhook:', result.description);
    }
    
    return result;
  } catch (error) {
    console.error('🔥 Error deleting webhook:', error);
    return { ok: false, error: error.message };
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🤖 Genius Hub Telegram Bot - Webhook Setup');
  console.log('==========================================');
  
  if (!config.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found in environment variables');
    console.log('Please make sure your .env file contains BOT_TOKEN');
    process.exit(1);
  }
  
  switch (command) {
    case 'set':
      const webhookUrl = args[1];
      if (!webhookUrl) {
        console.error('❌ Please provide webhook URL');
        console.log('Usage: node setup-webhook.js set <webhook-url>');
        console.log('Example: node setup-webhook.js set https://your-site.netlify.app/.netlify/functions/telegram-webhook');
        process.exit(1);
      }
      await setupWebhook(webhookUrl);
      break;
      
    case 'info':
      await getWebhookInfo();
      break;
      
    case 'delete':
      await deleteWebhook();
      break;
      
    default:
      console.log('📋 Available commands:');
      console.log('');
      console.log('🔗 Set webhook:');
      console.log('   node setup-webhook.js set <webhook-url>');
      console.log('   Example: node setup-webhook.js set https://your-site.netlify.app/.netlify/functions/telegram-webhook');
      console.log('');
      console.log('📊 Get webhook info:');
      console.log('   node setup-webhook.js info');
      console.log('');
      console.log('🗑️ Delete webhook (back to polling):');
      console.log('   node setup-webhook.js delete');
      console.log('');
      console.log('💡 After deploying to Netlify, use the "set" command with your Netlify URL');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  setupWebhook,
  getWebhookInfo,
  deleteWebhook
};
