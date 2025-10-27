/**
 * Rate Limiting Middleware
 * Limita el número de intentos por usuario en un período de tiempo
 */

// Almacenamiento en memoria (en producción usar Redis)
const rateLimitStore = new Map();

/**
 * Middleware de rate limiting
 * @param {Number} maxAttempts - Número máximo de intentos
 * @param {Number} windowMs - Ventana de tiempo en milisegundos
 * @param {String} keyPrefix - Prefijo para identificar el tipo de rate limit
 * @returns {Function} Middleware de Express
 */
export const rateLimitMiddleware = (maxAttempts, windowMs, keyPrefix = 'rate-limit') => {
  return async (req, res, next) => {
    try {
      // Obtener identificador del usuario (IP o userId si está autenticado)
      const identifier = req.user?.userId || req.ip || req.connection.remoteAddress;
      const key = `${keyPrefix}:${identifier}`;

      // Obtener datos de rate limit para este usuario
      const now = Date.now();
      let userData = rateLimitStore.get(key);

      if (!userData) {
        // Primera vez que accede
        userData = {
          attempts: 1,
          firstAttempt: now,
          resetAt: now + windowMs,
        };
        rateLimitStore.set(key, userData);
        return next();
      }

      // Verificar si la ventana de tiempo ha expirado
      if (now > userData.resetAt) {
        // Reiniciar contador
        userData = {
          attempts: 1,
          firstAttempt: now,
          resetAt: now + windowMs,
        };
        rateLimitStore.set(key, userData);
        return next();
      }

      // Incrementar intentos
      userData.attempts += 1;

      // Verificar si excedió el límite
      if (userData.attempts > maxAttempts) {
        const remainingTime = Math.ceil((userData.resetAt - now) / 1000 / 60); // en minutos

        return res.status(429).json({
          success: false,
          message: `Demasiados intentos. Por favor intenta de nuevo en ${remainingTime} minuto${remainingTime !== 1 ? 's' : ''}.`,
          retryAfter: remainingTime,
        });
      }

      // Actualizar contador
      rateLimitStore.set(key, userData);
      next();
    } catch (error) {
      console.error('Error en rate limiting:', error);
      // En caso de error, permitir la petición (fail-open)
      next();
    }
  };
};

/**
 * Limpiar entradas expiradas del store (llamar periódicamente)
 */
export const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetAt) {
      rateLimitStore.delete(key);
    }
  }
};

// Limpiar cada 10 minutos
setInterval(cleanupExpiredEntries, 10 * 60 * 1000);

/**
 * Rate limit específico para configuración de API keys
 * 5 intentos por hora
 */
export const apiKeyRateLimit = rateLimitMiddleware(
  5, // máximo 5 intentos
  60 * 60 * 1000, // en 1 hora
  'api-key-config'
);

export default {
  rateLimitMiddleware,
  apiKeyRateLimit,
  cleanupExpiredEntries,
};
