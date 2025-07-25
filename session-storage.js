const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

// Initialize Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

class SessionStorage {
  constructor() {
    this.tableName = 'bot_sessions';
    this.initializeTable();
  }

  // Initialize the sessions table if it doesn't exist
  async initializeTable() {
    try {
      // Check if table exists by trying to select from it
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .limit(1);
      
      if (error && error.code === 'PGRST116') {
        // Table doesn't exist, but we can't create it via JS client
        console.log('⚠️ bot_sessions table not found. Please create it manually in Supabase.');
      }
    } catch (error) {
      console.error('Error checking sessions table:', error);
    }
  }

  // Add/update session
  async setSession(chatId, email, password = null) {
    try {
      const sessionData = {
        chat_id: chatId.toString(),
        email: email,
        timestamp: Date.now(),
        updated_at: new Date().toISOString()
      };

      // Store password if provided (for admin operations)
      if (password) {
        sessionData.password = password;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .upsert(sessionData, { 
          onConflict: 'chat_id',
          returning: 'minimal'
        });

      if (error) {
        console.error('Error saving session:', error);
        return false;
      }

      console.log(`✅ Session saved for chatId: ${chatId}`);
      return true;
    } catch (error) {
      console.error('Error in setSession:', error);
      return false;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(chatId) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('chat_id', chatId.toString())
        .single();

      if (error || !data) {
        return false;
      }

      // Check if session expired
      const now = Date.now();
      if (now - data.timestamp > SESSION_TIMEOUT) {
        // Session expired, remove it
        await this.removeSession(chatId);
        return false;
      }

      // Update timestamp for activity (extend session)
      await this.updateSessionActivity(chatId);
      return true;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Update session activity timestamp
  async updateSessionActivity(chatId) {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .update({ 
          timestamp: Date.now(),
          updated_at: new Date().toISOString()
        })
        .eq('chat_id', chatId.toString());

      if (error) {
        console.error('Error updating session activity:', error);
      }
    } catch (error) {
      console.error('Error in updateSessionActivity:', error);
    }
  }

  // Remove session
  async removeSession(chatId) {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('chat_id', chatId.toString());

      if (error) {
        console.error('Error removing session:', error);
        return false;
      }

      console.log(`🗑️ Session removed for chatId: ${chatId}`);
      return true;
    } catch (error) {
      console.error('Error in removeSession:', error);
      return false;
    }
  }

  // Get session info
  async getSession(chatId) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('chat_id', chatId.toString())
        .single();

      if (error || !data) {
        return null;
      }

      return {
        email: data.email,
        password: data.password,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Clean up expired sessions (utility method)
  async cleanupExpiredSessions() {
    try {
      const expiredTime = Date.now() - SESSION_TIMEOUT;
      
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .lt('timestamp', expiredTime);

      if (error) {
        console.error('Error cleaning up expired sessions:', error);
      } else {
        console.log('🧹 Cleaned up expired sessions');
      }
    } catch (error) {
      console.error('Error in cleanupExpiredSessions:', error);
    }
  }
}

module.exports = new SessionStorage();
