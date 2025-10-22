/**
 * Aplicación principal de Express
 * Backend para sistema de corrección automática
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import universityRoutes from './routes/universityRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import rubricRoutes from './routes/rubricRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Cargar variables de entorno
dotenv.config();

// Crear app de Express
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging de requests (desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/rubrics', rubricRoutes);
app.use('/api/users', userRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend de corrección automática funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API de Corrección Automática',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      universities: '/api/universities',
      courses: '/api/courses',
      rubrics: '/api/rubrics',
      users: '/api/users',
      health: '/health',
    },
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.path,
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);

  // Error de Multer (upload de archivos)
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'Error al subir archivo',
      error: err.message,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Puerto
const PORT = process.env.PORT || 5000;

// Iniciar servidor
const startServer = async () => {
  try {
    // Conectar a MongoDB
    await connectDB();

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('🚀 Servidor iniciado correctamente');
      console.log(`📡 Puerto: ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      console.log('='.repeat(60));
      console.log('');
      console.log('📋 Endpoints disponibles:');
      console.log(`   - GET  http://localhost:${PORT}/`);
      console.log(`   - GET  http://localhost:${PORT}/health`);
      console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
      console.log(`   - GET  http://localhost:${PORT}/api/universities`);
      console.log(`   - GET  http://localhost:${PORT}/api/courses`);
      console.log(`   - GET  http://localhost:${PORT}/api/rubrics`);
      console.log(`   - GET  http://localhost:${PORT}/api/users`);
      console.log('='.repeat(60));
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});

// Iniciar
startServer();

export default app;
