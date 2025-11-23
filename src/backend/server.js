import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import saleOrderRoutes from './routes/saleOrders.routes.js';
import customerMasterRoutes from './routes/customerMaster.routes.js';
import vendorMasterRoutes from './routes/vendorMaster.routes.js';
import userMasterRoutes from './routes/userMaster.routes.js';
// Lens Master Routes
import lensCategoryRoutes from './routes/lensCategories.routes.js';
import lensMaterialRoutes from './routes/lensMaterials.routes.js';
import lensCoatingRoutes from './routes/lensCoatings.routes.js';
import lensBrandRoutes from './routes/lensBrands.routes.js';
import lensTypeRoutes from './routes/lensTypes.routes.js';
import lensProductRoutes from './routes/lensProducts.routes.js';
import lensPriceRoutes from './routes/lensPrices.routes.js';
import businessCategoryRoutes from './routes/businessCategory.routes.js';
import departmentRoutes from './routes/department.routes.js';
import priceMappingRoutes from './routes/priceMappings.routes.js';
import lensFittingRoutes from './routes/lensFittingMaster.routes.js';
import lensDiaRoutes from './routes/lensDiaMaster.routes.js';
import lensTintingRoutes from './routes/lensTintings.routes.js';

// Load environment variables
dotenv.config();

const app = express();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lens Project API',
      version: '1.0.0',
      description: 'API documentation for Lens Management System',
      contact: {
        name: 'API Support',
        email: 'support@lens-project.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: ['./src/backend/routes/*.js'], // Path to the API files
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sale-orders', saleOrderRoutes);
app.use('/api/customer-master', customerMasterRoutes);
app.use('/api/vendor-master', vendorMasterRoutes);
app.use('/api/user-master', userMasterRoutes);
// Lens Master Routes
app.use('/api/v1/lens-categories', lensCategoryRoutes);
app.use('/api/v1/lens-materials', lensMaterialRoutes);
app.use('/api/v1/lens-coatings', lensCoatingRoutes);
app.use('/api/v1/lens-brands', lensBrandRoutes);
app.use('/api/v1/lens-types', lensTypeRoutes);
app.use('/api/v1/lens-products', lensProductRoutes);
app.use('/api/v1/lens-prices', lensPriceRoutes);
app.use('/api/business-category', businessCategoryRoutes);
app.use('/api/department', departmentRoutes);
app.use('/api/price-mappings', priceMappingRoutes);
app.use('/api/lens-fittings', lensFittingRoutes);
app.use('/api/lens-dias', lensDiaRoutes);
app.use('/api/v1/lens-tintings', lensTintingRoutes);

// Basic route for testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log(`\n🚀 Starting server on port ${PORT}...`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Swagger API Docs: http://localhost:${PORT}/api-docs`);
});

server.on('listening', () => {
  const addr = server.address();
  console.log(`\n✅ Server is actually listening on ${addr.address}:${addr.port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port or stop the process using port ${PORT}.`);
    console.error(`On macOS, port 3001 is often used by AirPlay Receiver. You can disable it in System Preferences > Sharing.`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});



