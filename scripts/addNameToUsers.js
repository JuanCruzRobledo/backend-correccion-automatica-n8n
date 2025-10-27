/**
 * Script para agregar el campo 'name' a usuarios existentes
 * Ejecutar con: node scripts/addNameToUsers.js
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/database.js';
import User from '../src/models/User.js';

// Cargar variables de entorno
dotenv.config();

const addNameToUsers = async () => {
  try {
    console.log('🔄 Iniciando migración del campo "name"...\n');

    // Conectar a la base de datos
    await connectDB();

    // Buscar todos los usuarios que no tienen el campo 'name'
    const usersWithoutName = await User.find({ name: { $exists: false } });

    console.log(`📊 Usuarios sin campo "name": ${usersWithoutName.length}\n`);

    if (usersWithoutName.length === 0) {
      console.log('✅ Todos los usuarios ya tienen el campo "name". No se necesita migración.\n');
      process.exit(0);
    }

    // Actualizar cada usuario sin el campo 'name'
    let updatedCount = 0;
    for (const user of usersWithoutName) {
      // Generar nombre basado en username
      // Capitalizar primera letra
      const generatedName = user.username.charAt(0).toUpperCase() + user.username.slice(1);

      user.name = generatedName;
      await user.save();
      updatedCount++;

      console.log(`   ✅ Usuario actualizado: ${user.username} -> name: "${generatedName}"`);
    }

    console.log('\n✅ Migración completada exitosamente!\n');
    console.log(`📝 Detalles:`);
    console.log(`   - Usuarios encontrados: ${usersWithoutName.length}`);
    console.log(`   - Usuarios actualizados: ${updatedCount}\n`);

    // Verificar la migración
    console.log('🔍 Verificando migración...');
    const usersStillWithoutName = await User.find({ name: { $exists: false } });
    const allUsers = await User.find({});

    console.log(`   - Usuarios sin campo "name": ${usersStillWithoutName.length}`);
    console.log(`   - Total de usuarios: ${allUsers.length}`);
    console.log('');

    if (usersStillWithoutName.length === 0) {
      console.log('✅ Verificación exitosa! Todos los usuarios tienen el campo "name".\n');
    } else {
      console.log('⚠️  Advertencia: Algunos usuarios aún no tienen el campo "name".\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
};

// Ejecutar migración
addNameToUsers();
