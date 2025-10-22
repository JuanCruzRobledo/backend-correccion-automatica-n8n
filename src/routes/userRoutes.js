/**
 * Rutas de Usuarios (CRUD)
 */
import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
} from '../controllers/userController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Todas las rutas de usuarios requieren autenticación y rol admin
 */
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/users
 * @desc    Listar todos los usuarios
 * @access  Private (admin)
 */
router.get('/', getUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Obtener un usuario por ID
 * @access  Private (admin)
 */
router.get('/:id', getUserById);

/**
 * @route   POST /api/users
 * @desc    Crear nuevo usuario
 * @access  Private (admin)
 */
router.post('/', createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Actualizar usuario
 * @access  Private (admin)
 */
router.put('/:id', updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Eliminar usuario (soft delete)
 * @access  Private (admin)
 */
router.delete('/:id', deleteUser);

/**
 * @route   PUT /api/users/:id/restore
 * @desc    Restaurar usuario eliminado
 * @access  Private (admin)
 */
router.put('/:id/restore', restoreUser);

export default router;
