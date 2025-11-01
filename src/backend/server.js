import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended }));

// Basic route for testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp Date().toISOString() });
});

// Error handling middleware
app.use((err, req.Request, res.Response, next.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success,
    message: 'Internal Server Error',
    error.env.NODE_ENV === 'development' ? err.message 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



