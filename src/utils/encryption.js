/**
 * Servicio de Encriptación
 * Encripta y desencripta datos sensibles usando AES-256-CBC
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes (64 caracteres hex)
const IV_LENGTH = 16; // Initialization Vector length

/**
 * Valida que la ENCRYPTION_KEY esté configurada correctamente
 */
function validateEncryptionKey() {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY no está configurada en las variables de entorno');
  }

  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY debe ser de 32 bytes (64 caracteres hexadecimales)');
  }
}

/**
 * Encripta un texto plano
 * @param {string} text - Texto a encriptar
 * @returns {string} Texto encriptado en formato "iv:encryptedData"
 */
export function encrypt(text) {
  validateEncryptionKey();

  if (!text || typeof text !== 'string') {
    throw new Error('El texto a encriptar debe ser una cadena no vacía');
  }

  try {
    // Generar IV aleatorio
    const iv = crypto.randomBytes(IV_LENGTH);

    // Crear cipher
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    // Encriptar
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Retornar IV + encrypted data separados por ":"
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Error al encriptar:', error);
    throw new Error('Error al encriptar los datos');
  }
}

/**
 * Desencripta un texto encriptado
 * @param {string} encryptedText - Texto encriptado en formato "iv:encryptedData"
 * @returns {string} Texto desencriptado
 */
export function decrypt(encryptedText) {
  validateEncryptionKey();

  if (!encryptedText || typeof encryptedText !== 'string') {
    throw new Error('El texto a desencriptar debe ser una cadena no vacía');
  }

  try {
    // Separar IV y datos encriptados
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Formato de texto encriptado inválido');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    // Crear decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    // Desencriptar
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error al desencriptar:', error);
    throw new Error('Error al desencriptar los datos');
  }
}

/**
 * Genera una ENCRYPTION_KEY aleatoria (para desarrollo)
 * @returns {string} Key de 32 bytes en formato hexadecimal
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

export default {
  encrypt,
  decrypt,
  generateEncryptionKey
};
