import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Simple test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Test server is running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}/api/health`);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});