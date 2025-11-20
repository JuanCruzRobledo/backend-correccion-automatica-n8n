/**
 * Utilidades para validación de jerarquía de roles
 */

/**
 * Verifica si un rol puede crear/asignar otro rol
 * @param {string} creatorRole - Rol del usuario que crea/modifica
 * @param {string} targetRole - Rol que se quiere asignar
 * @returns {boolean}
 */
export const canAssignRole = (creatorRole, targetRole) => {
  const hierarchy = {
    'super-admin': ['super-admin', 'university-admin', 'faculty-admin', 'professor-admin', 'professor', 'user'],
    'university-admin': ['faculty-admin', 'professor-admin', 'professor', 'user'],
    'faculty-admin': ['professor-admin', 'professor', 'user'],
    'professor-admin': ['professor'], // Solo puede crear profesores, NO otros professor-admin
  };

  return hierarchy[creatorRole]?.includes(targetRole) || false;
};

/**
 * Obtiene los campos requeridos según el rol
 * @param {string} role - Rol del usuario
 * @returns {string[]} - Lista de campos requeridos
 */
export const getRequiredFieldsByRole = (role) => {
  const requirements = {
    'super-admin': [],
    'university-admin': ['university_id'],
    'faculty-admin': ['university_id', 'faculty_id'],
    'professor-admin': ['university_id', 'faculty_id', 'course_ids'],
    'professor': ['university_id', 'faculty_id', 'course_ids'],
    'user': ['university_id'],
  };

  return requirements[role] || [];
};

/**
 * Valida que los campos requeridos estén presentes
 * @param {string} role - Rol del usuario
 * @param {object} data - Datos del usuario
 * @returns {{valid: boolean, missing: string[]}}
 */
export const validateRequiredFields = (role, data) => {
  const required = getRequiredFieldsByRole(role);
  const missing = [];

  for (const field of required) {
    if (field === 'course_ids') {
      if (!data[field] || !Array.isArray(data[field]) || data[field].length === 0) {
        missing.push(field);
      }
    } else {
      if (!data[field]) {
        missing.push(field);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
};

/**
 * Valida que el creador tenga permiso sobre el scope (universidad/facultad)
 * @param {object} creator - Usuario creador con {role, university_id, faculty_id}
 * @param {object} target - Datos del usuario a crear/modificar
 * @returns {{valid: boolean, message: string}}
 */
export const validateScope = (creator, target) => {
  const { role: creatorRole, university_id: creatorUnivId, faculty_id: creatorFacultyId } = creator;

  // Super-admin puede crear en cualquier universidad/facultad
  if (creatorRole === 'super-admin') {
    return { valid: true, message: '' };
  }

  // University-admin solo puede crear en su universidad
  if (creatorRole === 'university-admin') {
    if (target.university_id && target.university_id !== creatorUnivId) {
      return {
        valid: false,
        message: 'Solo puede crear usuarios en su universidad',
      };
    }
    return { valid: true, message: '' };
  }

  // Faculty-admin solo puede crear en su universidad y facultad
  if (creatorRole === 'faculty-admin') {
    if (target.university_id && target.university_id !== creatorUnivId) {
      return {
        valid: false,
        message: 'Solo puede crear usuarios en su universidad',
      };
    }
    if (target.faculty_id && target.faculty_id !== creatorFacultyId) {
      return {
        valid: false,
        message: 'Solo puede crear usuarios en su facultad',
      };
    }
    return { valid: true, message: '' };
  }

  // Professor-admin solo puede crear en su universidad y facultad
  if (creatorRole === 'professor-admin') {
    if (target.university_id && target.university_id !== creatorUnivId) {
      return {
        valid: false,
        message: 'Solo puede crear usuarios en su universidad',
      };
    }
    if (target.faculty_id && target.faculty_id !== creatorFacultyId) {
      return {
        valid: false,
        message: 'Solo puede crear usuarios en su facultad',
      };
    }
    return { valid: true, message: '' };
  }

  return { valid: false, message: 'No tiene permisos para crear usuarios' };
};

/**
 * Aplica herencia automática de campos según el rol del creador
 * @param {object} creator - Usuario creador
 * @param {object} targetData - Datos del usuario a crear
 * @returns {object} - Datos con herencia aplicada
 */
export const applyInheritance = (creator, targetData) => {
  const { role: creatorRole, university_id, faculty_id } = creator;
  const inherited = { ...targetData };

  // University-admin: heredar university_id
  if (creatorRole === 'university-admin') {
    if (targetData.role !== 'super-admin') {
      inherited.university_id = university_id;
    }
  }

  // Faculty-admin: heredar university_id y faculty_id
  if (creatorRole === 'faculty-admin') {
    if (targetData.role !== 'super-admin') {
      inherited.university_id = university_id;
    }
    if (['faculty-admin', 'professor-admin', 'professor'].includes(targetData.role)) {
      inherited.faculty_id = faculty_id;
    }
  }

  // Professor-admin: heredar university_id y faculty_id
  if (creatorRole === 'professor-admin') {
    if (targetData.role !== 'super-admin') {
      inherited.university_id = university_id;
    }
    if (targetData.role === 'professor') {
      inherited.faculty_id = faculty_id;
    }
  }

  return inherited;
};

export default {
  canAssignRole,
  getRequiredFieldsByRole,
  validateRequiredFields,
  validateScope,
  applyInheritance,
};
