/**
 * Modelo de Usuario
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'El nombre de usuario es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
      match: [/^[a-z0-9_-]+$/, 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false, // No incluir en consultas por defecto
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
      required: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
userSchema.index({ username: 1 });
userSchema.index({ deleted: 1 });

/**
 * Hook pre-save para hashear la contraseña
 */
userSchema.pre('save', async function (next) {
  // Solo hashear si la contraseña fue modificada (o es nueva)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generar salt y hashear
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Método de instancia para comparar contraseñas
 * @param {String} candidatePassword - Contraseña a verificar
 * @returns {Promise<Boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error al comparar contraseñas');
  }
};

/**
 * Método de instancia para obtener datos públicos del usuario
 * @returns {Object}
 */
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    role: this.role,
    deleted: this.deleted || false, // Incluir campo deleted
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Método estático para encontrar usuario por username (con password)
 * Incluye usuarios eliminados para validación en login
 * @param {String} username
 * @returns {Promise<Document>}
 */
userSchema.statics.findByUsername = function (username) {
  return this.findOne({ username: username.toLowerCase() }).select('+password');
};

/**
 * Método estático para encontrar solo usuarios activos (no eliminados)
 * Incluye usuarios sin el campo 'deleted' (compatibilidad con datos antiguos)
 * @returns {Promise<Array>}
 */
userSchema.statics.findActive = function () {
  return this.find({ $or: [{ deleted: false }, { deleted: { $exists: false } }] });
};

/**
 * Método de instancia para soft delete
 * @returns {Promise<Document>}
 */
userSchema.methods.softDelete = async function () {
  this.deleted = true;
  return await this.save();
};

/**
 * Método de instancia para restaurar usuario eliminado
 * @returns {Promise<Document>}
 */
userSchema.methods.restore = async function () {
  this.deleted = false;
  return await this.save();
};

const User = mongoose.model('User', userSchema);

export default User;
