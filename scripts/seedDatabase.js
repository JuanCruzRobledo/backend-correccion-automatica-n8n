/**
 * Script de migración de datos iniciales
 * Migra universidades, cursos, rúbricas y usuarios desde datos hardcodeados
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/database.js';
import University from '../src/models/University.js';
import Course from '../src/models/Course.js';
import Rubric from '../src/models/Rubric.js';
import User from '../src/models/User.js';

// Cargar variables de entorno
dotenv.config();

/**
 * Datos de universidades
 */
const universities = [
  { university_id: 'utn-frm', name: 'UTN - Facultad Regional Mendoza' },
  { university_id: 'utn-frsn', name: 'UTN - Facultad Regional San Nicolás' },
  { university_id: 'utn-fra', name: 'UTN - Facultad Regional Avellaneda' },
  { university_id: 'utn-frba', name: 'UTN - Facultad Regional Buenos Aires' },
];

/**
 * Datos de cursos por universidad
 */
const courses = [
  // UTN FRM
  { course_id: 'programacion-1', name: 'Programación 1', university_id: 'utn-frm' },
  { course_id: 'programacion-2', name: 'Programación 2', university_id: 'utn-frm' },
  { course_id: 'programacion-3', name: 'Programación 3', university_id: 'utn-frm' },
  { course_id: 'bases-de-datos-1', name: 'Bases de Datos 1', university_id: 'utn-frm' },
  { course_id: 'disenio-de-sistemas', name: 'Diseño de Sistemas', university_id: 'utn-frm' },

  // UTN FRSN
  { course_id: 'programacion-1', name: 'Programación 1', university_id: 'utn-frsn' },
  { course_id: 'programacion-2', name: 'Programación 2', university_id: 'utn-frsn' },
  { course_id: 'programacion-3', name: 'Programación 3', university_id: 'utn-frsn' },
  { course_id: 'bases-de-datos-1', name: 'Bases de Datos 1', university_id: 'utn-frsn' },

  // UTN FRA
  { course_id: 'programacion-1', name: 'Programación 1', university_id: 'utn-fra' },
  { course_id: 'programacion-2', name: 'Programación 2', university_id: 'utn-fra' },
  { course_id: 'programacion-3', name: 'Programación 3', university_id: 'utn-fra' },
  { course_id: 'bases-de-datos-1', name: 'Bases de Datos 1', university_id: 'utn-fra' },

  // UTN FRBA
  { course_id: 'programacion-1', name: 'Programación 1', university_id: 'utn-frba' },
  { course_id: 'programacion-2', name: 'Programación 2', university_id: 'utn-frba' },
  { course_id: 'programacion-3', name: 'Programación 3', university_id: 'utn-frba' },
  { course_id: 'bases-de-datos-1', name: 'Bases de Datos 1', university_id: 'utn-frba' },
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
    console.log('🌱 Iniciando migración de datos...\n');

    // Conectar a MongoDB
    await connectDB();

    // Limpiar colecciones existentes (opcional - comentar en producción)
    console.log('🧨 Borrando base de datos completa (colecciones + índices)...');
    await mongoose.connection.dropDatabase();
    console.log('✅ Base eliminada completamente\n');

    // Migrar universidades
    console.log('🏫 Migrando universidades...');
    const createdUniversities = await University.insertMany(universities);
    console.log(`✅ ${createdUniversities.length} universidades creadas\n`);

    // Migrar cursos
    console.log('📚 Migrando cursos...');
    const createdCourses = await Course.insertMany(courses);
    console.log(`✅ ${createdCourses.length} cursos creados\n`);

    // Migrar rúbricas
    console.log('📋 Migrando rúbricas...');

    // Rúbrica 1: TP Listas (para todas las UTN en Programación 1)
    const rubrics = [];
    for (const uni of universities) {
      rubrics.push({
        rubric_id: `${uni.university_id}-practico-5-listas`,
        name: 'TP Listas',
        university_id: uni.university_id,
        course_id: 'programacion-1',
        rubric_json: rubric1JSON,
        source: 'manual',
      });
    }

    // Rúbrica 2: Parcial PythonForestal (solo para UTN-FRM en Diseño de Sistemas)
    rubrics.push({
      rubric_id: 'utn-frm-parcial-pythonforestal',
      name: 'Parcial PythonForestal',
      university_id: 'utn-frm',
      course_id: 'disenio-de-sistemas',
      rubric_json: rubric2JSON,
      source: 'manual',
    });

    const createdRubrics = await Rubric.insertMany(rubrics);
    console.log(`✅ ${createdRubrics.length} rúbricas creadas\n`);

    // Crear usuario admin
    console.log('👤 Creando usuario administrador...');
    const adminUser = new User({
      username: 'admin',
      password: 'admin123', // Se hasheará automáticamente en el pre-save hook
      role: 'admin',
      deleted: false, // Explícitamente activo
    });
    await adminUser.save();
    console.log('✅ Usuario admin creado (username: admin, password: admin123)\n');

    // Crear usuario de prueba
    console.log('👤 Creando usuario de prueba...');
    const testUser = new User({
      username: 'usuario',
      password: 'usuario123',
      role: 'user',
      deleted: false, // Explícitamente activo
    });
    await testUser.save();
    console.log('✅ Usuario de prueba creado (username: usuario, password: usuario123)\n');

    // Resumen
    console.log('='.repeat(60));
    console.log('✅ Migración completada exitosamente!');
    console.log('='.repeat(60));
    console.log('📊 Resumen:');
    console.log(`   - Universidades: ${createdUniversities.length}`);
    console.log(`   - Cursos: ${createdCourses.length}`);
    console.log(`   - Rúbricas: ${createdRubrics.length}`);
    console.log(`   - Usuarios: 2 (admin + usuario)`);
    console.log('='.repeat(60));
    console.log('\n🔐 Credenciales de acceso:');
    console.log('   Admin:   username: admin    | password: admin123');
    console.log('   Usuario: username: usuario  | password: usuario123');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

// Ejecutar migración
seedDatabase();
