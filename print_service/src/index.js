const readline = require('readline');
const { createServer } = require('./server');

const PORT = parseInt(process.env.PORT || '9333', 10);
const server = createServer(PORT);

function keepOpen() {
  try {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\nPress Enter to exit...', () => {
      process.exit(1);
    });
  } catch (_) {
    setTimeout(() => process.exit(1), 10000);
  }
}

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  keepOpen();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('====================================================');
  console.log('  Lens Print Service (Node.js EXE Edition)');
  console.log(`  Listening on http://127.0.0.1:${PORT}`);
  console.log('  Ready to receive print jobs.');
  console.log('====================================================');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('====================================================');
    console.log(`[INFO] Port ${PORT} is already in use.`);
    console.log('A background LensPrintService instance is already running and ready!');
    console.log('You do not need to keep another window open.');
    console.log('If you want to restart it, double-click LensPrintService-Reset.exe first.');
    console.log('====================================================');
  } else {
    console.error('[FATAL] Server error:', err);
  }
  keepOpen();
});

process.on('SIGINT', () => {
  console.log('Shutting down Lens Print Service...');
  server.close(() => process.exit(0));
});
