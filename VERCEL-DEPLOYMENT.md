# Vercel Deployment Guide for Genius Hub Telegram Bot

## 🚀 Complete Step-by-Step Deployment

### 1. **Prepare Your Repository**
```bash
# Make sure your bot directory is pushed to GitHub
git add .
git commit -m "Prepare bot for Vercel deployment"
git push origin main
```

### 2. **Vercel Account Setup**
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with your GitHub account
3. Click "New Project"

### 3. **Import Your Repository**
1. **Select Repository**: Choose your bot repository from GitHub
2. **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: `bot` (if bot is in a subdirectory)
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

### 4. **Environment Variables Setup**
In Vercel project settings, add these environment variables:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `BOT_TOKEN` | `your_telegram_bot_token` | Get from @BotFather |
| `SUPABASE_URL` | `your_supabase_project_url` | From Supabase dashboard |
| `SUPABASE_ANON_KEY` | `your_supabase_anon_key` | From Supabase dashboard |

### 5. **Deploy to Vercel**
1. Click **"Deploy"**
2. Wait for deployment to complete
3. Note your deployment URL (e.g., `https://your-bot-name.vercel.app`)

### 6. **Configure Telegram Webhook**
After successful deployment, run this command locally:

```bash
node setup-webhook.js https://your-bot-name.vercel.app/api/webhook
```

Replace `your-bot-name` with your actual Vercel app name.

### 7. **Test Your Bot**
1. Open Telegram
2. Find your bot
3. Send `/start` to test
4. Try admin commands after login

## 📋 Vercel Project Settings

### Build & Development Settings
- **Framework Preset**: Other
- **Build Command**: (leave empty)
- **Output Directory**: (leave empty)
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### Functions
- **Runtime**: Node.js 18.x
- **Region**: Choose closest to your users
- **Memory**: 1024 MB (default)
- **Timeout**: 30 seconds

## 🔧 Important Notes

### Webhook vs Polling
- **Local Development**: Uses polling (`bot.js`)
- **Vercel Production**: Uses webhooks (`api/webhook.js`)

### Session Management
- Admin sessions are stored in memory
- Sessions reset on each function invocation
- Consider using external storage for persistent sessions

### Environment Variables
- Never commit `.env` files to repository
- Use Vercel's environment variable system
- Variables are automatically injected into functions

## 🐛 Troubleshooting

### Common Issues:

1. **Bot not responding**
   - Check webhook URL is correct
   - Verify environment variables are set
   - Check Vercel function logs

2. **Authentication not working**
   - Verify Supabase credentials
   - Check Supabase RLS policies
   - Ensure admin user exists in Supabase

3. **Webhook setup fails**
   - Ensure bot token is correct
   - Check if webhook URL is accessible
   - Verify SSL certificate is valid

### Debugging:
- Check Vercel function logs in dashboard
- Use `console.log` for debugging
- Test webhook endpoint directly

## 📱 Testing Checklist

- [ ] `/start` command works
- [ ] `/help` shows all commands
- [ ] `/login` authentication works
- [ ] Admin commands work after login
- [ ] `/status` shows platform status
- [ ] `/logout` ends session
- [ ] Bot menu shows in Telegram

## 🔄 Updates and Maintenance

### Updating the Bot:
1. Make changes to your code
2. Push to GitHub
3. Vercel auto-deploys from main branch
4. No need to reconfigure webhook

### Monitoring:
- Check Vercel dashboard for function invocations
- Monitor error rates and response times
- Set up alerts for failures

## 📞 Support

If you encounter issues:
1. Check Vercel function logs
2. Verify all environment variables
3. Test webhook endpoint manually
4. Check Telegram bot settings with @BotFather
