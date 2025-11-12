/**
 * Aplicación principal de Express
 * Backend para sistema de corrección automática
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { connectDB } from './config/database.js';

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import gradingRoutes from './routes/gradingRoutes.js';
import universityRoutes from './routes/universityRoutes.js';
import facultyRoutes from './routes/facultyRoutes.js';
import careerRoutes from './routes/careerRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import commissionRoutes from './routes/commissionRoutes.js';
import rubricRoutes from './routes/rubricRoutes.js';
import userRoutes from './routes/userRoutes.js';
import consolidatorRoutes from './routes/consolidatorRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';

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
app.use('/api', profileRoutes); // Rutas de perfil (/api/profile)
app.use('/api', gradingRoutes); // Rutas de corrección (/api/grade)
app.use('/api', consolidatorRoutes); // Rutas de consolidación (/api/consolidate) - PÚBLICO
app.use('/api/universities', universityRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/rubrics', rubricRoutes);
app.use('/api/users', userRoutes);
app.use('/api/submissions', submissionRoutes);

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
    version: '2.3.0',
    endpoints: {
      auth: '/api/auth',
      profile: '/api/profile',
      consolidate: '/api/consolidate (público)',
      universities: '/api/universities',
      faculties: '/api/faculties',
      careers: '/api/careers',
      courses: '/api/courses',
      commissions: '/api/commissions',
      rubrics: '/api/rubrics',
      users: '/api/users',
      submissions: '/api/submissions',
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
const PORT = process.env.PORT || 80;

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
      console.log(`   - GET  http://localhost:${PORT}/api/faculties`);
      console.log(`   - GET  http://localhost:${PORT}/api/careers`);
      console.log(`   - GET  http://localhost:${PORT}/api/courses`);
      console.log(`   - GET  http://localhost:${PORT}/api/commissions`);
      console.log(`   - GET  http://localhost:${PORT}/api/rubrics`);
      console.log(`   - GET  http://localhost:${PORT}/api/users`);
      console.log(`   - GET  http://localhost:${PORT}/api/submissions`);
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
