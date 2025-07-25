-- Clear old bot sessions that don't have password field
-- Run this after updating the bot_sessions table schema
-- This will force users to login again with the new session format

-- Option 1: Clear all existing sessions (recommended)
DELETE FROM bot_sessions;

-- Option 2: Clear only sessions without password (if you want to be selective)
-- DELETE FROM bot_sessions WHERE password IS NULL;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bot_sessions' 
ORDER BY ordinal_position;
