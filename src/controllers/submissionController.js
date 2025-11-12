/**
 * Controlador de Submissions (Entregas de Alumnos)
 * Gestiona la subida, listado, actualización y eliminación de entregas
 */
import Submission from '../models/Submission.js';
import Commission from '../models/Commission.js';
import Rubric from '../models/Rubric.js';
import { uploadFileToDrive } from '../services/driveService.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Obtener todas las submissions con filtros multi-tenant
 * GET /api/submissions?commission_id=...&rubric_id=...&status=...
 */
export const getAllSubmissions = async (req, res) => {
  try {
    const { commission_id, rubric_id, status } = req.query;
    const filters = {};

    // Aplicar filtros multi-tenant según rol
    if (req.user.role === 'super-admin') {
      // Super-admin ve todo
    } else if (req.user.role === 'university-admin') {
      // University-admin solo su universidad
      filters.university_id = req.user.university_id;
    } else if (req.user.role === 'professor') {
      // Professor solo sus comisiones
      const professorCommissions = await Commission.find({
        professors: req.user.userId,
        deleted: false,
      }).select('commission_id');

      const commissionIds = professorCommissions.map((c) => c.commission_id);

      if (commissionIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          message: 'No tiene comisiones asignadas',
        });
      }

      filters.commission_id = { $in: commissionIds };
    } else {
      // user no tiene acceso
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado',
      });
    }

    // Aplicar filtros adicionales del query
    if (commission_id) {
      filters.commission_id = commission_id;
    }
    if (rubric_id) {
      filters.rubric_id = rubric_id;
    }
    if (status) {
      filters.status = status;
    }

    const submissions = await Submission.findActive(filters);

    res.status(200).json({
      success: true,
      data: submissions,
      count: submissions.length,
    });
  } catch (error) {
    console.error('Error al obtener submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener submissions',
      error: error.message,
    });
  }
};

/**
 * Obtener una submission por ID con validación de acceso
 * GET /api/submissions/:id
 */
export const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findById(id)
      .populate('uploaded_by', 'name username')
      .populate('correction.corrected_by', 'name username');

    if (!submission || submission.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Submission no encontrada',
      });
    }

    // Validar acceso multi-tenant
    if (req.user.role === 'super-admin') {
      // Super-admin accede a todo
    } else if (req.user.role === 'university-admin') {
      // University-admin solo su universidad
      if (submission.university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado a esta submission',
        });
      }
    } else if (req.user.role === 'professor') {
      // Professor solo sus comisiones
      const commission = await Commission.findOne({
        commission_id: submission.commission_id,
        professors: req.user.userId,
        deleted: false,
      });

      if (!commission) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado a esta submission',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado',
      });
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    console.error('Error al obtener submission:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener submission',
      error: error.message,
    });
  }
};

/**
 * Crear nueva submission (subir entrega de alumno)
 * POST /api/submissions
 * Body (multipart/form-data): file, student_name, student_id, rubric_id, commission_id
 */
export const createSubmission = async (req, res) => {
  let tempFilePath = null;

  try {
    const { student_name, student_id, rubric_id, commission_id } = req.body;
    const uploadedFile = req.file;

    // Validaciones
    if (!student_name || !rubric_id || !commission_id) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: student_name, rubric_id, commission_id',
      });
    }

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo',
      });
    }

    // Validar extensión .txt
    if (!uploadedFile.originalname.endsWith('.txt')) {
      // Eliminar archivo temporal
      await fs.unlink(uploadedFile.path);
      return res.status(400).json({
        success: false,
        message: 'Solo se permiten archivos .txt',
      });
    }

    tempFilePath = uploadedFile.path;

    // Buscar rúbrica para obtener drive_folder_id y jerarquía
    const rubric = await Rubric.findOne({ rubric_id, deleted: false });

    if (!rubric) {
      await fs.unlink(tempFilePath);
      return res.status(404).json({
        success: false,
        message: 'Rúbrica no encontrada',
      });
    }

    if (!rubric.drive_folder_id) {
      await fs.unlink(tempFilePath);
      return res.status(400).json({
        success: false,
        message: 'La rúbrica no tiene carpeta de Drive configurada',
      });
    }

    // Validar que commission_id coincida
    if (rubric.commission_id !== commission_id) {
      await fs.unlink(tempFilePath);
      return res.status(400).json({
        success: false,
        message: 'La rúbrica no pertenece a la comisión especificada',
      });
    }

    // Validar acceso del profesor a la comisión
    if (req.user.role === 'professor') {
      const commission = await Commission.findOne({
        commission_id,
        professors: req.user.userId,
        deleted: false,
      });

      if (!commission) {
        await fs.unlink(tempFilePath);
        return res.status(403).json({
          success: false,
          message: 'No tiene acceso a esta comisión',
        });
      }
    }

    // Validar que no exista submission duplicada (mismo rubric_id + student_name)
    const existingSubmission = await Submission.findOne({
      rubric_id,
      student_name: student_name.toLowerCase(),
      deleted: false,
    });

    if (existingSubmission) {
      await fs.unlink(tempFilePath);
      return res.status(400).json({
        success: false,
        message: `Ya existe una entrega para el alumno "${student_name}" en esta rúbrica`,
      });
    }

    // Generar nombre de archivo: alumno-{student_name}.txt
    const cleanStudentName = student_name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const driveFileName = `alumno-${cleanStudentName}.txt`;

    // Leer preview del archivo (primeros 500 caracteres)
    const fileContent = await fs.readFile(tempFilePath, 'utf-8');
    const fileContentPreview = fileContent.substring(0, 500);

    // Subir archivo a Drive
    console.log(`📤 Subiendo archivo a Drive: ${driveFileName}`);
    const driveResponse = await uploadFileToDrive(
      tempFilePath,
      driveFileName,
      rubric.drive_folder_id
    );

    // Generar submission_id
    const submission_id = Submission.generateSubmissionId(commission_id, cleanStudentName);

    // Crear submission en BD
    const newSubmission = new Submission({
      submission_id,
      commission_id: rubric.commission_id,
      rubric_id: rubric.rubric_id,
      course_id: rubric.course_id,
      career_id: rubric.career_id,
      faculty_id: rubric.faculty_id,
      university_id: rubric.university_id,
      student_name: cleanStudentName,
      student_id: student_id || null,
      file_name: driveFileName,
      file_size: uploadedFile.size,
      file_content_preview: fileContentPreview,
      drive_file_id: driveResponse.drive_file_id,
      drive_file_url: driveResponse.drive_file_url,
      rubric_drive_folder_id: rubric.drive_folder_id,
      uploaded_by: req.user.userId,
      status: 'uploaded',
    });

    await newSubmission.save();

    // Eliminar archivo temporal
    await fs.unlink(tempFilePath);

    console.log(`✅ Submission creada: ${submission_id}`);

    res.status(201).json({
      success: true,
      data: newSubmission,
      message: 'Entrega subida exitosamente',
    });
  } catch (error) {
    console.error('Error al crear submission:', error);

    // Limpiar archivo temporal en caso de error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo temporal:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear submission',
      error: error.message,
    });
  }
};

/**
 * Actualizar submission (estado o corrección)
 * PUT /api/submissions/:id
 * Body: { status?, correction? }
 */
export const updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, correction } = req.body;

    const submission = await Submission.findById(id);

    if (!submission || submission.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Submission no encontrada',
      });
    }

    // Validar acceso
    if (req.user.role === 'professor') {
      const commission = await Commission.findOne({
        commission_id: submission.commission_id,
        professors: req.user.userId,
        deleted: false,
      });

      if (!commission) {
        return res.status(403).json({
          success: false,
          message: 'No tiene acceso a esta submission',
        });
      }
    } else if (req.user.role === 'university-admin') {
      if (submission.university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene acceso a esta submission',
        });
      }
    }

    // Actualizar estado
    if (status) {
      await submission.updateStatus(status);
    }

    // Actualizar corrección
    if (correction) {
      await submission.addCorrection({
        ...correction,
        corrected_by: req.user.userId,
      });
    }

    const updatedSubmission = await Submission.findById(id)
      .populate('uploaded_by', 'name username')
      .populate('correction.corrected_by', 'name username');

    res.status(200).json({
      success: true,
      data: updatedSubmission,
      message: 'Submission actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar submission:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar submission',
      error: error.message,
    });
  }
};

/**
 * Eliminar submission (soft delete)
 * DELETE /api/submissions/:id
 */
export const deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findById(id);

    if (!submission || submission.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Submission no encontrada',
      });
    }

    // Validar acceso
    if (req.user.role === 'professor') {
      const commission = await Commission.findOne({
        commission_id: submission.commission_id,
        professors: req.user.userId,
        deleted: false,
      });

      if (!commission) {
        return res.status(403).json({
          success: false,
          message: 'No tiene acceso a esta submission',
        });
      }
    } else if (req.user.role === 'university-admin') {
      if (submission.university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene acceso a esta submission',
        });
      }
    }

    await submission.softDelete();

    res.status(200).json({
      success: true,
      message: 'Submission eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar submission:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar submission',
      error: error.message,
    });
  }
};
