const https = require('https');

// Replace with your actual Vercel URL
const WEBHOOK_URL = process.argv[2];

if (!WEBHOOK_URL) {
  console.error('Please provide webhook URL as argument');
  console.log('Usage: node test-webhook.js https://your-app.vercel.app/api/webhook');
  process.exit(1);
}

// Test payload (simulates Telegram message)
const testPayload = {
  update_id: 123456789,
  message: {
    message_id: 1,
    from: {
      id: 123456789,
      is_bot: false,
      first_name: "Test",
      username: "testuser"
    },
    chat: {
      id: 123456789,
      first_name: "Test",
      username: "testuser",
      type: "private"
    },
    date: Math.floor(Date.now() / 1000),
    text: "/start"
  }
};

const data = JSON.stringify(testPayload);
const url = new URL(WEBHOOK_URL);

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🧪 Testing webhook:', WEBHOOK_URL);
console.log('📤 Sending test payload...');

const req = https.request(options, (res) => {
  console.log('📊 Response Status:', res.statusCode);
  console.log('📋 Response Headers:', res.headers);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('📥 Response Body:', responseData);
    
    if (res.statusCode === 200) {
      console.log('✅ Webhook is working!');
    } else {
      console.log('❌ Webhook failed with status:', res.statusCode);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(data);
req.end();
