# 🚀 Genius Hub Telegram Bot - Netlify Deployment Guide

Your Telegram bot has been converted to work on Netlify! All your existing commands and functionality remain exactly the same.

## 📋 What's Changed

- ✅ **All commands work exactly the same** (no changes to functionality)
- ✅ **Same admin authentication system**
- ✅ **Same Supabase integration**
- ✅ **Same interactive sessions** (login, URL change)
- ✅ **Converted from polling to webhook** (more efficient)
- ✅ **Serverless functions** (scales automatically)

## 🔧 Files Added/Modified

### New Files:
- `netlify.toml` - Netlify configuration
- `netlify/functions/telegram-webhook.js` - Main webhook handler
- `index.html` - Bot status dashboard
- `setup-webhook.js` - Webhook configuration script
- `NETLIFY_DEPLOYMENT.md` - This guide

### Modified Files:
- `package.json` - Added Netlify scripts

## 🚀 Deployment Steps

### Step 1: Deploy to Netlify

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Convert bot for Netlify deployment"
   git push origin main
   ```

2. **Deploy on Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Build settings will be auto-detected from `netlify.toml`
   - Click "Deploy site"

3. **Set Environment Variables**:
   - Go to Site settings → Environment variables
   - Add these variables from your `.env` file:
     - `BOT_TOKEN` = your telegram bot token
     - `SUPABASE_URL` = your supabase URL
     - `SUPABASE_KEY` = your supabase key
     - `ADMIN_PASSWORD` = your admin password (optional)

### Step 2: Configure Telegram Webhook

After deployment, you'll get a Netlify URL like: `https://your-site-name.netlify.app`

**Option A: Using the script (Recommended)**
```bash
npm run webhook:set https://your-site-name.netlify.app/.netlify/functions/telegram-webhook
```

**Option B: Manual setup**
```bash
node setup-webhook.js set https://your-site-name.netlify.app/.netlify/functions/telegram-webhook
```

**Option C: Using curl**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://your-site-name.netlify.app/.netlify/functions/telegram-webhook"}'
```

### Step 3: Test Your Bot

1. **Check webhook status**:
   ```bash
   npm run webhook:info
   ```

2. **Test bot commands**:
   - Send `/start` to your bot
   - Try `/help` to see all commands
   - Test admin login with `/login`

3. **View dashboard**:
   - Visit your Netlify URL to see the bot dashboard
   - Check webhook status and available commands

## 📱 Available Commands (Same as Before)

### Public Commands:
- `/start` - Welcome message
- `/help` - Show all commands  
- `/status` - Check platform status
- `/get_url` - Get current video URL
- `/get_stats` - Get platform statistics

### Admin Commands (after `/login`):
- `/login` - Authenticate as admin
- `/disablevideo` or `/disable_video` - Disable video streaming
- `/enablevideo` or `/enable_video` - Enable video streaming
- `/changeurl` or `/change_url` - Change video source URL
- `/togglechat` or `/toggle_chat` - Toggle chat on/off
- `/logout` - Logout from admin session

## 🔧 Useful Scripts

```bash
# Check current webhook info
npm run webhook:info

# Set new webhook URL
npm run webhook:set <your-netlify-url>/.netlify/functions/telegram-webhook

# Delete webhook (back to polling)
npm run webhook:delete

# Test locally with Netlify Dev
npm run netlify:dev
```

## 🐛 Troubleshooting

### Bot not responding?
1. Check webhook status: `npm run webhook:info`
2. Check Netlify function logs in your dashboard
3. Verify environment variables are set correctly

### Webhook errors?
1. Make sure your Netlify site is deployed and accessible
2. Check the webhook URL format: `https://your-site.netlify.app/.netlify/functions/telegram-webhook`
3. Verify BOT_TOKEN is correct

### Database errors?
1. Check SUPABASE_URL and SUPABASE_KEY in Netlify environment variables
2. Verify your Supabase project is accessible

## 💡 Benefits of Netlify Deployment

- ✅ **Free hosting** (generous free tier)
- ✅ **Auto-scaling** (handles traffic spikes)
- ✅ **Always online** (no server maintenance)
- ✅ **Fast deployment** (git push to deploy)
- ✅ **Global CDN** (fast worldwide)
- ✅ **HTTPS by default** (secure)
- ✅ **Environment variables** (secure config)

## 🔄 Switching Back to Local

If you want to switch back to local polling mode:

1. Delete the webhook:
   ```bash
   npm run webhook:delete
   ```

2. Run your original bot:
   ```bash
   npm start
   ```

## 📞 Support

Your bot functionality remains exactly the same! If you encounter any issues:

1. Check the Netlify function logs
2. Verify environment variables
3. Test webhook connectivity
4. Check Supabase connection

---

🎉 **Congratulations!** Your Telegram bot is now running on Netlify with all the same features and commands!
