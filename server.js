const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

let server;
try {
  server = new WebSocket.Server({ port: PORT });
  console.log(`✅ WebSocket server running on port ${PORT}`);
} catch (err) {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
}

const clients = new Set();

server.on('connection', (ws, req) => {
  console.log(`➕ New client connected from ${req.socket.remoteAddress}`);
  clients.add(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received:', data);
      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error('Invalid message:', message);
    }
  });

  ws.on('close', () => {
    console.log('➖ Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
  });
});

server.on('error', (err) => {
  console.error('WebSocket server error:', err);
});

// Dummy data every 10 seconds
setInterval(() => {
  if (clients.size === 0) return;
  const dummyData = {
    type: 'account_update',
    payload: {
      balance: 11149.87 + (Math.random() * 10 - 5),
      equity: 11149.87 + (Math.random() * 10 - 5),
      profit: (Math.random() * 20 - 10).toFixed(2),
      margin: 0,
      free_margin: 11149.87,
      timestamp: new Date().toISOString()
    }
  };
  const msg = JSON.stringify(dummyData);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
  console.log('📤 Sent dummy update to', clients.size, 'clients');
}, 10000);