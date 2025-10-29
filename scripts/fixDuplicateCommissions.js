/**
 * Script para corregir comisiones duplicadas
 * Agregar el career_id al commission_id para hacerlas únicas
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/n8n-grading';

const commissionSchema = new mongoose.Schema({}, { strict: false });
const Commission = mongoose.model('Commission', commissionSchema);

async function fixDuplicates() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    // Obtener todas las comisiones activas
    const commissions = await Commission.find({ deleted: { $ne: true } });
    console.log(`📊 Total de comisiones encontradas: ${commissions.length}\n`);

    let updated = 0;
    let skipped = 0;

    for (const commission of commissions) {
      // Verificar si el commission_id ya incluye el career_id
      const careerSuffix = commission.career_id.split('-').pop(); // Ej: 'frm', 'frsn'
      
      if (!commission.commission_id.includes(commission.career_id) && 
          !commission.commission_id.endsWith(`-${careerSuffix}`)) {
        
        // Crear nuevo commission_id único
        const oldCommissionId = commission.commission_id;
        const newCommissionId = `${commission.commission_id}-${careerSuffix}`;
        
        console.log(`🔄 Actualizando: ${oldCommissionId} -> ${newCommissionId}`);
        
        // Actualizar el commission_id
        await Commission.updateOne(
          { _id: commission._id },
          { $set: { commission_id: newCommissionId } }
        );
        
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`\n✅ Proceso completado:`);
    console.log(`   - Comisiones actualizadas: ${updated}`);
    console.log(`   - Comisiones sin cambios: ${skipped}`);

    // Verificar que no haya duplicados
    console.log('\n🔍 Verificando duplicados después de la corrección...');
    const duplicates = await Commission.aggregate([
      { $match: { deleted: { $ne: true } } },
      {
        $group: {
          _id: {
            course_id: '$course_id',
            commission_id: '$commission_id'
          },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron duplicados después de la corrección');
    } else {
      console.log(`⚠️  Aún hay ${duplicates.length} duplicados:`);
      console.log(duplicates);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

fixDuplicates();
