/**
 * Modelo de Comisión
 * Representa una comisión/curso específico de una materia
 * (por ejemplo: distintos profesores o turnos para la misma materia)
 */
import mongoose from 'mongoose';

const commissionSchema = new mongoose.Schema(
  {
    commission_id: {
      type: String,
      required: [true, 'El ID de la comisión es requerido'],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'El ID debe contener solo letras minúsculas, números y guiones'],
    },
    name: {
      type: String,
      required: [true, 'El nombre de la comisión es requerido'],
      trim: true,
    },
    course_id: {
      type: String,
      required: [true, 'El ID del curso/materia es requerido'],
      index: true,
    },
    career_id: {
      type: String,
      required: [true, 'El ID de la carrera es requerido'],
      index: true,
    },
    faculty_id: {
      type: String,
      required: [true, 'El ID de la facultad es requerido'],
      index: true,
    },
    university_id: {
      type: String,
      required: [true, 'El ID de la universidad es requerido'],
      index: true,
    },
    professors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: []
    }],
    year: {
      type: Number,
      required: [true, 'El año es requerido'],
      min: [2020, 'El año debe ser 2020 o posterior'],
      max: [2100, 'El año debe ser anterior a 2100'],
      index: true,
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para consultas eficientes
commissionSchema.index({ commission_id: 1, deleted: 1 });
commissionSchema.index({ course_id: 1, deleted: 1 });
commissionSchema.index({ course_id: 1, year: 1, deleted: 1 });
commissionSchema.index({ year: 1, deleted: 1 });
commissionSchema.index({ professors: 1 });

// Evitar duplicados: curso + comisión debe ser único
commissionSchema.index({ course_id: 1, commission_id: 1 }, { unique: true });

/**
 * Método estático para obtener comisiones activas
 * @param {Object} filters - Filtros opcionales { course_id, year }
 * @returns {Promise<Array>}
 */
commissionSchema.statics.findActive = function (filters = {}) {
  const query = { deleted: false };
  if (filters.course_id) {
    query.course_id = filters.course_id;
  }
  if (filters.year) {
    query.year = filters.year;
  }
  if (filters.career_id) {
    query.career_id = filters.career_id;
  }
  return this.find(query).sort({ name: 1 });
};

/**
 * Método estático para obtener comisiones por año
 * @param {Number} year
 * @returns {Promise<Array>}
 */
commissionSchema.statics.findByYear = function (year) {
  return this.find({ year, deleted: false }).sort({ name: 1 });
};

/**
 * Método de instancia para soft delete
 * @returns {Promise<Document>}
 */
commissionSchema.methods.softDelete = function () {
  this.deleted = true;
  return this.save();
};

/**
 * Método de instancia para restaurar
 * @returns {Promise<Document>}
 */
commissionSchema.methods.restore = function () {
  this.deleted = false;
  return this.save();
};

/**
 * Método de instancia para asignar profesor a la comisión
 * @param {String|ObjectId} professorId - ID del profesor a asignar
 * @returns {Promise<Document>}
 */
commissionSchema.methods.assignProfessor = async function (professorId) {
  // Verificar que el profesor no esté ya asignado
  const alreadyAssigned = this.professors.some(
    (id) => id.toString() === professorId.toString()
  );

  if (alreadyAssigned) {
    throw new Error('El profesor ya está asignado a esta comisión');
  }

  this.professors.push(professorId);
  return await this.save();
};

/**
 * Método de instancia para remover profesor de la comisión
 * @param {String|ObjectId} professorId - ID del profesor a remover
 * @returns {Promise<Document>}
 */
commissionSchema.methods.removeProfessor = async function (professorId) {
  this.professors = this.professors.filter(
    (id) => id.toString() !== professorId.toString()
  );
  return await this.save();
};

/**
 * Método estático para encontrar comisiones por profesor
 * @param {String|ObjectId} professorId - ID del profesor
 * @returns {Promise<Array>}
 */
commissionSchema.statics.findByProfessor = function (professorId) {
  return this.find({
    professors: professorId,
    deleted: false
  }).sort({ year: -1, name: 1 });
};

// Evitar que documentos eliminados aparezcan en consultas por defecto
commissionSchema.pre(/^find/, function (next) {
  if (!this.getQuery().hasOwnProperty('deleted')) {
    this.where({ deleted: false });
  }
  next();
});

const Commission = mongoose.model('Commission', commissionSchema);

export default Commission;
