/**
 * Configuración de conexión a MongoDB
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Conectar a MongoDB
 * @returns {Promise<void>}
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Opciones de configuración
    });

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    console.log(`📊 Base de datos: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }
};

/**
 * Cerrar conexión a MongoDB
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB desconectado correctamente');
  } catch (error) {
    console.error('❌ Error al desconectar de MongoDB:', error.message);
  }
};

// Eventos de conexión
mongoose.connection.on('connected', () => {
  console.log('🔌 Mongoose conectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Error de conexión de Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose desconectado de MongoDB');
});
