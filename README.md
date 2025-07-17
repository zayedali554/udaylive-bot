# Genius Hub Telegram Bot

A powerful Telegram bot for remotely controlling your Genius Hub video streaming platform. This bot provides the same admin features as your web admin panel, allowing you to manage your platform from anywhere.

## Features

### 🔓 Public Commands
- `/start` - Welcome message and bot introduction
- `/help` - Show all available commands
- `/status` - Check current platform status (video/chat enabled)
- `/get_url` - Get current video source URL
- `/get_stats` - Get platform statistics (messages, users)

### 🔐 Admin Commands (Authentication Required)
- `/login <password>` - Authenticate as admin
- `/disable_video` - Disable video streaming for all users
- `/enable_video` - Enable video streaming for all users
- `/change_url <new_url>` - Change video source URL
- `/toggle_chat` - Toggle chat system on/off
- `/logout` - Logout from admin session

## Installation

1. **Install Dependencies**
   ```bash
   cd bot
   npm install
   ```

2. **Configure Environment**
   - Edit `.env` file with your credentials
   - Bot token is already configured
   - Supabase credentials are synced with main app

3. **Run the Bot**
   ```bash
   npm start
   ```

   Or for development:
   ```bash
   npm run dev
   ```

## Authentication

The bot uses the same Supabase authentication system as the admin panel. To access admin commands:

1. Use `/login <email> <password>` with your admin email and password
2. Once authenticated, you'll have access to all admin commands
3. Use `/logout` to end your admin session

**Example:** `/login admin@example.com yourpassword`

**Note:** Admin sessions are temporary and stored in memory. You'll need to re-authenticate if the bot restarts.

## Usage Examples

### Admin Authentication
```
/login admin@example.com yourpassword
```

### Change Video URL
```
/change_url https://example.com/stream.m3u8
```

### Check Platform Status
```
/status
```

### Get Current Video URL
```
/get_url
```

## Security Features

- ✅ Admin authentication required for control commands
- ✅ Session management (login/logout)
- ✅ URL validation for video sources
- ✅ Error handling and logging
- ✅ Same security model as web admin panel

## Bot Commands Reference

| Command | Access | Description |
|---------|--------|-------------|
| `/start` | Public | Welcome message |
| `/help` | Public | Show all commands |
| `/status` | Public | Platform status |
| `/get_url` | Public | Current video URL |
| `/get_stats` | Public | Platform statistics |
| `/login` | Public | Admin authentication |
| `/disable_video` | Admin | Disable video streaming |
| `/enable_video` | Admin | Enable video streaming |
| `/change_url` | Admin | Change video source |
| `/toggle_chat` | Admin | Toggle chat system |
| `/logout` | Admin | End admin session |

## Technical Details

- **Framework**: Node.js with node-telegram-bot-api
- **Database**: Supabase (same as main app)
- **Authentication**: Supabase Auth (email/password)
- **Real-time**: Instant updates to web platform
- **Error Handling**: Comprehensive error management

## File Structure

```
bot/
├── bot.js          # Main bot logic
├── config.js       # Configuration settings
├── supabase.js     # Database service layer
├── package.json    # Dependencies
├── .env           # Environment variables
└── README.md      # This file
```

## Deployment

The bot can be deployed on any Node.js hosting service:
- Heroku
- Railway
- DigitalOcean
- VPS servers

## Support

For issues or questions:
1. Check the console logs for errors
2. Verify Supabase connection
3. Ensure bot token is valid
4. Check admin password in database

---

**🎬 Genius Hub - Remote Admin Control via Telegram**
