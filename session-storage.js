const fs = require('fs');
const path = require('path');

// Session file path (in /tmp for serverless)
const SESSION_FILE = path.join('/tmp', 'bot-sessions.json');
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

class SessionStorage {
  constructor() {
    this.sessions = this.loadSessions();
  }

  // Load sessions from file
  loadSessions() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const data = fs.readFileSync(SESSION_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
    return {};
  }

  // Save sessions to file
  saveSessions() {
    try {
      fs.writeFileSync(SESSION_FILE, JSON.stringify(this.sessions, null, 2));
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }

  // Add/update session
  setSession(chatId, email) {
    this.sessions[chatId] = {
      email: email,
      timestamp: Date.now()
    };
    this.saveSessions();
  }

  // Check if user is authenticated
  isAuthenticated(chatId) {
    const session = this.sessions[chatId];
    if (!session) {
      return false;
    }

    // Check if session expired
    const now = Date.now();
    if (now - session.timestamp > SESSION_TIMEOUT) {
      delete this.sessions[chatId];
      this.saveSessions();
      return false;
    }

    // Update timestamp for activity
    session.timestamp = now;
    this.saveSessions();
    return true;
  }

  // Remove session
  removeSession(chatId) {
    delete this.sessions[chatId];
    this.saveSessions();
  }

  // Get session info
  getSession(chatId) {
    return this.sessions[chatId] || null;
  }
}

module.exports = new SessionStorage();
