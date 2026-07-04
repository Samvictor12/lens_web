import { WebSocketServer } from 'ws';

let wss = null;

/**
 * Initialize WebSocket Server and bind it to the HTTP server
 * @param {import('http').Server} server 
 */
export const initWebSocket = (server) => {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('🔌 Client connected via WebSocket');

    ws.on('error', (err) => {
      console.error('❌ WebSocket Client Error:', err);
    });

    ws.on('close', () => {
      console.log('🔌 Client disconnected from WebSocket');
    });
  });

  console.log('✅ WebSocket Server successfully initialized and bound');
};

/**
 * Broadcast event message to all connected clients
 * @param {string} type - Event type (e.g. 'SALE_ORDER_UPDATED')
 * @param {Object} [data] - Event payload
 */
export const broadcast = (type, data = {}) => {
  if (!wss) {
    console.warn('⚠️ WebSocket Server not initialized yet');
    return;
  }

  const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  
  let activeClients = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 = OPEN
      client.send(payload);
      activeClients++;
    }
  });
  
  console.log(`📡 Broadcasted message [${type}] to ${activeClients} active client(s)`);
};
