/**
 * Controlador de Usuarios (CRUD)
 */
import User from '../models/User.js';

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

    // Construir filtros
    const filters = {};

    if (!includeDeleted) {
      filters.deleted = false;
    }

    if (role) {
      filters.role = role;
    }

    if (university_id) {
      filters.university_id = university_id;
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
    const { username, name, password, role, university_id } = req.body;

    // Validar datos
    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'username, nombre y password son requeridos',
      });
    }

    // Validar university_id para roles que no sean super-admin
    const userRole = role || 'user';
    if (userRole !== 'super-admin' && !university_id) {
      return res.status(400).json({
        success: false,
        message: 'El campo university_id es requerido para roles que no sean super-admin',
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

    // Crear usuario
    const user = new User({
      username,
      name,
      password,
      role: userRole,
      university_id: userRole === 'super-admin' ? null : university_id,
    });

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
    const { username, name, password, role, university_id } = req.body;

    // Buscar usuario
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
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
      user.role = role;

      // Si cambia a super-admin, limpiar university_id
      if (role === 'super-admin') {
        user.university_id = null;
      }
    }

    // Actualizar university_id si se proporciona
    if (university_id !== undefined) {
      // Validar que no sea super-admin
      const finalRole = role || user.role;
      if (finalRole === 'super-admin') {
        user.university_id = null;
      } else {
        user.university_id = university_id;
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
