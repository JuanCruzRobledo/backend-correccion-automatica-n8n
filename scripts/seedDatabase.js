/**
 * Script de migración de datos iniciales
 * Migra universidades, facultades, carreras, cursos, comisiones, rúbricas y usuarios
 * con la nueva jerarquía completa
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/database.js';
import University from '../src/models/University.js';
import Faculty from '../src/models/Faculty.js';
import Career from '../src/models/Career.js';
import Course from '../src/models/Course.js';
import Commission from '../src/models/Commission.js';
import Rubric, { RUBRIC_TYPES } from '../src/models/Rubric.js';
import User from '../src/models/User.js';

// Cargar variables de entorno
dotenv.config();

/**
 * Datos de universidades
 * 2 universidades: UTN y UBA
 */
const universities = [
  { university_id: 'utn', name: 'Universidad Tecnológica Nacional (UTN)' },
  { university_id: 'uba', name: 'Universidad de Buenos Aires (UBA)' },
];

/**
 * Datos de facultades
 * UTN: Regionales (FRM, FRSN, FRA, FRBA)
 * UBA: Facultades tradicionales (FIUBA, FCEyN)
 */
const faculties = [
  // UTN - Regionales
  { faculty_id: 'frm', name: 'Facultad Regional Mendoza', university_id: 'utn' },
  { faculty_id: 'frsn', name: 'Facultad Regional San Nicolás', university_id: 'utn' },
  { faculty_id: 'fra', name: 'Facultad Regional Avellaneda', university_id: 'utn' },
  { faculty_id: 'frba', name: 'Facultad Regional Buenos Aires', university_id: 'utn' },

  // UBA - Facultades
  { faculty_id: 'fiuba', name: 'Facultad de Ingeniería (FIUBA)', university_id: 'uba' },
  { faculty_id: 'fcen', name: 'Facultad de Ciencias Exactas y Naturales (FCEyN)', university_id: 'uba' },
];

/**
 * Datos de carreras
 * UTN: ISI en cada regional
 * UBA: Ingeniería Informática (FIUBA) y Lic. en Ciencias de la Computación (FCEyN)
 */
const careers = [
  // UTN - Ingeniería en Sistemas de Información
  { career_id: 'isi-frm', name: 'Ingeniería en Sistemas de Información', faculty_id: 'frm', university_id: 'utn' },
  { career_id: 'isi-frsn', name: 'Ingeniería en Sistemas de Información', faculty_id: 'frsn', university_id: 'utn' },
  { career_id: 'isi-fra', name: 'Ingeniería en Sistemas de Información', faculty_id: 'fra', university_id: 'utn' },
  { career_id: 'isi-frba', name: 'Ingeniería en Sistemas de Información', faculty_id: 'frba', university_id: 'utn' },

  // UBA - Carreras de computación
  { career_id: 'ing-informatica-fiuba', name: 'Ingeniería Informática', faculty_id: 'fiuba', university_id: 'uba' },
  { career_id: 'lic-computacion-fcen', name: 'Licenciatura en Ciencias de la Computación', faculty_id: 'fcen', university_id: 'uba' },
];

/**
 * Datos de cursos (ahora con año y nueva jerarquía)
 * IMPORTANTE: course_id debe ser único, incluye career_id para evitar duplicados
 */
const currentYear = 2025;
const courses = [
  // UTN FRM - ISI
  { course_id: `${currentYear}-isi-frm-programacion-1`, name: 'Programación 1', year: currentYear, career_id: 'isi-frm', faculty_id: 'frm', university_id: 'utn' },
  { course_id: `${currentYear}-isi-frm-programacion-2`, name: 'Programación 2', year: currentYear, career_id: 'isi-frm', faculty_id: 'frm', university_id: 'utn' },
  { course_id: `${currentYear}-isi-frm-programacion-3`, name: 'Programación 3', year: currentYear, career_id: 'isi-frm', faculty_id: 'frm', university_id: 'utn' },
  { course_id: `${currentYear}-isi-frm-bases-de-datos-1`, name: 'Bases de Datos 1', year: currentYear, career_id: 'isi-frm', faculty_id: 'frm', university_id: 'utn' },
  { course_id: `${currentYear}-isi-frm-disenio-de-sistemas`, name: 'Diseño de Sistemas', year: currentYear, career_id: 'isi-frm', faculty_id: 'frm', university_id: 'utn' },

  // UTN FRSN - ISI
  { course_id: `${currentYear}-isi-frsn-programacion-1`, name: 'Programación 1', year: currentYear, career_id: 'isi-frsn', faculty_id: 'frsn', university_id: 'utn' },
  { course_id: `${currentYear}-isi-frsn-programacion-2`, name: 'Programación 2', year: currentYear, career_id: 'isi-frsn', faculty_id: 'frsn', university_id: 'utn' },
  { course_id: `${currentYear}-isi-frsn-programacion-3`, name: 'Programación 3', year: currentYear, career_id: 'isi-frsn', faculty_id: 'frsn', university_id: 'utn' },
  { course_id: `${currentYear}-isi-frsn-bases-de-datos-1`, name: 'Bases de Datos 1', year: currentYear, career_id: 'isi-frsn', faculty_id: 'frsn', university_id: 'utn' },

  // UTN FRA - ISI
  { course_id: `${currentYear}-isi-fra-programacion-1`, name: 'Programación 1', year: currentYear, career_id: 'isi-fra', faculty_id: 'fra', university_id: 'utn' },
  { course_id: `${currentYear}-isi-fra-programacion-2`, name: 'Programación 2', year: currentYear, career_id: 'isi-fra', faculty_id: 'fra', university_id: 'utn' },
  { course_id: `${currentYear}-isi-fra-programacion-3`, name: 'Programación 3', year: currentYear, career_id: 'isi-fra', faculty_id: 'fra', university_id: 'utn' },
  { course_id: `${currentYear}-isi-fra-bases-de-datos-1`, name: 'Bases de Datos 1', year: currentYear, career_id: 'isi-fra', faculty_id: 'fra', university_id: 'utn' },

  // UTN FRBA - ISI
  { course_id: `${currentYear}-isi-frba-programacion-1`, name: 'Programación 1', year: currentYear, career_id: 'isi-frba', faculty_id: 'frba', university_id: 'utn' },
  { course_id: `${currentYear}-isi-frba-programacion-2`, name: 'Programación 2', year: currentYear, career_id: 'isi-frba', faculty_id: 'frba', university_id: 'utn' },
  { course_id: `${currentYear}-isi-frba-programacion-3`, name: 'Programación 3', year: currentYear, career_id: 'isi-frba', faculty_id: 'frba', university_id: 'utn' },
  { course_id: `${currentYear}-isi-frba-bases-de-datos-1`, name: 'Bases de Datos 1', year: currentYear, career_id: 'isi-frba', faculty_id: 'frba', university_id: 'utn' },

  // UBA FIUBA - Ingeniería Informática
  { course_id: `${currentYear}-ing-informatica-fiuba-algoritmos-1`, name: 'Algoritmos y Programación I', year: currentYear, career_id: 'ing-informatica-fiuba', faculty_id: 'fiuba', university_id: 'uba' },
  { course_id: `${currentYear}-ing-informatica-fiuba-algoritmos-2`, name: 'Algoritmos y Programación II', year: currentYear, career_id: 'ing-informatica-fiuba', faculty_id: 'fiuba', university_id: 'uba' },
  { course_id: `${currentYear}-ing-informatica-fiuba-algoritmos-3`, name: 'Algoritmos y Programación III', year: currentYear, career_id: 'ing-informatica-fiuba', faculty_id: 'fiuba', university_id: 'uba' },
  { course_id: `${currentYear}-ing-informatica-fiuba-base-de-datos`, name: 'Base de Datos', year: currentYear, career_id: 'ing-informatica-fiuba', faculty_id: 'fiuba', university_id: 'uba' },
  { course_id: `${currentYear}-ing-informatica-fiuba-taller-de-programacion`, name: 'Taller de Programación I', year: currentYear, career_id: 'ing-informatica-fiuba', faculty_id: 'fiuba', university_id: 'uba' },

  // UBA FCEyN - Lic. en Ciencias de la Computación
  { course_id: `${currentYear}-lic-computacion-fcen-algoritmos-1`, name: 'Algoritmos y Estructuras de Datos I', year: currentYear, career_id: 'lic-computacion-fcen', faculty_id: 'fcen', university_id: 'uba' },
  { course_id: `${currentYear}-lic-computacion-fcen-algoritmos-2`, name: 'Algoritmos y Estructuras de Datos II', year: currentYear, career_id: 'lic-computacion-fcen', faculty_id: 'fcen', university_id: 'uba' },
  { course_id: `${currentYear}-lic-computacion-fcen-algoritmos-3`, name: 'Algoritmos y Estructuras de Datos III', year: currentYear, career_id: 'lic-computacion-fcen', faculty_id: 'fcen', university_id: 'uba' },
  { course_id: `${currentYear}-lic-computacion-fcen-bases-de-datos`, name: 'Bases de Datos', year: currentYear, career_id: 'lic-computacion-fcen', faculty_id: 'fcen', university_id: 'uba' },
];

/**
 * Rúbrica 1: TP Listas (Programación 1)
 * Rúbrica completa importada desde App.tsx
 */
const rubric1JSON = {
  rubric_id: 'practico-5-listas',
  title: 'Práctico 5: Listas',
  version: '1.0',
  assessment_type: 'tp',
  course: 'Programación 1',
  language_or_stack: ['python'],
  submission: {
    single_file: true,
    accepted_extensions: ['.py'],
    delivery_channel: 'plataforma',
    constraints: [
      'El código fuente debe ser entregado en un único archivo Python (.py).',
    ],
  },
  grading: {
    policy: 'weighted_average',
    rounding: 'half_up',
    total_points: 100,
  },
  criteria: [
    {
      id: 'C1',
      name: 'Correctitud y Funcionalidad',
      weight: 0.35,
      description:
        'El código funciona correctamente, produce los resultados esperados según las consignas, y los cálculos son precisos.',
      subcriteria: [],
    },
    {
      id: 'C2',
      name: 'Manipulación de Listas (simples y anidadas)',
      weight: 0.25,
      description:
        'Aplicación correcta de conceptos fundamentales de listas: creación, indexación, slicing, modificación de elementos, uso de métodos integrados (ej. append, remove, sorted) y manejo adecuado de listas anidadas (matrices).',
      subcriteria: [],
    },
    {
      id: 'C3',
      name: 'Uso de Estructuras Repetitivas y Control de Flujo',
      weight: 0.15,
      description:
        "Implementación efectiva de bucles (for, while) y condicionales (if/else) para recorrer listas, realizar operaciones y presentar resultados.",
      subcriteria: [],
    },
    {
      id: 'C4',
      name: 'Legibilidad y Buenas Prácticas de Programación',
      weight: 0.15,
      description:
        'El código es claro, fácil de entender, utiliza nombres de variables significativos, está bien comentado donde sea necesario y sigue convenciones básicas de estilo (ej. indentación adecuada).',
      subcriteria: [],
    },
    {
      id: 'C5',
      name: 'Resolución de Problemas Específicos',
      weight: 0.1,
      description:
        'Capacidad para abordar y resolver requisitos particulares de las consignas.',
      subcriteria: [],
    },
  ],
  penalties: [
    {
      description: 'Plagio detectado en cualquier parte del código.',
      penalty_percent: 100,
    },
    {
      description: 'Entrega fuera de formato o con extensiones incorrectas.',
      penalty_percent: 10,
    },
  ],
  mandatory_fail_conditions: [],
  tasks: [
    {
      label: 'T1',
      prompt_excerpt:
        'Crear una lista con las notas de 10 estudiantes. Mostrar la lista, promedio, nota más alta y más baja.',
      points: 10,
      links_to_criteria: ['C1', 'C2', 'C3'],
    },
    {
      label: 'T2',
      prompt_excerpt:
        'Pedir al usuario que cargue 5 productos, mostrar ordenada alfabéticamente, eliminar un producto solicitado.',
      points: 10,
      links_to_criteria: ['C1', 'C2', 'C3', 'C5'],
    },
    {
      label: 'T3',
      prompt_excerpt:
        'Generar lista con 15 números al azar, separar en pares e impares.',
      points: 10,
      links_to_criteria: ['C1', 'C2', 'C3'],
    },
    {
      label: 'T4',
      prompt_excerpt:
        'Dada lista con valores repetidos, crear lista sin duplicados.',
      points: 10,
      links_to_criteria: ['C1', 'C2', 'C3', 'C5'],
    },
    {
      label: 'T5',
      prompt_excerpt:
        'Crear lista de nombres de estudiantes, agregar o eliminar.',
      points: 10,
      links_to_criteria: ['C1', 'C2', 'C3'],
    },
    {
      label: 'T6',
      prompt_excerpt:
        'Rotar elementos de lista una posición a la derecha.',
      points: 10,
      links_to_criteria: ['C1', 'C2', 'C5'],
    },
    {
      label: 'T7',
      prompt_excerpt:
        'Matriz de temperaturas, calcular amplitud térmica.',
      points: 10,
      links_to_criteria: ['C1', 'C2', 'C3', 'C5'],
    },
    {
      label: 'T8',
      prompt_excerpt:
        'Matriz de notas de estudiantes, calcular promedios.',
      points: 10,
      links_to_criteria: ['C1', 'C2', 'C3'],
    },
    {
      label: 'T9',
      prompt_excerpt:
        'Tablero Ta-Te-Ti con listas anidadas.',
      points: 10,
      links_to_criteria: ['C1', 'C2', 'C3', 'C5'],
    },
    {
      label: 'T10',
      prompt_excerpt:
        'Matriz de ventas, mostrar totales y estadísticas.',
      points: 10,
      links_to_criteria: ['C1', 'C2', 'C3', 'C5'],
    },
  ],
};

/**
 * Rúbrica 2: Parcial PythonForestal (Diseño de Sistemas)
 * Versión simplificada con estructura principal
 */
const rubric2JSON = {
  rubric_id: 'evaluacion-tecnica-pythonforestal',
  title: 'Rúbrica de Evaluación Técnica - Sistema de Gestión Forestal',
  version: '1.0.0',
  assessment_type: 'parcial',
  course: 'Diseño de Sistemas',
  language_or_stack: ['python'],
  submission: {
    single_file: false,
    accepted_extensions: ['.py', '.md', '.dat'],
    delivery_channel: 'repositorio',
    constraints: [
      'Proyecto debe tener estructura de paquetes: entidades/, servicios/, patrones/, riego/, excepciones/',
      'Debe incluir README.md, USER_STORIES.md y CLAUDE.md',
      'Sistema debe ejecutarse exitosamente con python main.py',
      'Todos los paquetes deben contener archivos __init__.py',
    ],
  },
  grading: {
    policy: 'sum',
    rounding: 'half_up',
    total_points: 260,
  },
  criteria: [
    {
      id: 'C1',
      name: 'Patrones de Diseño',
      weight: 0.3077,
      description:
        'Implementación correcta de patrones Singleton, Factory Method, Observer y Strategy',
      subcriteria: [
        {
          name: 'Patrón Singleton',
          weight: 0.25,
          evidence: [
            'Atributo _instance de clase',
            'Método __new__ con control de instancia única',
            'Thread-safety con threading.Lock',
          ],
        },
        {
          name: 'Patrón Factory Method',
          weight: 0.25,
          evidence: [
            'Método estático crear_cultivo(especie)',
            'Retorna tipo base Cultivo',
            'Diccionario de factories',
          ],
        },
        {
          name: 'Patrón Observer',
          weight: 0.25,
          evidence: [
            'Clases Observable[T] y Observer[T] implementadas',
            'Método notificar_observadores()',
          ],
        },
        {
          name: 'Patrón Strategy',
          weight: 0.25,
          evidence: [
            'Interfaz abstracta AbsorcionAguaStrategy',
            'Implementaciones: Seasonal y Constante',
          ],
        },
      ],
    },
    {
      id: 'C2',
      name: 'Arquitectura y Diseño',
      weight: 0.2308,
      description:
        'Separación de responsabilidades, jerarquía de clases, manejo de excepciones',
      subcriteria: [],
    },
    {
      id: 'C3',
      name: 'Calidad de Código',
      weight: 0.2308,
      description: 'PEP8, docstrings, type hints, nombres significativos',
      subcriteria: [],
    },
    {
      id: 'C4',
      name: 'Funcionalidad del Sistema',
      weight: 0.1538,
      description: 'Gestión de cultivos, riego, personal, persistencia',
      subcriteria: [],
    },
    {
      id: 'C5',
      name: 'Buenas Prácticas Avanzadas',
      weight: 0.0769,
      description: 'Threading, concurrencia, validación, logging',
      subcriteria: [],
    },
  ],
  penalties: [
    {
      description: 'Magic numbers sin constantes',
      penalty_percent: 5,
    },
    {
      description: 'Uso de lambdas complejas',
      penalty_percent: 5,
    },
    {
      description: 'Falta de docstrings en funciones clave',
      penalty_percent: 10,
    },
  ],
  mandatory_fail_conditions: [
    'Plagio detectado',
    'Patrones principales (Singleton, Factory, Observer, Strategy) no implementados',
    'Sistema no ejecutable',
  ],
  tasks: [],
};

/**
 * Función principal de migración
 */
const seedDatabase = async () => {
  try {
    console.log('🌱 Iniciando migración de datos con nueva jerarquía...\n');

    // Conectar a MongoDB
    await connectDB();

    // Limpiar colecciones existentes (opcional - comentar en producción)
    console.log('🧨 Borrando base de datos completa (colecciones + índices)...');
    await mongoose.connection.dropDatabase();
    console.log('✅ Base eliminada completamente\n');

    // 1. Migrar universidades
    console.log('🏫 Migrando universidades...');
    const createdUniversities = await University.insertMany(universities);
    console.log(`✅ ${createdUniversities.length} universidades creadas\n`);

    // 2. Migrar facultades
    console.log('🏛️  Migrando facultades...');
    const createdFaculties = await Faculty.insertMany(faculties);
    console.log(`✅ ${createdFaculties.length} facultades creadas\n`);

    // 3. Migrar carreras
    console.log('🎓 Migrando carreras...');
    const createdCareers = await Career.insertMany(careers);
    console.log(`✅ ${createdCareers.length} carreras creadas\n`);

    // 4. Migrar cursos
    console.log('📚 Migrando cursos...');
    const createdCourses = await Course.insertMany(courses);
    console.log(`✅ ${createdCourses.length} cursos creados\n`);

    // 5. Crear usuarios de prueba para cada rol (ANTES de comisiones para poder asignarlos)
    console.log('👥 Creando usuarios de prueba para todos los roles...\n');

    const users = [];

    // 5.1. Super Admin (sin university_id)
    const superAdmin = new User({
      username: 'superadmin',
      name: 'Super Administrador',
      password: 'admin123',
      role: 'super-admin',
      university_id: null,
      deleted: false,
    });
    await superAdmin.save();
    users.push(superAdmin);
    console.log('   ✅ super-admin: superadmin / admin123 (acceso global)');

    // 5.2. University Admin (con university_id)
    const universityAdmin = new User({
      username: 'admin-utn',
      name: 'Administrador UTN',
      password: 'admin123',
      role: 'university-admin',
      university_id: 'utn',
      deleted: false,
    });
    await universityAdmin.save();
    users.push(universityAdmin);
    console.log('   ✅ university-admin: admin-utn / admin123 (gestiona UTN)');

    // 5.3. Faculty Admin (con university_id y faculty_id) - NUEVO EN V4
    const facultyAdmin1 = new User({
      username: 'admin-frm',
      name: 'Administrador FRM',
      password: 'admin123',
      role: 'faculty-admin',
      university_id: 'utn',
      faculty_id: 'frm',
      first_login: true, // Debe cambiar contraseña en primer login
      deleted: false,
    });
    await facultyAdmin1.save();
    users.push(facultyAdmin1);
    console.log('   ✅ faculty-admin: admin-frm / admin123 (gestiona FRM)');

    const facultyAdmin2 = new User({
      username: 'admin-frsn',
      name: 'Administrador FRSN',
      password: 'admin123',
      role: 'faculty-admin',
      university_id: 'utn',
      faculty_id: 'frsn',
      first_login: true,
      deleted: false,
    });
    await facultyAdmin2.save();
    users.push(facultyAdmin2);
    console.log('   ✅ faculty-admin: admin-frsn / admin123 (gestiona FRSN)');

    // 5.4. Professor Admin (Jefe de Cátedra) - NUEVO EN V4
    const professorAdmin1 = new User({
      username: 'jefe-prog1-frm',
      name: 'Jefe Programación 1 FRM',
      password: 'admin123',
      role: 'professor-admin',
      university_id: 'utn',
      faculty_id: 'frm',
      course_ids: [`${currentYear}-isi-frm-programacion-1`],
      first_login: true,
      deleted: false,
    });
    await professorAdmin1.save();
    users.push(professorAdmin1);
    console.log('   ✅ professor-admin: jefe-prog1-frm / admin123 (Jefe de Programación 1 FRM)');

    const professorAdmin2 = new User({
      username: 'jefe-prog2-frm',
      name: 'Jefe Programación 2 FRM',
      password: 'admin123',
      role: 'professor-admin',
      university_id: 'utn',
      faculty_id: 'frm',
      course_ids: [`${currentYear}-isi-frm-programacion-2`],
      first_login: true,
      deleted: false,
    });
    await professorAdmin2.save();
    users.push(professorAdmin2);
    console.log('   ✅ professor-admin: jefe-prog2-frm / admin123 (Jefe de Programación 2 FRM)');

    // Jefe de cátedra con múltiples materias
    const professorAdmin3 = new User({
      username: 'jefe-multi-frsn',
      name: 'Jefe Múltiples Materias FRSN',
      password: 'admin123',
      role: 'professor-admin',
      university_id: 'utn',
      faculty_id: 'frsn',
      course_ids: [
        `${currentYear}-isi-frsn-programacion-1`,
        `${currentYear}-isi-frsn-programacion-2`,
        `${currentYear}-isi-frsn-programacion-3`,
      ],
      first_login: true,
      deleted: false,
    });
    await professorAdmin3.save();
    users.push(professorAdmin3);
    console.log('   ✅ professor-admin: jefe-multi-frsn / admin123 (Jefe de 3 materias FRSN)');

    // 5.5. Profesores (con university_id)
    const professor1 = new User({
      username: 'prof-garcia',
      name: 'María García',
      password: 'prof123',
      role: 'professor',
      university_id: 'utn',
      deleted: false,
    });
    await professor1.save();
    users.push(professor1);
    console.log('   ✅ professor: prof-garcia / prof123');

    const professor2 = new User({
      username: 'prof-lopez',
      name: 'Juan López',
      password: 'prof123',
      role: 'professor',
      university_id: 'utn',
      deleted: false,
    });
    await professor2.save();
    users.push(professor2);
    console.log('   ✅ professor: prof-lopez / prof123');

    const professor3 = new User({
      username: 'prof-martinez',
      name: 'Carlos Martínez',
      password: 'prof123',
      role: 'professor',
      university_id: 'utn',
      deleted: false,
    });
    await professor3.save();
    users.push(professor3);
    console.log('   ✅ professor: prof-martinez / prof123');

    // 5.5. User (con university_id)
    const regularUser = new User({
      username: 'usuario',
      name: 'Usuario Regular',
      password: 'usuario123',
      role: 'user',
      university_id: 'utn',
      deleted: false,
    });
    await regularUser.save();
    users.push(regularUser);
    console.log('   ✅ user: usuario / usuario123 (UTN - solo corrección)');

    console.log('\n   --- USUARIOS UBA ---\n');

    // 5.6. University Admin UBA
    const universityAdminUBA = new User({
      username: 'admin-uba',
      name: 'Administrador UBA',
      password: 'admin123',
      role: 'university-admin',
      university_id: 'uba',
      deleted: false,
    });
    await universityAdminUBA.save();
    users.push(universityAdminUBA);
    console.log('   ✅ university-admin: admin-uba / admin123 (gestiona UBA)');

    // 5.7. Faculty Admin UBA - FIUBA
    const facultyAdminFIUBA = new User({
      username: 'admin-fiuba',
      name: 'Administrador FIUBA',
      password: 'admin123',
      role: 'faculty-admin',
      university_id: 'uba',
      faculty_id: 'fiuba',
      first_login: true,
      deleted: false,
    });
    await facultyAdminFIUBA.save();
    users.push(facultyAdminFIUBA);
    console.log('   ✅ faculty-admin: admin-fiuba / admin123 (gestiona FIUBA)');

    // 5.8. Faculty Admin UBA - FCEyN
    const facultyAdminFCEN = new User({
      username: 'admin-fcen',
      name: 'Administrador FCEyN',
      password: 'admin123',
      role: 'faculty-admin',
      university_id: 'uba',
      faculty_id: 'fcen',
      first_login: true,
      deleted: false,
    });
    await facultyAdminFCEN.save();
    users.push(facultyAdminFCEN);
    console.log('   ✅ faculty-admin: admin-fcen / admin123 (gestiona FCEyN)');

    // 5.9. Professor Admin FIUBA - Algoritmos
    const professorAdminAlgo1FIUBA = new User({
      username: 'jefe-algo1-fiuba',
      name: 'Jefe Algoritmos I FIUBA',
      password: 'admin123',
      role: 'professor-admin',
      university_id: 'uba',
      faculty_id: 'fiuba',
      course_ids: [`${currentYear}-ing-informatica-fiuba-algoritmos-1`],
      first_login: true,
      deleted: false,
    });
    await professorAdminAlgo1FIUBA.save();
    users.push(professorAdminAlgo1FIUBA);
    console.log('   ✅ professor-admin: jefe-algo1-fiuba / admin123 (Jefe Algoritmos I FIUBA)');

    // 5.10. Professor Admin FCEyN - Múltiples materias
    const professorAdminMultiFCEN = new User({
      username: 'jefe-multi-fcen',
      name: 'Jefe Múltiples Materias FCEyN',
      password: 'admin123',
      role: 'professor-admin',
      university_id: 'uba',
      faculty_id: 'fcen',
      course_ids: [
        `${currentYear}-lic-computacion-fcen-algoritmos-1`,
        `${currentYear}-lic-computacion-fcen-algoritmos-2`,
      ],
      first_login: true,
      deleted: false,
    });
    await professorAdminMultiFCEN.save();
    users.push(professorAdminMultiFCEN);
    console.log('   ✅ professor-admin: jefe-multi-fcen / admin123 (Jefe de 2 materias FCEyN)');

    // 5.11. Profesores UBA
    const professorUBA1 = new User({
      username: 'prof-rodriguez',
      name: 'Ana Rodríguez',
      password: 'prof123',
      role: 'professor',
      university_id: 'uba',
      faculty_id: 'fiuba',
      course_ids: [
        `${currentYear}-ing-informatica-fiuba-algoritmos-1`,
        `${currentYear}-ing-informatica-fiuba-algoritmos-2`,
      ],
      deleted: false,
    });
    await professorUBA1.save();
    users.push(professorUBA1);
    console.log('   ✅ professor: prof-rodriguez / prof123 (Algoritmos I y II FIUBA)');

    const professorUBA2 = new User({
      username: 'prof-fernandez',
      name: 'Roberto Fernández',
      password: 'prof123',
      role: 'professor',
      university_id: 'uba',
      faculty_id: 'fcen',
      course_ids: [`${currentYear}-lic-computacion-fcen-bases-de-datos`],
      deleted: false,
    });
    await professorUBA2.save();
    users.push(professorUBA2);
    console.log('   ✅ professor: prof-fernandez / prof123 (Bases de Datos FCEyN)');

    // 5.12. User UBA
    const regularUserUBA = new User({
      username: 'usuario-uba',
      name: 'Usuario Regular UBA',
      password: 'usuario123',
      role: 'user',
      university_id: 'uba',
      deleted: false,
    });
    await regularUserUBA.save();
    users.push(regularUserUBA);
    console.log('   ✅ user: usuario-uba / usuario123 (UBA - solo corrección)\n');

    // 6. Crear comisiones para cada curso (SIN professor_name/email)
    console.log('👥 Creando comisiones...');
    const commissions = [];
    for (const course of courses) {
      // Crear 2 comisiones por curso como ejemplo
      for (let i = 1; i <= 2; i++) {
        commissions.push({
          commission_id: `${course.course_id}-comision-${i}`,
          name: `Comisión ${i} - ${course.name}`,
          course_id: course.course_id,
          career_id: course.career_id,
          faculty_id: course.faculty_id,
          university_id: course.university_id,
          year: course.year,
          professors: [], // Array vacío, se asignará después
        });
      }
    }
    const createdCommissions = await Commission.insertMany(commissions);
    console.log(`✅ ${createdCommissions.length} comisiones creadas\n`);

    // 6. Migrar rúbricas con nueva estructura
    console.log('📋 Migrando rúbricas...');
    const rubrics = [];

    // Rúbrica 1: TP Listas (para todas las comisiones de Programación 1)
    const prog1Commissions = createdCommissions.filter(c => c.course_id.endsWith('-programacion-1'));
    for (const commission of prog1Commissions) {
      const course = courses.find(c => c.course_id === commission.course_id);
      rubrics.push({
        rubric_id: Rubric.generateRubricId(commission.commission_id, RUBRIC_TYPES.TP, 'TP Listas', 1),
        name: 'TP Listas',
        commission_id: commission.commission_id,
        course_id: commission.course_id,
        career_id: commission.career_id,
        faculty_id: commission.faculty_id,
        university_id: commission.university_id,
        rubric_type: RUBRIC_TYPES.TP,
        rubric_number: 1,
        year: course.year,
        rubric_json: rubric1JSON,
        source: 'manual',
      });
    }

    // Rúbrica 2: Parcial PythonForestal (solo para comisiones de Diseño de Sistemas en FRM)
    const designCommissions = createdCommissions.filter(
      c => c.course_id.endsWith('-disenio-de-sistemas') && c.faculty_id === 'frm'
    );
    for (const commission of designCommissions) {
      const course = courses.find(c => c.course_id === commission.course_id);
      rubrics.push({
        rubric_id: Rubric.generateRubricId(commission.commission_id, RUBRIC_TYPES.PARCIAL_1, 'Parcial 1 - PythonForestal', 1),
        name: 'Parcial 1 - PythonForestal',
        commission_id: commission.commission_id,
        course_id: commission.course_id,
        career_id: commission.career_id,
        faculty_id: commission.faculty_id,
        university_id: commission.university_id,
        rubric_type: RUBRIC_TYPES.PARCIAL_1,
        rubric_number: 1,
        year: course.year,
        rubric_json: rubric2JSON,
        source: 'manual',
      });
    }

    const createdRubrics = await Rubric.insertMany(rubrics);
    console.log(`✅ ${createdRubrics.length} rúbricas creadas\n`);

    // 7. Asignar profesores a comisiones
    console.log('👨‍🏫 Asignando profesores a comisiones...\n');

    // Asignar prof-garcia a comisiones de Programación 1 en FRM
    const frmProg1Commissions = createdCommissions.filter(c =>
      c.faculty_id === 'frm' && c.course_id.endsWith('-programacion-1')
    );
    for (const commission of frmProg1Commissions) {
      await commission.assignProfessor(professor1._id);
      console.log(`   ✅ María García → ${commission.name}`);
    }

    // Asignar prof-lopez a comisiones de Programación 2 en FRM
    const frmProg2Commissions = createdCommissions.filter(c =>
      c.faculty_id === 'frm' && c.course_id.endsWith('-programacion-2')
    );
    for (const commission of frmProg2Commissions) {
      await commission.assignProfessor(professor2._id);
      console.log(`   ✅ Juan López → ${commission.name}`);
    }

    // Asignar prof-martinez a comisiones de Diseño de Sistemas en FRM
    const frmDesignCommissions = createdCommissions.filter(c =>
      c.faculty_id === 'frm' && c.course_id.endsWith('-disenio-de-sistemas')
    );
    for (const commission of frmDesignCommissions) {
      await commission.assignProfessor(professor3._id);
      console.log(`   ✅ Carlos Martínez → ${commission.name}`);
    }
    console.log('');

    // Resumen
    console.log('='.repeat(80));
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE - VERSIÓN 4.1 (2 UNIVERSIDADES)');
    console.log('='.repeat(80));
    console.log('📊 Resumen:');
    console.log(`   - Universidades: ${createdUniversities.length} (UTN, UBA)`);
    console.log(`   - Facultades: ${createdFaculties.length} (4 UTN + 2 UBA)`);
    console.log(`   - Carreras: ${createdCareers.length} (4 UTN + 2 UBA)`);
    console.log(`   - Cursos: ${createdCourses.length}`);
    console.log(`   - Comisiones: ${createdCommissions.length}`);
    console.log(`   - Rúbricas: ${createdRubrics.length}`);
    console.log(`   - Usuarios: ${users.length} (todos los roles en ambas universidades)`);
    console.log('='.repeat(80));
    console.log('\n📖 Estructura Jerárquica:');
    console.log('   Universidad → Facultad → Carrera → Materia (con año) → Comisión → Rúbrica (con tipo)');
    console.log('='.repeat(80));
    console.log('\n🔐 Credenciales de acceso (V4.1 - 2 UNIVERSIDADES):');
    console.log('\n   🌍 SUPER-ADMIN (acceso global - ambas universidades):');
    console.log('      superadmin / admin123');

    console.log('\n   --- UNIVERSIDAD UTN ---');
    console.log('\n   🏫 UNIVERSITY-ADMIN:');
    console.log('      admin-utn / admin123 (gestiona toda la UTN)');
    console.log('\n   🏛️  FACULTY-ADMIN:');
    console.log('      admin-frm  / admin123  (FRM)  [first_login=true]');
    console.log('      admin-frsn / admin123  (FRSN) [first_login=true]');
    console.log('\n   👨‍🏫 PROFESSOR-ADMIN (Jefes de Cátedra):');
    console.log('      jefe-prog1-frm  / admin123  (Programación 1 FRM)    [first_login=true]');
    console.log('      jefe-prog2-frm  / admin123  (Programación 2 FRM)    [first_login=true]');
    console.log('      jefe-multi-frsn / admin123  (3 materias FRSN)       [first_login=true]');
    console.log('\n   👨‍🏫 PROFESSORS:');
    console.log('      prof-garcia   / prof123  (Prog 1 FRM)');
    console.log('      prof-lopez    / prof123  (Prog 2 FRM)');
    console.log('      prof-martinez / prof123  (Diseño FRM)');
    console.log('\n   👤 USER:');
    console.log('      usuario / usuario123 (UTN)');

    console.log('\n   --- UNIVERSIDAD UBA ---');
    console.log('\n   🏫 UNIVERSITY-ADMIN:');
    console.log('      admin-uba / admin123 (gestiona toda la UBA)');
    console.log('\n   🏛️  FACULTY-ADMIN:');
    console.log('      admin-fiuba / admin123 (FIUBA) [first_login=true]');
    console.log('      admin-fcen  / admin123 (FCEyN) [first_login=true]');
    console.log('\n   👨‍🏫 PROFESSOR-ADMIN (Jefes de Cátedra):');
    console.log('      jefe-algo1-fiuba / admin123 (Algoritmos I FIUBA)  [first_login=true]');
    console.log('      jefe-multi-fcen  / admin123 (2 materias FCEyN)    [first_login=true]');
    console.log('\n   👨‍🏫 PROFESSORS:');
    console.log('      prof-rodriguez / prof123 (Algoritmos I y II FIUBA)');
    console.log('      prof-fernandez / prof123 (Bases de Datos FCEyN)');
    console.log('\n   👤 USER:');
    console.log('      usuario-uba / usuario123 (UBA)');

    console.log('\n   ⚠️  NOTA: Usuarios con first_login=true DEBEN cambiar contraseña en primer acceso');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Error en migración:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

// Ejecutar migración
seedDatabase();
