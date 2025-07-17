// Simple test endpoint to check environment variables
export default async function handler(req, res) {
  try {
    const envCheck = {
      BOT_TOKEN: process.env.BOT_TOKEN ? 'SET' : 'MISSING',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV || 'undefined'
    };

    console.log('Environment variables check:', envCheck);
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      message: 'Test endpoint working'
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
