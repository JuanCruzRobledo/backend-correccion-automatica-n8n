/**
 * Modelo de Usuario
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { encrypt, decrypt } from '../utils/encryption.js';

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
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false, // No incluir en consultas por defecto
    },
    role: {
      type: String,
      enum: ['super-admin', 'university-admin', 'faculty-admin', 'professor-admin', 'professor', 'user'],
      default: 'user',
      required: true,
    },
    university_id: {
      type: String,
      default: null,
      index: true,
      trim: true,
      lowercase: true,
    },
    faculty_id: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },
    course_ids: {
      type: [String],
      default: [],
      index: true,
    },
    first_login: {
      type: Boolean,
      default: true,
    },
    // Campos para API Key de Gemini
    gemini_api_key_encrypted: {
      type: String,
      default: null,
      select: false, // No incluir en consultas por defecto
    },
    gemini_api_key_last_4: {
      type: String,
      default: null,
    },
    gemini_api_key_configured_at: {
      type: Date,
      default: null,
    },
    gemini_api_key_last_validated: {
      type: Date,
      default: null,
    },
    gemini_api_key_is_valid: {
      type: Boolean,
      default: false,
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
userSchema.index({ deleted: 1 });
userSchema.index({ gemini_api_key_is_valid: 1 });
userSchema.index({ university_id: 1, deleted: 1 });
userSchema.index({ role: 1, university_id: 1 });
userSchema.index({ faculty_id: 1, deleted: 1 });
userSchema.index({ course_ids: 1 });

/**
 * Hook pre-save para validar university_id, faculty_id, course_ids y hashear la contraseña
 */
userSchema.pre('save', async function (next) {
  // Validar que university_id sea requerido para todos excepto super-admin
  if (this.role !== 'super-admin' && !this.university_id) {
    return next(new Error('El campo university_id es requerido para roles que no sean super-admin'));
  }

  // super-admin NO debe tener university_id
  if (this.role === 'super-admin' && this.university_id) {
    this.university_id = null;
  }

  // Validar faculty_id para faculty-admin
  if (this.role === 'faculty-admin' && !this.faculty_id) {
    return next(new Error('El campo faculty_id es requerido para el rol faculty-admin'));
  }

  // Limpiar faculty_id si no es faculty-admin
  if (this.role !== 'faculty-admin' && this.faculty_id) {
    this.faculty_id = null;
  }

  // Validar course_ids para professor-admin
  if (this.role === 'professor-admin') {
    if (!this.course_ids || this.course_ids.length === 0) {
      return next(new Error('El campo course_ids debe tener al menos un curso para el rol professor-admin'));
    }
  }

  // Limpiar course_ids si no es professor-admin
  if (this.role !== 'professor-admin' && this.course_ids && this.course_ids.length > 0) {
    this.course_ids = [];
  }

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
    name: this.name,
    role: this.role,
    university_id: this.university_id,
    faculty_id: this.faculty_id,
    course_ids: this.course_ids,
    first_login: this.first_login,
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

/**
 * Método de instancia para configurar API Key de Gemini
 * @param {String} plainApiKey - API key en texto plano
 * @returns {Promise<void>}
 */
userSchema.methods.setGeminiApiKey = async function (plainApiKey) {
  if (!plainApiKey || typeof plainApiKey !== 'string') {
    throw new Error('La API key debe ser una cadena no vacía');
  }

  // Validar formato básico (debe empezar con "AIza")
  if (!plainApiKey.startsWith('AIza')) {
    throw new Error('Formato de API key de Gemini inválido (debe empezar con "AIza")');
  }

  try {
    // Encriptar la API key
    this.gemini_api_key_encrypted = encrypt(plainApiKey);

    // Guardar últimos 4 dígitos
    this.gemini_api_key_last_4 = plainApiKey.slice(-4);

    // Actualizar timestamps
    this.gemini_api_key_configured_at = new Date();
    this.gemini_api_key_last_validated = new Date();
    this.gemini_api_key_is_valid = true;

    await this.save();
  } catch (error) {
    throw new Error('Error al configurar la API key: ' + error.message);
  }
};

/**
 * Método de instancia para obtener API Key de Gemini desencriptada
 * @returns {String|null} - API key desencriptada o null si no existe
 */
userSchema.methods.getGeminiApiKey = function () {
  if (!this.gemini_api_key_encrypted) {
    return null;
  }

  try {
    return decrypt(this.gemini_api_key_encrypted);
  } catch (error) {
    console.error('Error al desencriptar API key:', error);
    return null;
  }
};

/**
 * Método de instancia para verificar si tiene API key válida
 * @returns {Boolean}
 */
userSchema.methods.hasValidGeminiApiKey = function () {
  return !!(
    this.gemini_api_key_encrypted &&
    this.gemini_api_key_is_valid
  );
};

/**
 * Método de instancia para obtener últimos 4 dígitos de la API key
 * @returns {String|null}
 */
userSchema.methods.getLast4Digits = function () {
  return this.gemini_api_key_last_4 || null;
};

/**
 * Método de instancia para limpiar/eliminar API Key de Gemini
 * @returns {Promise<void>}
 */
userSchema.methods.clearGeminiApiKey = async function () {
  this.gemini_api_key_encrypted = null;
  this.gemini_api_key_last_4 = null;
  this.gemini_api_key_configured_at = null;
  this.gemini_api_key_last_validated = null;
  this.gemini_api_key_is_valid = false;

  await this.save();
};

/**
 * Método de instancia para marcar API key como inválida
 * @returns {Promise<void>}
 */
userSchema.methods.markGeminiApiKeyInvalid = async function () {
  this.gemini_api_key_is_valid = false;
  await this.save();
};

/**
 * Método de instancia para actualizar última validación de API key
 * @param {Boolean} isValid
 * @returns {Promise<void>}
 */
userSchema.methods.updateGeminiApiKeyValidation = async function (isValid) {
  this.gemini_api_key_last_validated = new Date();
  this.gemini_api_key_is_valid = isValid;
  await this.save();
};

/**
 * Método estático para encontrar usuarios por universidad
 * @param {String} university_id
 * @returns {Promise<Array>}
 */
userSchema.statics.findByUniversity = function (university_id) {
  return this.find({ university_id, deleted: false });
};

/**
 * Método estático para encontrar profesores por universidad
 * @param {String} university_id
 * @returns {Promise<Array>}
 */
userSchema.statics.findProfessorsByUniversity = function (university_id) {
  return this.find({
    university_id,
    role: 'professor',
    deleted: false
  });
};

/**
 * Método estático para encontrar usuarios por facultad
 * @param {String} faculty_id
 * @returns {Promise<Array>}
 */
userSchema.statics.findByFaculty = function (faculty_id) {
  return this.find({ faculty_id, deleted: false });
};

/**
 * Método estático para encontrar profesores-admin por curso
 * @param {String} course_id
 * @returns {Promise<Array>}
 */
userSchema.statics.findProfessorAdminsByCourse = function (course_id) {
  return this.find({
    role: 'professor-admin',
    course_ids: course_id,
    deleted: false
  });
};

const User = mongoose.model('User', userSchema);

export default User;
