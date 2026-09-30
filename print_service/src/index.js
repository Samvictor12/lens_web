const { createServer } = require('./server');

const PORT = parseInt(process.env.PORT || '9333', 10);
const server = createServer(PORT);

server.listen(PORT, '127.0.0.1', () => {
  console.log('====================================================');
  console.log('  Lens Print Service (Node.js EXE Edition)');
  console.log(`  Listening on http://127.0.0.1:${PORT}`);
  console.log('  Ready to receive print jobs.');
  console.log('====================================================');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[FATAL] Port ${PORT} is already in use by another service.`);
    console.error('Please close the other process and restart LensPrintService.');
  } else {
    console.error('[FATAL] Server error:', err);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('Shutting down Lens Print Service...');
  server.close(() => process.exit(0));
});
