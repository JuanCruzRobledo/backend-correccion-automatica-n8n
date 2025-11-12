/**
 * Modelo de Submission (Entrega de Alumno)
 * Representa una entrega de alumno asociada a una rúbrica
 */
import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    submission_id: {
      type: String,
      required: [true, 'El ID de la submission es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
    },

    // Jerarquía completa
    commission_id: {
      type: String,
      required: [true, 'El ID de la comisión es requerido'],
      index: true,
    },
    rubric_id: {
      type: String,
      required: [true, 'El ID de la rúbrica es requerido'],
      index: true,
    },
    course_id: {
      type: String,
      required: [true, 'El ID del curso es requerido'],
    },
    career_id: {
      type: String,
      required: [true, 'El ID de la carrera es requerido'],
    },
    faculty_id: {
      type: String,
      required: [true, 'El ID de la facultad es requerido'],
    },
    university_id: {
      type: String,
      required: [true, 'El ID de la universidad es requerido'],
      index: true,
    },

    // Datos del alumno
    student_name: {
      type: String,
      required: [true, 'El nombre del estudiante es requerido'],
      trim: true,
      lowercase: true,
    },
    student_id: {
      type: String,
      trim: true,
      default: null,
    },

    // Archivo
    file_name: {
      type: String,
      required: [true, 'El nombre del archivo es requerido'],
      trim: true,
    },
    file_size: {
      type: Number,
      default: 0,
    },
    file_content_preview: {
      type: String,
      default: null,
      maxlength: 500,
    },

    // Google Drive (SIMPLIFICADO)
    drive_file_id: {
      type: String,
      default: null,
    },
    drive_file_url: {
      type: String,
      default: null,
    },
    rubric_drive_folder_id: {
      type: String,
      default: null,
    },

    // Metadata
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario que subió el archivo es requerido'],
      index: true,
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
    },

    // Estado
    status: {
      type: String,
      enum: ['uploaded', 'pending-correction', 'corrected', 'failed'],
      default: 'uploaded',
      index: true,
    },

    // Corrección (opcional)
    correction: {
      corrected_at: {
        type: Date,
        default: null,
      },
      corrected_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      grade: {
        type: Number,
        default: null,
      },
      summary: {
        type: String,
        default: null,
      },
      strengths: {
        type: String,
        default: null,
      },
      recommendations: {
        type: String,
        default: null,
      },
      result_json: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
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
submissionSchema.index({ commission_id: 1, rubric_id: 1, deleted: 1 });
submissionSchema.index({ rubric_id: 1, student_name: 1 }, { unique: true });
submissionSchema.index({ university_id: 1, deleted: 1 });
submissionSchema.index({ uploaded_by: 1, deleted: 1 });
submissionSchema.index({ status: 1, deleted: 1 });

/**
 * Método estático para generar submission_id único
 * @param {String} commissionId
 * @param {String} studentName
 * @returns {String}
 */
submissionSchema.statics.generateSubmissionId = function (commissionId, studentName) {
  const timestamp = Date.now();
  const cleanName = studentName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `${commissionId}-${cleanName}-${timestamp}`;
};

/**
 * Método estático para encontrar submissions activas con filtros
 * @param {Object} filters - Filtros opcionales { commission_id, rubric_id, university_id, status }
 * @returns {Promise<Array>}
 */
submissionSchema.statics.findActive = function (filters = {}) {
  const query = { deleted: false };

  if (filters.commission_id) {
    query.commission_id = filters.commission_id;
  }
  if (filters.rubric_id) {
    query.rubric_id = filters.rubric_id;
  }
  if (filters.university_id) {
    query.university_id = filters.university_id;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.uploaded_by) {
    query.uploaded_by = filters.uploaded_by;
  }

  return this.find(query)
    .populate('uploaded_by', 'name username')
    .populate('correction.corrected_by', 'name username')
    .sort({ uploaded_at: -1 });
};

/**
 * Método de instancia para soft delete
 * @returns {Promise<Document>}
 */
submissionSchema.methods.softDelete = async function () {
  this.deleted = true;
  return await this.save();
};

/**
 * Método de instancia para restaurar
 * @returns {Promise<Document>}
 */
submissionSchema.methods.restore = async function () {
  this.deleted = false;
  return await this.save();
};

/**
 * Método de instancia para actualizar estado
 * @param {String} newStatus - Nuevo estado
 * @returns {Promise<Document>}
 */
submissionSchema.methods.updateStatus = async function (newStatus) {
  const validStatuses = ['uploaded', 'pending-correction', 'corrected', 'failed'];

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Estado inválido: ${newStatus}`);
  }

  this.status = newStatus;
  return await this.save();
};

/**
 * Método de instancia para agregar corrección
 * @param {Object} correctionData - Datos de corrección
 * @returns {Promise<Document>}
 */
submissionSchema.methods.addCorrection = async function (correctionData) {
  this.correction = {
    corrected_at: new Date(),
    corrected_by: correctionData.corrected_by,
    grade: correctionData.grade,
    summary: correctionData.summary,
    strengths: correctionData.strengths,
    recommendations: correctionData.recommendations,
    result_json: correctionData.result_json || null,
  };

  this.status = 'corrected';
  return await this.save();
};

// Evitar que documentos eliminados aparezcan en consultas por defecto
submissionSchema.pre(/^find/, function (next) {
  if (!this.getQuery().hasOwnProperty('deleted')) {
    this.where({ deleted: false });
  }
  next();
});

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
