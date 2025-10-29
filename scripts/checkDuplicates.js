/**
 * Script para verificar comisiones duplicadas
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/n8n-grading';

// Definir el schema de Commission
const commissionSchema = new mongoose.Schema({}, { strict: false });
const Commission = mongoose.model('Commission', commissionSchema);

async function checkDuplicates() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    // Buscar comisiones duplicadas por course_id y commission_id
    console.log('🔍 Buscando comisiones duplicadas...\n');
    const duplicates = await Commission.aggregate([
      { $match: { deleted: { $ne: true } } },
      {
        $group: {
          _id: {
            course_id: '$course_id',
            commission_id: '$commission_id'
          },
          count: { $sum: 1 },
          docs: {
            $push: {
              _id: '$_id',
              name: '$name',
              year: '$year',
              career_id: '$career_id'
            }
          }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron comisiones duplicadas');
    } else {
      console.log(`⚠️  Se encontraron ${duplicates.length} grupos de comisiones duplicadas:\n`);
      duplicates.forEach((dup, index) => {
        console.log(`${index + 1}. course_id: "${dup._id.course_id}", commission_id: "${dup._id.commission_id}"`);
        console.log(`   Cantidad: ${dup.count} registros`);
        dup.docs.forEach((doc, i) => {
          console.log(`   ${i + 1}) ID: ${doc._id}, Name: "${doc.name}", Year: ${doc.year}, Career: ${doc.career_id}`);
        });
        console.log('');
      });
    }

    // Buscar todas las comisiones para un curso específico (ejemplo)
    console.log('🔍 Ejemplo: buscando comisiones de un curso...\n');
    const allCommissions = await Commission.find({ deleted: { $ne: true } }).limit(5);
    console.log(`Primeras 5 comisiones en la base de datos:`);
    allCommissions.forEach((comm, i) => {
      console.log(`${i + 1}. ${comm.commission_id} - ${comm.name} (course: ${comm.course_id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

checkDuplicates();
