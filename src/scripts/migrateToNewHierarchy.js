/**
 * Script de Migración a Nueva Jerarquía
 * Universidad → Facultad → Carrera → Materia (con año) → Comisión → Rúbrica (con tipo)
 *
 * IMPORTANTE: Este script debe ejecutarse UNA SOLA VEZ después de actualizar los modelos
 * y antes de iniciar el sistema con la nueva estructura.
 *
 * Uso: node src/scripts/migrateToNewHierarchy.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/database.js';

// Importar modelos antiguos
import University from '../models/University.js';
import Course from '../models/Course.js';
import Rubric from '../models/Rubric.js';

// Importar nuevos modelos
import Faculty from '../models/Faculty.js';
import Career from '../models/Career.js';
import Commission from '../models/Commission.js';

dotenv.config();

/**
 * Función principal de migración
 */
async function migrate() {
  try {
    console.log('');
    console.log('='.repeat(80));
    console.log('🔄 INICIANDO MIGRACIÓN A NUEVA JERARQUÍA');
    console.log('='.repeat(80));
    console.log('');

    // Conectar a la base de datos
    await connectDB();

    console.log('📊 Analizando datos existentes...\n');

    // 1. Obtener todas las universidades
    const universities = await University.find({ deleted: false });
    console.log(`✅ Encontradas ${universities.length} universidades activas\n`);

    if (universities.length === 0) {
      console.log('⚠️  No hay universidades para migrar. Saliendo...');
      process.exit(0);
    }

    // 2. Para cada universidad, crear estructura jerárquica por defecto
    for (const university of universities) {
      console.log(`\n📍 Procesando universidad: ${university.name} (${university.university_id})`);

      // Crear facultad por defecto si no existe
      const defaultFacultyId = `${university.university_id}-default`;
      let faculty = await Faculty.findOne({ faculty_id: defaultFacultyId });

      if (!faculty) {
        faculty = await Faculty.create({
          faculty_id: defaultFacultyId,
          name: `Facultad Principal - ${university.name}`,
          university_id: university.university_id,
        });
        console.log(`   ✅ Creada facultad por defecto: ${faculty.name}`);
      } else {
        console.log(`   ℹ️  Facultad por defecto ya existe: ${faculty.name}`);
      }

      // Crear carrera por defecto si no existe
      const defaultCareerId = `${university.university_id}-general`;
      let career = await Career.findOne({ career_id: defaultCareerId });

      if (!career) {
        career = await Career.create({
          career_id: defaultCareerId,
          name: `Carrera General - ${university.name}`,
          faculty_id: faculty.faculty_id,
          university_id: university.university_id,
        });
        console.log(`   ✅ Creada carrera por defecto: ${career.name}`);
      } else {
        console.log(`   ℹ️  Carrera por defecto ya existe: ${career.name}`);
      }

      // 3. Migrar cursos de esta universidad
      const courses = await Course.find({
        university_id: university.university_id,
        deleted: false,
      });

      console.log(`\n   📚 Migrando ${courses.length} cursos...`);

      for (const course of courses) {
        // Extraer año del course_id o usar año actual
        let year = new Date().getFullYear();
        const courseIdMatch = course.course_id.match(/^(\d{4})-/);
        if (courseIdMatch) {
          year = parseInt(courseIdMatch[1]);
        } else {
          // Si el course_id no tiene año, agregarlo
          const newCourseId = `${year}-${course.course_id}`;
          console.log(`      🔄 Actualizando course_id: ${course.course_id} → ${newCourseId}`);
          course.course_id = newCourseId;
        }

        // Actualizar curso con nueva jerarquía
        course.year = year;
        course.career_id = career.career_id;
        course.faculty_id = faculty.faculty_id;

        await course.save();
        console.log(`      ✅ Curso actualizado: ${course.name} (${course.course_id})`);

        // 4. Crear comisión por defecto para este curso
        const defaultCommissionId = `${course.course_id}-comision-1`;
        let commission = await Commission.findOne({ commission_id: defaultCommissionId });

        if (!commission) {
          commission = await Commission.create({
            commission_id: defaultCommissionId,
            name: `Comisión 1 - ${course.name}`,
            course_id: course.course_id,
            career_id: career.career_id,
            faculty_id: faculty.faculty_id,
            university_id: university.university_id,
            year: year,
          });
          console.log(`         ✅ Creada comisión por defecto: ${commission.name}`);
        } else {
          console.log(`         ℹ️  Comisión por defecto ya existe: ${commission.name}`);
        }

        // 5. Migrar rúbricas de este curso
        const rubrics = await Rubric.find({
          course_id: course.course_id,
          deleted: false,
        });

        console.log(`         📋 Migrando ${rubrics.length} rúbricas...`);

        for (let i = 0; i < rubrics.length; i++) {
          const rubric = rubrics[i];

          // Asignar tipo y número por defecto
          const rubricType = 'global'; // Tipo por defecto
          const rubricNumber = i + 1; // Número secuencial

          // Actualizar rúbrica con nueva jerarquía
          rubric.commission_id = commission.commission_id;
          rubric.career_id = career.career_id;
          rubric.faculty_id = faculty.faculty_id;
          rubric.rubric_type = rubricType;
          rubric.rubric_number = rubricNumber;
          rubric.year = year;

          // Regenerar rubric_id con nuevo formato
          rubric.rubric_id = Rubric.generateRubricId(
            commission.commission_id,
            rubricType,
            rubricNumber
          );

          await rubric.save();
          console.log(
            `            ✅ Rúbrica migrada: ${rubric.name} (tipo: ${rubricType}, número: ${rubricNumber})`
          );
        }
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(80));
    console.log('');
    console.log('📝 Resumen:');
    console.log(`   - ${universities.length} universidades procesadas`);
    console.log(`   - Facultades y carreras por defecto creadas`);
    console.log(`   - Cursos actualizados con nueva jerarquía`);
    console.log(`   - Comisiones por defecto creadas`);
    console.log(`   - Rúbricas migradas con tipo y número`);
    console.log('');
    console.log('⚠️  IMPORTANTE: Revise los datos migrados y ajuste según sea necesario.');
    console.log('   Puede crear nuevas facultades, carreras y comisiones desde el panel admin.');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('❌ ERROR DURANTE LA MIGRACIÓN');
    console.error('='.repeat(80));
    console.error('');
    console.error('Error:', error);
    console.error('');
    console.error('Stack trace:', error.stack);
    console.error('');
    console.error('⚠️  La migración ha fallado. Por favor revise el error e intente nuevamente.');
    console.error('');
    process.exit(1);
  }
}

// Ejecutar migración
console.log('');
console.log('⚠️  ADVERTENCIA: Este script modificará la estructura de datos existente.');
console.log('   Asegúrese de tener un backup de la base de datos antes de continuar.');
console.log('');
console.log('Iniciando en 3 segundos...');
console.log('');

setTimeout(() => {
  migrate();
}, 3000);
