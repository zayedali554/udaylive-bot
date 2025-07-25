-- Update bot_sessions table to include password column for admin operations
-- Run this SQL in your Supabase SQL editor

-- Add password column to bot_sessions table
ALTER TABLE bot_sessions 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Update the table comment
COMMENT ON TABLE bot_sessions IS 'Telegram bot admin session storage with credentials for serverless environment';

-- Add index on chat_id for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_bot_sessions_chat_id ON bot_sessions(chat_id);

-- Add index on timestamp for cleanup operations
CREATE INDEX IF NOT EXISTS idx_bot_sessions_timestamp ON bot_sessions(timestamp);

-- Optional: Add a function to clean up old sessions (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_bot_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM bot_sessions 
    WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup daily
-- You can set this up in Supabase Dashboard > Database > Cron Jobs
-- SELECT cron.schedule('cleanup-bot-sessions', '0 2 * * *', 'SELECT cleanup_old_bot_sessions();');
