// server.js
const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });
console.log('WebSocket server running at ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', time: msg.time }));
      }
    } catch {}
  });

  const interval = setInterval(() => {
    ws.send(JSON.stringify({
      type: 'state',
      serverTime: Date.now(),
    }));
  }, 16);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});
