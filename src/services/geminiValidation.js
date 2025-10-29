/**
 * Servicio de Validación de API Keys de Gemini
 * Valida que una API key de Gemini sea válida haciendo un request de prueba
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Valida una API key de Gemini haciendo un request de prueba
 * @param {String} apiKey - API key a validar
 * @returns {Promise<{valid: Boolean, error?: String}>}
 */
export async function validateGeminiApiKey(apiKey) {
  // Validar formato básico
  if (!apiKey || typeof apiKey !== 'string') {
    return {
      valid: false,
      error: 'La API key debe ser una cadena no vacía',
    };
  }

  if (!apiKey.startsWith('AIza')) {
    return {
      valid: false,
      error: 'Formato de API key inválido (debe empezar con "AIza")',
    };
  }

  try {
    // Inicializar cliente de Gemini con la API key
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Hacer un request de prueba simple
    const prompt = 'Di "OK" si recibes este mensaje.';

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Si llegamos aquí sin error, la key es válida
    console.log('✅ API key validada exitosamente:', text);

    return {
      valid: true,
    };
  } catch (error) {
    console.error('❌ Error al validar API key:', error);

    // Analizar el tipo de error
    let errorMessage = 'Error al validar la API key';

    if (error.message) {
      const msg = error.message.toLowerCase();

      if (msg.includes('api key not valid') || msg.includes('invalid api key')) {
        errorMessage = 'API key inválida o incorrecta';
      } else if (msg.includes('quota') || msg.includes('limit exceeded')) {
        errorMessage = 'API key sin cuota disponible o límite excedido';
      } else if (msg.includes('permission denied')) {
        errorMessage = 'API key sin permisos necesarios';
      } else if (msg.includes('network') || msg.includes('enotfound')) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
    }

    return {
      valid: false,
      error: errorMessage,
    };
  }
}

/**
 * Obtiene información sobre el uso de una API key (opcional, para futuro)
 * @param {String} apiKey
 * @returns {Promise<Object>}
 */
export async function getApiKeyUsage(apiKey) {
  // TODO: Implementar si Gemini API proporciona endpoint de uso/cuota
  // Por ahora solo retornamos null
  return null;
}

export default {
  validateGeminiApiKey,
  getApiKeyUsage,
};
