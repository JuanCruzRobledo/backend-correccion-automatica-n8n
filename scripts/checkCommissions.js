/**
 * Script para verificar comisiones en la base de datos
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

// Modelo Commission simplificado
const commissionSchema = new mongoose.Schema({
  commission_id: String,
  name: String,
  course_id: String,
  career_id: String,
  faculty_id: String,
  university_id: String,
  year: Number,
  deleted: Boolean,
}, { collection: 'commissions' });

const Commission = mongoose.model('Commission', commissionSchema);

async function checkCommissions() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Contar todas las comisiones
    const totalCount = await Commission.countDocuments({});
    console.log(`📊 Total de comisiones en BD: ${totalCount}`);

    // Contar comisiones no eliminadas
    const activeCount = await Commission.countDocuments({ deleted: false });
    console.log(`✅ Comisiones activas (deleted: false): ${activeCount}`);

    // Contar comisiones eliminadas
    const deletedCount = await Commission.countDocuments({ deleted: true });
    console.log(`🗑️  Comisiones eliminadas (deleted: true): ${deletedCount}\n`);

    if (activeCount === 0) {
      console.log('⚠️  NO HAY COMISIONES ACTIVAS EN LA BASE DE DATOS');
      console.log('💡 Ejecuta el seed: node scripts/seedDatabase.js\n');
    } else {
      console.log('📋 Primeras 5 comisiones activas:');
      const commissions = await Commission.find({ deleted: false }).limit(5);
      commissions.forEach((c, i) => {
        console.log(`\n${i + 1}. ${c.name}`);
        console.log(`   - ID: ${c.commission_id}`);
        console.log(`   - Universidad: ${c.university_id}`);
        console.log(`   - Facultad: ${c.faculty_id}`);
        console.log(`   - Carrera: ${c.career_id}`);
        console.log(`   - Materia: ${c.course_id}`);
        console.log(`   - Año: ${c.year}`);
        console.log(`   - Deleted: ${c.deleted}`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCommissions();
