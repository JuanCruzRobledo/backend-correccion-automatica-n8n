/**
 * Script de migración para agregar el campo 'deleted: false' a usuarios existentes
 *
 * Ejecutar con: node scripts/migrateDeletedField.js
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/database.js';
import User from '../src/models/User.js';

// Cargar variables de entorno
dotenv.config();

const migrateDeletedField = async () => {
  try {
    console.log('🔄 Iniciando migración del campo "deleted"...\n');

    // Conectar a la base de datos
    await connectDB();

    // Buscar todos los usuarios que no tienen el campo 'deleted'
    const usersWithoutDeleted = await User.find({ deleted: { $exists: false } });

    console.log(`📊 Usuarios sin campo "deleted": ${usersWithoutDeleted.length}\n`);

    if (usersWithoutDeleted.length === 0) {
      console.log('✅ Todos los usuarios ya tienen el campo "deleted". No se necesita migración.\n');
      process.exit(0);
    }

    // Actualizar todos los usuarios sin el campo 'deleted'
    const result = await User.updateMany(
      { deleted: { $exists: false } },
      { $set: { deleted: false } }
    );

    console.log('✅ Migración completada exitosamente!\n');
    console.log(`📝 Detalles:`);
    console.log(`   - Usuarios encontrados: ${usersWithoutDeleted.length}`);
    console.log(`   - Usuarios actualizados: ${result.modifiedCount}`);
    console.log(`   - Operación exitosa: ${result.acknowledged ? 'Sí' : 'No'}\n`);

    // Verificar la migración
    console.log('🔍 Verificando migración...');
    const usersStillWithoutDeleted = await User.find({ deleted: { $exists: false } });
    const activeUsers = await User.findActive();

    console.log(`   - Usuarios sin campo "deleted": ${usersStillWithoutDeleted.length}`);
    console.log(`   - Usuarios activos: ${activeUsers.length}`);
    console.log('');

    if (usersStillWithoutDeleted.length === 0) {
      console.log('✅ Verificación exitosa! Todos los usuarios tienen el campo "deleted".\n');
    } else {
      console.log('⚠️  Advertencia: Algunos usuarios aún no tienen el campo "deleted".\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
};

// Ejecutar migración
migrateDeletedField();
