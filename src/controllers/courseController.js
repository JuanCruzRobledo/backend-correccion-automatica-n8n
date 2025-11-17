/**
 * Controlador de Cursos/Materias
 */
import Course from '../models/Course.js';
import Career from '../models/Career.js';
import * as driveService from '../services/driveService.js';

/**
 * Listar todos los cursos activos - GET /api/courses
 * @route GET /api/courses?career_id=...&year=...&faculty_id=...&university_id=...
 * @access Public
 */
export const getCourses = async (req, res) => {
  try {
    const { career_id, year, faculty_id, university_id } = req.query;
    const userRole = req.user.role;

    const filters = {};
    if (career_id) filters.career_id = career_id;
    if (year) filters.year = parseInt(year);

    // Aplicar filtros según rol del usuario
    if (userRole === 'super-admin') {
      // Super-admin ve todos los cursos
      if (faculty_id) filters.faculty_id = faculty_id;
      if (university_id) filters.university_id = university_id;
    } else if (userRole === 'university-admin') {
      // University-admin solo ve cursos de su universidad
      filters.university_id = req.user.university_id;
      if (faculty_id) filters.faculty_id = faculty_id;
    } else if (userRole === 'faculty-admin') {
      // Faculty-admin solo ve cursos de su facultad
      filters.university_id = req.user.university_id;
      filters.faculty_id = req.user.faculty_id;
    } else if (userRole === 'professor-admin') {
      // Professor-admin solo ve sus cursos asignados
      filters.course_id = { $in: req.user.course_ids };
    } else if (userRole === 'professor') {
      // Professor ve cursos donde tiene comisiones
      filters.university_id = req.user.university_id;
    } else {
      // User no tiene acceso
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver cursos',
      });
    }

    const courses = await Course.findActive(filters);

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cursos',
      error: error.message,
    });
  }
};

/**
 * Obtener un curso por ID - GET /api/courses/:id
 * @route GET /api/courses/:id
 * @access Public
 */
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado',
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error('Error al obtener curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener curso',
      error: error.message,
    });
  }
};

/**
 * Crear curso - POST /api/courses
 * @route POST /api/courses
 * @access Private (solo admin)
 */
export const createCourse = async (req, res) => {
  try {
    const { course_id, name, year, career_id, faculty_id, university_id } = req.body;
    const userRole = req.user.role;

    // Validar datos requeridos
    if (!course_id || !name || !year || !career_id || !faculty_id || !university_id) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: course_id, name, year, career_id, faculty_id, university_id',
      });
    }

    // Validar permisos según rol
    if (userRole === 'super-admin') {
      // Super-admin puede crear en cualquier carrera
    } else if (userRole === 'university-admin') {
      // University-admin solo puede crear en carreras de su universidad
      if (university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede crear cursos en su universidad',
        });
      }
    } else if (userRole === 'faculty-admin') {
      // Faculty-admin solo puede crear en carreras de su facultad
      if (university_id !== req.user.university_id || faculty_id !== req.user.faculty_id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede crear cursos en su facultad',
        });
      }
    } else {
      // professor-admin y otros roles NO pueden crear cursos
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para crear cursos',
      });
    }

    // Validar formato de course_id (debe ser YYYY-nombre)
    const courseIdRegex = /^[0-9]{4}-[a-z0-9-]+$/;
    if (!courseIdRegex.test(course_id)) {
      return res.status(400).json({
        success: false,
        message: 'El course_id debe tener el formato YYYY-nombre (ej: 2025-programacion-ii)',
      });
    }

    // Verificar que la carrera existe
    const career = await Career.findOne({ career_id, deleted: false });
    if (!career) {
      return res.status(400).json({
        success: false,
        message: 'La carrera especificada no existe',
      });
    }

    // Verificar si ya existe (incluyendo eliminados)
    const existingCourse = await Course.findOne({
      career_id,
      course_id,
      deleted: { $in: [true, false] },
    });

    if (existingCourse) {
      if (existingCourse.deleted) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un curso con ese ID en esta carrera (eliminado). Contacte al administrador para restaurarlo.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Ya existe un curso con ese ID en esta carrera',
      });
    }

    // Crear curso
    const course = new Course({
      course_id,
      name,
      year,
      career_id,
      faculty_id,
      university_id,
    });

    await course.save();

    // Crear carpeta en Google Drive (no bloqueante)
    driveService.createCourseFolder(course_id, career_id, faculty_id, university_id).catch((err) => {
      console.error('Error al crear carpeta de curso en Drive:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Curso creado exitosamente',
      data: course,
    });
  } catch (error) {
    console.error('Error al crear curso:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un curso con ese ID en esta carrera',
        error: 'Clave duplicada',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear curso',
      error: error.message,
    });
  }
};

/**
 * Actualizar curso - PUT /api/courses/:id
 * @route PUT /api/courses/:id
 * @access Private (solo admin)
 */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, year, career_id, faculty_id, university_id } = req.body;

    // Validar datos
    if (!name && !year && !career_id && !faculty_id && !university_id) {
      return res.status(400).json({
        success: false,
        message: 'Al menos un campo es requerido para actualizar',
      });
    }

    // Buscar curso
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado',
      });
    }

    // Si se actualiza career_id, verificar que existe
    if (career_id) {
      const career = await Career.findOne({ career_id, deleted: false });
      if (!career) {
        return res.status(400).json({
          success: false,
          message: 'La carrera especificada no existe',
        });
      }
      course.career_id = career_id;
    }

    // Actualizar campos
    if (name) course.name = name;
    if (year) course.year = year;
    if (faculty_id) course.faculty_id = faculty_id;
    if (university_id) course.university_id = university_id;

    await course.save();

    res.status(200).json({
      success: true,
      message: 'Curso actualizado exitosamente',
      data: course,
    });
  } catch (error) {
    console.error('Error al actualizar curso:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar curso',
      error: error.message,
    });
  }
};

/**
 * Eliminar curso (baja lógica) - DELETE /api/courses/:id
 * @route DELETE /api/courses/:id
 * @access Private (solo admin)
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado',
      });
    }

    await course.softDelete();

    res.status(200).json({
      success: true,
      message: 'Curso eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar curso',
      error: error.message,
    });
  }
};
