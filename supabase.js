const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

// Initialize Supabase client with same credentials as main app
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

class SupabaseService {
  constructor() {
    this.client = supabase;
    this.adminCredentials = null; // Store admin credentials for authenticated operations
  }

  // Check if user is admin (same logic as admin panel)
  async checkAdminAuth(email, password) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({ 
        email: email, 
        password: password 
      });

      if (error) {
        console.error('Error checking admin auth:', error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Store credentials for authenticated operations
        this.adminCredentials = { email, password };
        // Keep the session active - don't sign out immediately
        return { success: true, user: data.user };
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      console.error('Admin auth error:', error);
      return { success: false, error: 'Authentication error' };
    }
  }

  // Perform authenticated operation
  async performAuthenticatedOperation(operation) {
    if (!this.adminCredentials) {
      throw new Error('No admin credentials stored');
    }

    try {
      // Sign in with stored credentials
      const { data, error } = await this.client.auth.signInWithPassword(this.adminCredentials);
      
      if (error) {
        console.error('Error signing in for operation:', error);
        throw error;
      }

      // Perform the operation
      const result = await operation();
      
      // Sign out after operation
      await this.client.auth.signOut();
      
      return result;
    } catch (error) {
      // Make sure to sign out even if operation fails
      try {
        await this.client.auth.signOut();
      } catch (signOutError) {
        console.error('Error signing out after failed operation:', signOutError);
      }
      throw error;
    }
  }

  // Clear admin credentials (for logout)
  clearAdminCredentials() {
    this.adminCredentials = null;
  }

  // Get current video source URL
  async getVideoSource() {
    try {
      const { data, error } = await this.client
        .from('admin')
        .select('url')
        .eq('id', 'videoSource')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record doesn't exist, create it with default URL
          const defaultUrl = "https://dga9kme080o0w.cloudfront.net/out/v1/5c7cfedca3df4fc99ea383b5f2e6a7a8/index.m3u8";
          await this.client
            .from('admin')
            .insert({ id: 'videoSource', url: defaultUrl });
          return defaultUrl;
        }
        console.error('Error fetching video source:', error);
        return null;
      }

      return data?.url || null;
    } catch (error) {
      console.error('Get video source error:', error);
      return null;
    }
  }

  // Update video source URL
  async updateVideoSource(newUrl) {
    try {
      await this.performAuthenticatedOperation(async () => {
        const { data, error } = await this.client
          .from('admin')
          .upsert({ id: 'videoSource', url: newUrl })
          .eq('id', 'videoSource');

        if (error) {
          console.error('Error updating video source:', error);
          throw error;
        }

        return data;
      });

      return true;
    } catch (error) {
      console.error('Update video source error:', error);
      return false;
    }
  }

  // Get video live status
  async getVideoLiveStatus() {
    try {
      const { data, error } = await this.client
        .from('admin')
        .select('enabled')
        .eq('id', 'videoLive')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record doesn't exist, create it with default enabled status
          await this.client
            .from('admin')
            .insert({ id: 'videoLive', enabled: true });
          return true;
        }
        console.error('Error fetching video live status:', error);
        return true; // Default to enabled
      }

      return data?.enabled ?? true;
    } catch (error) {
      console.error('Get video live status error:', error);
      return true; // Default to enabled
    }
  }

  // Update video live status
  async updateVideoLiveStatus(enabled) {
    try {
      await this.performAuthenticatedOperation(async () => {
        const { data, error } = await this.client
          .from('admin')
          .upsert({ id: 'videoLive', enabled: enabled })
          .eq('id', 'videoLive');

        if (error) {
          console.error('Error updating video live status:', error);
          throw error;
        }

        return data;
      });

      return true;
    } catch (error) {
      console.error('Update video live status error:', error);
      return false;
    }
  }

  // Get chat enabled status
  async getChatStatus() {
    try {
      const { data, error } = await this.client
        .from('admin')
        .select('enabled')
        .eq('id', 'chatStatus')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record doesn't exist, create it with default enabled status
          await this.client
            .from('admin')
            .insert({ id: 'chatStatus', enabled: true });
          return true;
        }
        console.error('Error fetching chat status:', error);
        return true; // Default to enabled
      }

      return data?.enabled ?? true;
    } catch (error) {
      console.error('Get chat status error:', error);
      return true; // Default to enabled
    }
  }

  // Update chat enabled status
  async updateChatStatus(enabled) {
    try {
      await this.performAuthenticatedOperation(async () => {
        const { data, error } = await this.client
          .from('admin')
          .upsert({ id: 'chatStatus', enabled: enabled })
          .eq('id', 'chatStatus');

        if (error) {
          console.error('Error updating chat status:', error);
          throw error;
        }

        return data;
      });

      return true;
    } catch (error) {
      console.error('Update chat status error:', error);
      return false;
    }
  }

  // Clear all messages
  async clearMessages() {
    try {
      await this.performAuthenticatedOperation(async () => {
        // Use a simple delete with a condition that should match all rows
        const { error } = await this.client
          .from('messages')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all messages (exclude impossible UUID)

        if (error) {
          console.error('Error clearing messages:', error);
          throw error;
        }
      });

      return true;
    } catch (error) {
      console.error('Clear messages error:', error);
      return false;
    }
  }

  // Get platform statistics
  async getPlatformStats() {
    try {
      // Get total messages count
      const { count: messageCount, error: messageError } = await this.client
        .from('messages')
        .select('*', { count: 'exact', head: true });

      if (messageError) {
        console.error('Error fetching message count:', messageError);
      }

      // Get unique users count (approximate)
      const { data: users, error: userError } = await this.client
        .from('messages')
        .select('user_id')
        .limit(1000);

      let uniqueUsers = 0;
      if (!userError && users) {
        const uniqueUserIds = new Set(users.map(u => u.user_id));
        uniqueUsers = uniqueUserIds.size;
      }

      return {
        totalMessages: messageCount || 0,
        uniqueUsers: uniqueUsers,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get platform stats error:', error);
      return {
        totalMessages: 0,
        uniqueUsers: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new SupabaseService();
