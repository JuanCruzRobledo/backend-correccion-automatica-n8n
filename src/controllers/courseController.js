/**
 * Controlador de Cursos/Materias
 */
import Course from '../models/Course.js';
import University from '../models/University.js';

/**
 * Listar todos los cursos activos - GET /api/courses
 * @route GET /api/courses?university_id=xxx
 * @access Public
 */
export const getCourses = async (req, res) => {
  try {
    const { university_id } = req.query;

    const courses = await Course.findActive(university_id || null);

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
    const { course_id, name, university_id } = req.body;

    // Validar datos
    if (!course_id || !name || !university_id) {
      return res.status(400).json({
        success: false,
        message: 'course_id, name y university_id son requeridos',
      });
    }

    // Verificar que la universidad existe
    const university = await University.findOne({ university_id });
    if (!university) {
      return res.status(400).json({
        success: false,
        message: 'La universidad especificada no existe',
      });
    }

    // Verificar si ya existe (incluyendo eliminados)
    const existingCourse = await Course.findOne({
      course_id,
      deleted: { $in: [true, false] },
    });

    if (existingCourse) {
      if (existingCourse.deleted) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un curso con ese ID (eliminado). Contacte al administrador para restaurarlo.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Ya existe un curso con ese ID',
      });
    }

    // Crear curso
    const course = new Course({
      course_id,
      name,
      university_id,
    });

    await course.save();

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
    const { name, university_id } = req.body;

    // Validar datos
    if (!name && !university_id) {
      return res.status(400).json({
        success: false,
        message: 'Al menos name o university_id es requerido',
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

    // Si se actualiza university_id, verificar que existe
    if (university_id) {
      const university = await University.findOne({ university_id });
      if (!university) {
        return res.status(400).json({
          success: false,
          message: 'La universidad especificada no existe',
        });
      }
      course.university_id = university_id;
    }

    // Actualizar campos
    if (name) course.name = name;

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
