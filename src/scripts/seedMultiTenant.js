/**
 * Seed de Datos Multi-Tenant
 * Crea estructura completa de datos para testing del sistema
 *
 * Incluye:
 * - 2 Universidades
 * - Facultades, Carreras, Cursos por universidad
 * - Comisiones con profesores asignados
 * - Usuarios con diferentes roles
 * - Rúbricas de ejemplo
 *
 * Uso: node src/scripts/seedMultiTenant.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import University from '../models/University.js';
import Faculty from '../models/Faculty.js';
import Career from '../models/Career.js';
import Course from '../models/Course.js';
import Commission from '../models/Commission.js';
import Rubric from '../models/Rubric.js';

dotenv.config();

// Configuración de datos
const SEED_DATA = {
  universities: [
    {
      university_id: 'utn',
      name: 'Universidad Tecnológica Nacional',
      deleted: false,
    },
    {
      university_id: 'uba',
      name: 'Universidad de Buenos Aires',
      deleted: false,
    },
  ],

  // Usuarios del sistema
  users: [
    // Super Admin (sin university_id)
    {
      username: 'superadmin',
      name: 'Super Administrador',
      password: 'admin123',
      role: 'super-admin',
      university_id: null,
    },

    // UTN - University Admin
    {
      username: 'admin-utn',
      name: 'Administrador UTN',
      password: 'admin123',
      role: 'university-admin',
      university_id: 'utn',
    },

    // UTN - Profesores
    {
      username: 'prof-garcia',
      name: 'María García',
      password: 'prof123',
      role: 'professor',
      university_id: 'utn',
    },
    {
      username: 'prof-lopez',
      name: 'Juan López',
      password: 'prof123',
      role: 'professor',
      university_id: 'utn',
    },

    // UTN - Usuario normal
    {
      username: 'estudiante-utn',
      name: 'Estudiante UTN',
      password: 'user123',
      role: 'user',
      university_id: 'utn',
    },

    // UBA - University Admin
    {
      username: 'admin-uba',
      name: 'Administrador UBA',
      password: 'admin123',
      role: 'university-admin',
      university_id: 'uba',
    },

    // UBA - Profesor
    {
      username: 'prof-rodriguez',
      name: 'Carlos Rodriguez',
      password: 'prof123',
      role: 'professor',
      university_id: 'uba',
    },

    // UBA - Usuario normal
    {
      username: 'estudiante-uba',
      name: 'Estudiante UBA',
      password: 'user123',
      role: 'user',
      university_id: 'uba',
    },
  ],

  // Estructura UTN
  utn: {
    faculties: [
      {
        faculty_id: 'frba',
        name: 'Facultad Regional Buenos Aires',
        university_id: 'utn',
      },
    ],
    careers: [
      {
        career_id: 'isi',
        name: 'Ingeniería en Sistemas de Información',
        faculty_id: 'frba',
        university_id: 'utn',
      },
    ],
    courses: [
      {
        course_id: 'disenio',
        name: 'Diseño de Sistemas',
        year: 2025,
        career_id: 'isi',
        faculty_id: 'frba',
        university_id: 'utn',
      },
      {
        course_id: 'paradigmas',
        name: 'Paradigmas de Programación',
        year: 2025,
        career_id: 'isi',
        faculty_id: 'frba',
        university_id: 'utn',
      },
    ],
    commissions: [
      {
        commission_id: '1k1',
        name: 'Comisión 1K1',
        course_id: 'disenio',
        career_id: 'isi',
        faculty_id: 'frba',
        university_id: 'utn',
        year: 2025,
        professor_name: 'María García',
        professor_email: 'garcia@utn.edu.ar',
      },
      {
        commission_id: '1k2',
        name: 'Comisión 1K2',
        course_id: 'disenio',
        career_id: 'isi',
        faculty_id: 'frba',
        university_id: 'utn',
        year: 2025,
        professor_name: 'Juan López',
        professor_email: 'lopez@utn.edu.ar',
      },
      {
        commission_id: '2k1',
        name: 'Comisión 2K1',
        course_id: 'paradigmas',
        career_id: 'isi',
        faculty_id: 'frba',
        university_id: 'utn',
        year: 2025,
        professor_name: 'María García',
        professor_email: 'garcia@utn.edu.ar',
      },
    ],
  },

  // Estructura UBA
  uba: {
    faculties: [
      {
        faculty_id: 'fcen',
        name: 'Facultad de Ciencias Exactas y Naturales',
        university_id: 'uba',
      },
    ],
    careers: [
      {
        career_id: 'lic-cs',
        name: 'Licenciatura en Ciencias de la Computación',
        faculty_id: 'fcen',
        university_id: 'uba',
      },
    ],
    courses: [
      {
        course_id: 'algo2',
        name: 'Algoritmos y Estructuras de Datos II',
        year: 2025,
        career_id: 'lic-cs',
        faculty_id: 'fcen',
        university_id: 'uba',
      },
    ],
    commissions: [
      {
        commission_id: 'comision-1',
        name: 'Comisión 1',
        course_id: 'algo2',
        career_id: 'lic-cs',
        faculty_id: 'fcen',
        university_id: 'uba',
        year: 2025,
        professor_name: 'Carlos Rodriguez',
        professor_email: 'rodriguez@uba.ar',
      },
    ],
  },

  // Rúbricas de ejemplo
  rubrics: [
    {
      rubric_id: 'tp1-disenio-2025',
      name: 'TP1 - Diseño de Sistemas',
      commission_id: '1k1',
      course_id: 'disenio',
      career_id: 'isi',
      faculty_id: 'frba',
      university_id: 'utn',
      rubric_type: 'tp',
      rubric_number: 1,
      year: 2025,
      source: 'manual',
      rubric_json: {
        rubric_id: 'tp1-disenio-2025',
        title: 'TP1 - Diseño Orientado a Objetos',
        assessment_type: 'tp',
        course: 'Diseño de Sistemas',
        language_or_stack: ['Java', 'UML'],
        grading: {
          policy: 'weighted_sum',
          rounding: 'nearest_integer',
          total_points: 100,
        },
        criteria: [
          {
            id: 'diseño',
            name: 'Diseño Orientado a Objetos',
            weight: 0.4,
            description: 'Aplicación correcta de principios OO',
          },
          {
            id: 'implementacion',
            name: 'Implementación',
            weight: 0.3,
            description: 'Código funcional y bien estructurado',
          },
          {
            id: 'documentacion',
            name: 'Documentación',
            weight: 0.3,
            description: 'Diagramas UML y comentarios',
          },
        ],
      },
      drive_folder_id: null, // Se debe crear manualmente en Drive
    },
  ],
};

/**
 * Conectar a MongoDB
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

/**
 * Limpiar base de datos
 */
const clearDatabase = async () => {
  console.log('\n🗑️  Limpiando base de datos...');

  await User.deleteMany({});
  await University.deleteMany({});
  await Faculty.deleteMany({});
  await Career.deleteMany({});
  await Course.deleteMany({});
  await Commission.deleteMany({});
  await Rubric.deleteMany({});

  console.log('✅ Base de datos limpiada');
};

/**
 * Crear universidades
 */
const createUniversities = async () => {
  console.log('\n🏛️  Creando universidades...');

  for (const uniData of SEED_DATA.universities) {
    const university = new University(uniData);
    await university.save();
    console.log(`   ✓ Universidad creada: ${university.name}`);
  }
};

/**
 * Crear usuarios
 */
const createUsers = async () => {
  console.log('\n👥 Creando usuarios...');

  for (const userData of SEED_DATA.users) {
    const user = new User(userData);
    await user.save();
    console.log(`   ✓ Usuario creado: ${user.username} (${user.role})`);
  }
};

/**
 * Crear estructura de una universidad
 */
const createUniversityStructure = async (universityId, structure) => {
  console.log(`\n📚 Creando estructura para ${universityId.toUpperCase()}...`);

  // Facultades
  for (const facData of structure.faculties) {
    const faculty = new Faculty(facData);
    await faculty.save();
    console.log(`   ✓ Facultad: ${faculty.name}`);
  }

  // Carreras
  for (const carData of structure.careers) {
    const career = new Career(carData);
    await career.save();
    console.log(`   ✓ Carrera: ${career.name}`);
  }

  // Cursos
  for (const courseData of structure.courses) {
    const course = new Course(courseData);
    await course.save();
    console.log(`   ✓ Curso: ${course.name}`);
  }

  // Comisiones
  for (const commData of structure.commissions) {
    const commission = new Commission(commData);
    await commission.save();
    console.log(`   ✓ Comisión: ${commission.name}`);
  }
};

/**
 * Asignar profesores a comisiones
 */
const assignProfessors = async () => {
  console.log('\n👨‍🏫 Asignando profesores a comisiones...');

  // UTN - María García a comisiones 1k1 y 2k1
  const profGarcia = await User.findOne({ username: 'prof-garcia' });
  const comm1k1 = await Commission.findOne({ commission_id: '1k1' });
  const comm2k1 = await Commission.findOne({ commission_id: '2k1' });

  if (profGarcia && comm1k1) {
    await comm1k1.assignProfessor(profGarcia._id);
    console.log(`   ✓ María García asignada a ${comm1k1.name}`);
  }

  if (profGarcia && comm2k1) {
    await comm2k1.assignProfessor(profGarcia._id);
    console.log(`   ✓ María García asignada a ${comm2k1.name}`);
  }

  // UTN - Juan López a comisión 1k2
  const profLopez = await User.findOne({ username: 'prof-lopez' });
  const comm1k2 = await Commission.findOne({ commission_id: '1k2' });

  if (profLopez && comm1k2) {
    await comm1k2.assignProfessor(profLopez._id);
    console.log(`   ✓ Juan López asignado a ${comm1k2.name}`);
  }

  // UBA - Carlos Rodriguez a comisión 1
  const profRodriguez = await User.findOne({ username: 'prof-rodriguez' });
  const commUba1 = await Commission.findOne({ commission_id: 'comision-1' });

  if (profRodriguez && commUba1) {
    await commUba1.assignProfessor(profRodriguez._id);
    console.log(`   ✓ Carlos Rodriguez asignado a ${commUba1.name}`);
  }
};

/**
 * Crear rúbricas
 */
const createRubrics = async () => {
  console.log('\n📋 Creando rúbricas...');

  for (const rubricData of SEED_DATA.rubrics) {
    const rubric = new Rubric(rubricData);
    await rubric.save();
    console.log(`   ✓ Rúbrica: ${rubric.name}`);
  }
};

/**
 * Mostrar resumen
 */
const showSummary = async () => {
  console.log('\n📊 RESUMEN DE DATOS CREADOS:\n');

  const counts = {
    users: await User.countDocuments(),
    universities: await University.countDocuments(),
    faculties: await Faculty.countDocuments(),
    careers: await Career.countDocuments(),
    courses: await Course.countDocuments(),
    commissions: await Commission.countDocuments(),
    rubrics: await Rubric.countDocuments(),
  };

  console.log(`   Usuarios:      ${counts.users}`);
  console.log(`   Universidades: ${counts.universities}`);
  console.log(`   Facultades:    ${counts.faculties}`);
  console.log(`   Carreras:      ${counts.careers}`);
  console.log(`   Cursos:        ${counts.courses}`);
  console.log(`   Comisiones:    ${counts.commissions}`);
  console.log(`   Rúbricas:      ${counts.rubrics}`);

  console.log('\n👥 USUARIOS DE PRUEBA:\n');
  console.log('   Super Admin:');
  console.log('     Usuario: superadmin');
  console.log('     Contraseña: admin123');
  console.log('\n   UTN Admin:');
  console.log('     Usuario: admin-utn');
  console.log('     Contraseña: admin123');
  console.log('\n   Profesor UTN (María García):');
  console.log('     Usuario: prof-garcia');
  console.log('     Contraseña: prof123');
  console.log('     Comisiones: 1K1, 2K1');
  console.log('\n   Profesor UTN (Juan López):');
  console.log('     Usuario: prof-lopez');
  console.log('     Contraseña: prof123');
  console.log('     Comisiones: 1K2');
  console.log('\n   UBA Admin:');
  console.log('     Usuario: admin-uba');
  console.log('     Contraseña: admin123');
  console.log('\n   Profesor UBA:');
  console.log('     Usuario: prof-rodriguez');
  console.log('     Contraseña: prof123');
  console.log('     Comisiones: Comisión 1');
};

/**
 * Ejecutar seed
 */
const runSeed = async () => {
  try {
    console.log('🌱 Iniciando seed de datos multi-tenant...\n');

    await connectDB();
    await clearDatabase();
    await createUniversities();
    await createUsers();
    await createUniversityStructure('utn', SEED_DATA.utn);
    await createUniversityStructure('uba', SEED_DATA.uba);
    await assignProfessors();
    await createRubrics();
    await showSummary();

    console.log('\n✅ Seed completado exitosamente!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    process.exit(1);
  }
};

// Ejecutar
runSeed();
