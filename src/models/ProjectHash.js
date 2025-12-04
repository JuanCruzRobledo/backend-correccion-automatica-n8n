/**
 * Modelo de ProjectHash
 * Almacena hashes SHA256 de proyectos para detección de similitud
 */
import mongoose from 'mongoose';

const projectHashSchema = new mongoose.Schema(
  {
    // Referencias
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
    student_id: {
      type: String,
      default: null,
      index: true,
    },
    student_name: {
      type: String,
      required: [true, 'El nombre del estudiante es requerido'],
      trim: true,
      lowercase: true,
      index: true,
    },
    student_email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    submission_id: {
      type: String,
      default: null,
      index: true,
    },

    // Hashes
    project_hash: {
      type: String,
      required: [true, 'El hash del proyecto es requerido'],
    },
    file_hashes: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },

    // Estadísticas
    stats: {
      total_files: {
        type: Number,
        default: 0,
      },
      total_lines: {
        type: Number,
        default: 0,
      },
      java_files: {
        type: Number,
        default: 0,
      },
      other_files: {
        type: Number,
        default: 0,
      },
    },

    // Metadata
    metadata: {
      project_name: {
        type: String,
        default: null,
      },
      mode: {
        type: String,
        default: 'Proyecto completo',
      },
      extensions: {
        type: [String],
        default: [],
      },
      include_tests: {
        type: Boolean,
        default: true,
      },
    },

    // Timestamps
    processed_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: 'processed_at', updatedAt: 'updated_at' },
  }
);

// Índices compuestos para consultas eficientes
projectHashSchema.index({ commission_id: 1, rubric_id: 1 });
projectHashSchema.index({ project_hash: 1 });
projectHashSchema.index({ student_name: 1, commission_id: 1 });
projectHashSchema.index({ commission_id: 1, rubric_id: 1, student_name: 1 }, { unique: true });

/**
 * Método estático para encontrar proyectos por comisión y rúbrica
 * @param {String} commissionId
 * @param {String} rubricId
 * @returns {Promise<Array>}
 */
projectHashSchema.statics.findByCommissionAndRubric = function (commissionId, rubricId) {
  return this.find({
    commission_id: commissionId,
    rubric_id: rubricId,
  }).sort({ processed_at: -1 });
};

/**
 * Método estático para encontrar proyectos con hash idéntico
 * @param {String} projectHash
 * @returns {Promise<Array>}
 */
projectHashSchema.statics.findByProjectHash = function (projectHash) {
  return this.find({ project_hash: projectHash });
};

/**
 * Método estático para encontrar proyectos de un estudiante
 * @param {String} studentName
 * @param {String} commissionId (opcional)
 * @returns {Promise<Array>}
 */
projectHashSchema.statics.findByStudent = function (studentName, commissionId = null) {
  const query = { student_name: studentName.toLowerCase().trim() };
  if (commissionId) {
    query.commission_id = commissionId;
  }
  return this.find(query).sort({ processed_at: -1 });
};

/**
 * Método estático para buscar o crear un proyecto hash
 * @param {Object} projectData - Datos del proyecto
 * @returns {Promise<Document>}
 */
projectHashSchema.statics.findOrCreate = async function (projectData) {
  const existing = await this.findOne({
    commission_id: projectData.commission_id,
    rubric_id: projectData.rubric_id,
    student_name: projectData.student_name.toLowerCase().trim(),
  });

  if (existing) {
    // Actualizar si ya existe
    Object.assign(existing, projectData);
    existing.updated_at = new Date();
    return await existing.save();
  }

  // Crear nuevo
  return await this.create(projectData);
};

/**
 * Método estático para obtener estadísticas por comisión y rúbrica
 * @param {String} commissionId
 * @param {String} rubricId
 * @returns {Promise<Object>}
 */
projectHashSchema.statics.getStatsByCommissionAndRubric = async function (
  commissionId,
  rubricId
) {
  const projects = await this.findByCommissionAndRubric(commissionId, rubricId);

  const totalProjects = projects.length;
  const uniqueHashes = new Set(projects.map((p) => p.project_hash)).size;
  const totalFiles = projects.reduce((sum, p) => sum + (p.stats?.total_files || 0), 0);
  const totalLines = projects.reduce((sum, p) => sum + (p.stats?.total_lines || 0), 0);

  return {
    total_projects: totalProjects,
    unique_projects: uniqueHashes,
    duplicate_groups: totalProjects - uniqueHashes,
    avg_files_per_project: totalProjects > 0 ? Math.round(totalFiles / totalProjects) : 0,
    avg_lines_per_project: totalProjects > 0 ? Math.round(totalLines / totalProjects) : 0,
  };
};

/**
 * Método de instancia para actualizar hashes
 * @param {String} projectHash
 * @param {Object} fileHashes
 * @returns {Promise<Document>}
 */
projectHashSchema.methods.updateHashes = async function (projectHash, fileHashes) {
  this.project_hash = projectHash;
  this.file_hashes = fileHashes;
  this.updated_at = new Date();
  this.markModified('file_hashes'); // Necesario para Mixed types
  return await this.save();
};

/**
 * Método de instancia para actualizar estadísticas
 * @param {Object} stats
 * @returns {Promise<Document>}
 */
projectHashSchema.methods.updateStats = async function (stats) {
  this.stats = {
    total_files: stats.totalFiles || 0,
    total_lines: stats.totalLines || 0,
    java_files: stats.javaFiles || 0,
    other_files: stats.otherFiles || 0,
  };
  this.updated_at = new Date();
  return await this.save();
};

/**
 * Método de instancia para obtener archivos como objeto
 * @returns {Object}
 */
projectHashSchema.methods.getFileHashesAsObject = function () {
  return this.file_hashes || {};
};

const ProjectHash = mongoose.model('ProjectHash', projectHashSchema);

export default ProjectHash;
