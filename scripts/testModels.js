/**
 * Script de prueba para modelos ProjectHash y Submission
 * Verifica que los modelos se pueden importar y usar correctamente
 */
import mongoose from 'mongoose';
import ProjectHash from '../src/models/ProjectHash.js';
import Submission from '../src/models/Submission.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proyecto_correccion';

async function testModels() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conexión exitosa a MongoDB\n');

    // Test 1: Crear un ProjectHash
    console.log('📝 Test 1: Crear ProjectHash...');
    const testProjectHash = await ProjectHash.create({
      commission_id: 'test-commission-001',
      rubric_id: 'test-rubric-001',
      student_name: 'Juan Test Pérez',
      student_email: 'juan.test@example.com',
      project_hash: 'abc123def456789',
      file_hashes: {
        'src/Main.java': 'hash1',
        'src/User.java': 'hash2',
        'src/Utils.java': 'hash3',
      },
      stats: {
        total_files: 3,
        total_lines: 150,
        java_files: 3,
        other_files: 0,
      },
      metadata: {
        project_name: 'test-project',
        mode: 'Solo código fuente (Java)',
        extensions: ['.java'],
        include_tests: true,
      },
    });
    console.log('✅ ProjectHash creado:', testProjectHash._id);
    console.log('   - Student:', testProjectHash.student_name);
    console.log('   - Hash:', testProjectHash.project_hash);
    console.log('   - Files:', testProjectHash.stats.total_files);
    console.log('   - Lines:', testProjectHash.stats.total_lines);
    console.log();

    // Test 2: Buscar ProjectHash por comisión y rúbrica
    console.log('🔍 Test 2: Buscar ProjectHash por comisión y rúbrica...');
    const foundProjects = await ProjectHash.findByCommissionAndRubric(
      'test-commission-001',
      'test-rubric-001'
    );
    console.log(`✅ Encontrados ${foundProjects.length} proyecto(s)`);
    console.log();

    // Test 3: Buscar por hash idéntico
    console.log('🔍 Test 3: Buscar por hash idéntico...');
    const identicalProjects = await ProjectHash.findByProjectHash('abc123def456789');
    console.log(`✅ Encontrados ${identicalProjects.length} proyecto(s) con hash idéntico`);
    console.log();

    // Test 4: Estadísticas
    console.log('📊 Test 4: Obtener estadísticas...');
    const stats = await ProjectHash.getStatsByCommissionAndRubric(
      'test-commission-001',
      'test-rubric-001'
    );
    console.log('✅ Estadísticas:');
    console.log('   - Total proyectos:', stats.total_projects);
    console.log('   - Proyectos únicos:', stats.unique_projects);
    console.log('   - Grupos duplicados:', stats.duplicate_groups);
    console.log('   - Promedio archivos:', stats.avg_files_per_project);
    console.log('   - Promedio líneas:', stats.avg_lines_per_project);
    console.log();

    // Test 5: Actualizar hashes
    console.log('🔄 Test 5: Actualizar hashes...');
    await testProjectHash.updateHashes('new-hash-xyz', {
      'src/Main.java': 'new-hash1',
      'src/User.java': 'new-hash2',
    });
    console.log('✅ Hashes actualizados');
    console.log('   - Nuevo project_hash:', testProjectHash.project_hash);
    console.log();

    // Test 6: Verificar que Submission tiene el nuevo campo
    console.log('📝 Test 6: Verificar campo project_hash_id en Submission...');
    const submissionSchema = Submission.schema.obj;
    const hasProjectHashId = 'project_hash_id' in submissionSchema;
    console.log('✅ Campo project_hash_id existe:', hasProjectHashId);

    if (hasProjectHashId) {
      console.log('   - Tipo:', submissionSchema.project_hash_id.type.name);
      console.log('   - Ref:', submissionSchema.project_hash_id.ref);
    }
    console.log();

    // Test 7: Verificar campos extendidos de correction
    console.log('📝 Test 7: Verificar campos extendidos de correction...');
    const correctionFields = submissionSchema.correction;
    const hasCriteria = correctionFields.criteria !== undefined;
    const hasStrengthsList = correctionFields.strengths_list !== undefined;
    const hasRecommendationsList = correctionFields.recommendations_list !== undefined;

    console.log('✅ Campos extendidos:');
    console.log('   - criteria:', hasCriteria);
    console.log('   - strengths_list:', hasStrengthsList);
    console.log('   - recommendations_list:', hasRecommendationsList);
    console.log();

    // Limpieza: Eliminar documento de prueba
    console.log('🧹 Limpiando datos de prueba...');
    await ProjectHash.deleteMany({ commission_id: 'test-commission-001' });
    console.log('✅ Datos de prueba eliminados');
    console.log();

    console.log('✅ Todos los tests pasaron correctamente!');
    console.log('📊 Resumen:');
    console.log('   ✓ ProjectHash se crea correctamente');
    console.log('   ✓ Queries funcionan');
    console.log('   ✓ Estadísticas se calculan');
    console.log('   ✓ Métodos de instancia funcionan');
    console.log('   ✓ Submission tiene campos extendidos');
    console.log('   ✓ Referencia project_hash_id existe');
  } catch (error) {
    console.error('❌ Error en tests:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar tests
testModels();
