/**
 * Controlador de Usuarios (CRUD)
 */
import User from '../models/User.js';
import {
  canAssignRole,
  validateRequiredFields,
  validateScope,
  applyInheritance,
} from '../utils/roleValidation.js';

/**
 * Listar usuarios - GET /api/users
 * @route GET /api/users?includeDeleted=true&role=professor&university_id=utn
 * @access Private (solo admin)
 * @query includeDeleted - Si es 'true', incluye usuarios eliminados
 * @query role - Filtrar por rol (ej: 'professor', 'user', etc.)
 * @query university_id - Filtrar por universidad
 */
export const getUsers = async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    const { role, university_id } = req.query;

    // Construir filtros base
    const filters = {};

    if (!includeDeleted) {
      filters.deleted = false;
    }

    if (role) {
      filters.role = role;
    }

    // Aplicar filtros según el rol del usuario que consulta
    const userRole = req.user.role;

    if (userRole === 'super-admin') {
      // Super-admin ve todos los usuarios
      if (university_id) {
        filters.university_id = university_id;
      }
    } else if (userRole === 'university-admin') {
      // University-admin solo ve usuarios de su universidad
      filters.university_id = req.user.university_id;
    } else if (userRole === 'faculty-admin') {
      // Faculty-admin solo ve usuarios de su facultad
      filters.university_id = req.user.university_id;
      filters.faculty_id = req.user.faculty_id;
    } else {
      // Otros roles no tienen acceso
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para listar usuarios',
      });
    }

    const users = await User.find(filters);

    // Mapear para eliminar passwords (aunque ya está en select: false)
    const usersPublic = users.map(user => user.toPublicJSON());

    res.status(200).json({
      success: true,
      count: usersPublic.length,
      data: usersPublic,
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message,
    });
  }
};

/**
 * Obtener un usuario por ID - GET /api/users/:id
 * @route GET /api/users/:id
 * @access Private (solo admin)
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user || user.deleted === true) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    res.status(200).json({
      success: true,
      data: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: error.message,
    });
  }
};

/**
 * Crear usuario - POST /api/users
 * @route POST /api/users
 * @access Private (solo admin)
 */
export const createUser = async (req, res) => {
  try {
    const { username, name, password, role, university_id, faculty_id, course_ids } = req.body;

    // Validar datos básicos
    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'username, nombre y password son requeridos',
      });
    }

    // Determinar rol del usuario a crear
    const userRole = role || 'user';

    // Validar jerarquía de roles
    const creatorRole = req.user.role;

    if (!canAssignRole(creatorRole, userRole)) {
      return res.status(403).json({
        success: false,
        message: `No tiene permisos para crear usuarios con rol ${userRole}`,
      });
    }

    // Preparar datos del usuario a crear
    let userData = {
      role: userRole,
      university_id,
      faculty_id,
      course_ids,
    };

    // Aplicar herencia automática de campos según el rol del creador
    userData = applyInheritance(req.user, userData);

    // Validar campos requeridos según el rol
    const fieldValidation = validateRequiredFields(userRole, userData);
    if (!fieldValidation.valid) {
      return res.status(400).json({
        success: false,
        message: `Campos requeridos faltantes para rol ${userRole}: ${fieldValidation.missing.join(', ')}`,
      });
    }

    // Validar scope (universidad/facultad)
    const scopeValidation = validateScope(req.user, userData);
    if (!scopeValidation.valid) {
      return res.status(403).json({
        success: false,
        message: scopeValidation.message,
      });
    }

    // Verificar si el usuario ya existe (activo o eliminado)
    const existingUser = await User.findOne({ username: username.toLowerCase() });

    if (existingUser) {
      // Si el usuario existe y está eliminado
      if (existingUser.deleted === true) {
        return res.status(400).json({
          success: false,
          message: 'Este nombre de usuario perteneció a una cuenta eliminada. Use otro nombre o restaure la cuenta.',
        });
      }

      // Si el usuario existe y está activo (deleted: false o sin campo deleted)
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario ya está en uso',
      });
    }

    // Crear usuario con los datos validados
    const finalUserData = {
      username,
      name,
      password,
      role: userData.role,
      university_id: userData.role === 'super-admin' ? null : userData.university_id,
      faculty_id: userData.faculty_id || null,
      course_ids: userData.course_ids || [],
    };

    const user = new User(finalUserData);

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);

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
      message: 'Error al crear usuario',
      error: error.message,
    });
  }
};

/**
 * Actualizar usuario - PUT /api/users/:id
 * @route PUT /api/users/:id
 * @access Private (solo admin)
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, password, role, university_id, faculty_id, course_ids } = req.body;

    // Buscar usuario
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Validar permisos según rol del modificador
    const modifierRole = req.user.role;

    if (modifierRole === 'super-admin') {
      // Super-admin puede actualizar cualquier usuario
    } else if (modifierRole === 'university-admin') {
      // University-admin solo puede actualizar usuarios de su universidad
      if (user.university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede actualizar usuarios de su universidad',
        });
      }
    } else if (modifierRole === 'faculty-admin') {
      // Faculty-admin solo puede actualizar usuarios de su facultad
      if (user.university_id !== req.user.university_id || user.faculty_id !== req.user.faculty_id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede actualizar usuarios de su facultad',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para actualizar usuarios',
      });
    }

    // Validar que no se intente cambiar el username del admin original
    if (user.username === 'admin' && username && username !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'No se puede cambiar el username del administrador principal',
      });
    }

    // Verificar si el nuevo username ya existe (si se está cambiando)
    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        // Si el usuario encontrado es diferente al actual
        if (existingUser._id.toString() !== user._id.toString()) {
          if (existingUser.deleted === true) {
            return res.status(400).json({
              success: false,
              message: 'Este nombre de usuario perteneció a una cuenta eliminada. Use otro nombre.',
            });
          }

          return res.status(400).json({
            success: false,
            message: 'El nombre de usuario ya está en uso',
          });
        }
      }
      user.username = username;
    }

    // Actualizar nombre si se proporciona
    if (name) {
      user.name = name;
    }

    // Actualizar password si se proporciona
    if (password) {
      user.password = password;
    }

    // Actualizar rol si se proporciona
    if (role) {
      // Validar que no se intente cambiar el rol del admin original
      if (user.username === 'admin' && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'No se puede cambiar el rol del administrador principal',
        });
      }

      // Validar jerarquía de roles usando el helper
      if (!canAssignRole(modifierRole, role)) {
        return res.status(403).json({
          success: false,
          message: `No tiene permisos para asignar el rol ${role}`,
        });
      }

      user.role = role;

      // Si cambia a super-admin, limpiar university_id
      if (role === 'super-admin') {
        user.university_id = null;
        user.faculty_id = null;
        user.course_ids = [];
      }
    }

    // Preparar datos actualizados para validación
    const updatedData = {
      role: role || user.role,
      university_id: university_id !== undefined ? university_id : user.university_id,
      faculty_id: faculty_id !== undefined ? faculty_id : user.faculty_id,
      course_ids: course_ids !== undefined ? course_ids : user.course_ids,
    };

    // Validar campos requeridos según el rol (nuevo o actual)
    const fieldValidation = validateRequiredFields(updatedData.role, updatedData);
    if (!fieldValidation.valid) {
      return res.status(400).json({
        success: false,
        message: `Campos requeridos faltantes para rol ${updatedData.role}: ${fieldValidation.missing.join(', ')}`,
      });
    }

    // Validar scope (universidad/facultad)
    const scopeValidation = validateScope(req.user, updatedData);
    if (!scopeValidation.valid) {
      return res.status(403).json({
        success: false,
        message: scopeValidation.message,
      });
    }

    // Actualizar university_id
    if (university_id !== undefined) {
      user.university_id = updatedData.role === 'super-admin' ? null : university_id;
    }

    // Actualizar faculty_id
    if (faculty_id !== undefined) {
      user.faculty_id = ['faculty-admin', 'professor-admin', 'professor'].includes(updatedData.role)
        ? faculty_id
        : null;
    }

    // Actualizar course_ids
    if (course_ids !== undefined) {
      if (['professor-admin', 'professor'].includes(updatedData.role)) {
        if (!Array.isArray(course_ids) || course_ids.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'course_ids debe ser un array con al menos un curso',
          });
        }
        user.course_ids = course_ids;
      } else {
        user.course_ids = [];
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);

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
      message: 'Error al actualizar usuario',
      error: error.message,
    });
  }
};

/**
 * Eliminar usuario (baja lógica) - DELETE /api/users/:id
 * @route DELETE /api/users/:id
 * @access Private (solo admin)
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user || user.deleted === true) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Proteger al usuario admin original
    if (user.username === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el administrador principal',
      });
    }

    // Eliminar usuario (soft delete)
    await user.softDelete();

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message,
    });
  }
};

/**
 * Restaurar usuario eliminado - PUT /api/users/:id/restore
 * @route PUT /api/users/:id/restore
 * @access Private (solo admin)
 */
export const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Verificar que el usuario esté eliminado
    if (user.deleted !== true) {
      return res.status(400).json({
        success: false,
        message: 'El usuario no está eliminado',
      });
    }

    // Restaurar usuario
    await user.restore();

    res.status(200).json({
      success: true,
      message: 'Usuario restaurado exitosamente',
      data: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Error al restaurar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restaurar usuario',
      error: error.message,
    });
  }
};
