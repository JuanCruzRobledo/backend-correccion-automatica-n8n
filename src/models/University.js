/**
 * Modelo de Universidad
 */
import mongoose from 'mongoose';

const universitySchema = new mongoose.Schema(
  {
    university_id: {
      type: String,
      required: [true, 'El ID de la universidad es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'El ID debe contener solo letras minúsculas, números y guiones'],
    },
    name: {
      type: String,
      required: [true, 'El nombre de la universidad es requerido'],
      trim: true,
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
  }
);

// Índice compuesto para consultas eficientes
universitySchema.index({ university_id: 1, deleted: 1 });

/**
 * Método estático para obtener universidades activas
 * @returns {Promise<Array>}
 */
universitySchema.statics.findActive = function () {
  return this.find({ deleted: false }).sort({ name: 1 });
};

/**
 * Método de instancia para soft delete
 * @returns {Promise<Document>}
 */
universitySchema.methods.softDelete = function () {
  this.deleted = true;
  return this.save();
};

/**
 * Método de instancia para restaurar
 * @returns {Promise<Document>}
 */
universitySchema.methods.restore = function () {
  this.deleted = false;
  return this.save();
};

// Evitar que documentos eliminados aparezcan en consultas por defecto
universitySchema.pre(/^find/, function (next) {
  // Solo aplicar si no se está consultando explícitamente por deleted
  if (!this.getQuery().hasOwnProperty('deleted')) {
    this.where({ deleted: false });
  }
  next();
});

const University = mongoose.model('University', universitySchema);

export default University;
