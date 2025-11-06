# Guía de Despliegue en Easypanel

Este documento describe cómo desplegar el backend de corrección automática en Easypanel usando Docker Compose.

## 📋 Requisitos Previos

1. Cuenta en Easypanel
2. Servidor VPS configurado con Easypanel
3. **Servidor MongoDB externo** (puede ser MongoDB Atlas, servidor propio, o instancia de Easypanel)
4. Instancia de n8n configurada (para los webhooks)

## 🚀 Pasos para Desplegar

### 1. Generar Claves Secretas

Antes de desplegar, genera las claves secretas necesarias:

```bash
# Generar JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generar ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configurar Variables de Entorno en Easypanel

En el panel de Easypanel, configura las siguientes variables de entorno:

#### Variables Obligatorias:
- `MONGODB_URI`: URL de conexión a tu servidor MongoDB externo (ej: `mongodb://usuario:password@host:27017/correcion-automatica` o MongoDB Atlas)
- `JWT_SECRET`: El secreto generado anteriormente
- `ENCRYPTION_KEY`: La clave de encriptación generada (64 caracteres hex)
- `CORS_ORIGIN`: URL de tu frontend (ej: `https://tu-app.com`)

#### Variables de n8n:
- `N8N_RUBRIC_WEBHOOK_URL`: URL del webhook de rúbricas
- `N8N_GRADING_WEBHOOK_URL`: URL del webhook de corrección
- `N8N_SPREADSHEET_WEBHOOK_URL`: URL del webhook de planillas
- `N8N_CREATE_UNIVERSITY_FOLDER_WEBHOOK`: URL para crear carpeta de universidad
- `N8N_CREATE_FACULTY_FOLDER_WEBHOOK`: URL para crear carpeta de facultad
- `N8N_CREATE_CAREER_FOLDER_WEBHOOK`: URL para crear carpeta de carrera
- `N8N_CREATE_COURSE_FOLDER_WEBHOOK`: URL para crear carpeta de curso
- `N8N_CREATE_COMMISSION_FOLDER_WEBHOOK`: URL para crear carpeta de comisión
- `N8N_CREATE_SUBMISSION_FOLDER_WEBHOOK`: URL para crear carpeta de entregas

### 3. Crear Proyecto en Easypanel

1. Accede a tu panel de Easypanel
2. Crea un nuevo proyecto llamado "corrección-automática"
3. Selecciona "Deploy from GitHub" o "Deploy from Docker Compose"
4. Si usas GitHub:
   - Conecta tu repositorio
   - Asegúrate de que la rama principal esté seleccionada
5. Si usas Docker Compose:
   - Copia el contenido de `docker-compose.yml`
   - Pégalo en el editor de Easypanel

### 4. Configurar Dominios y Puertos

En Easypanel:
1. Configura un dominio para tu backend (ej: `api.tu-app.com`)
2. El puerto 5000 del contenedor se mapeará automáticamente
3. Asegúrate de que el backend pueda conectarse a tu servidor MongoDB externo (verifica firewalls, IP whitelist, etc.)

### 5. Desplegar

1. Haz clic en "Deploy"
2. Espera a que el contenedor se construya e inicie
3. Verifica los logs para confirmar que no hay errores de conexión a MongoDB

### 6. Verificar el Despliegue

Accede a los siguientes endpoints para verificar:

```bash
# Health check
curl https://api.tu-app.com/health

# Información de la API
curl https://api.tu-app.com/

# Debe responder con:
{
  "success": true,
  "message": "API de Corrección Automática",
  "version": "2.2.0",
  ...
}
```

### 7. Inicializar Base de Datos (Opcional)

Si necesitas poblar la base de datos con datos iniciales:

```bash
# Conectar al contenedor del backend
docker exec -it correcion-automatica-backend sh

# Ejecutar el script de seed
npm run seed
```

## 🔧 Configuración Avanzada

### Opciones para MongoDB Externo

#### Opción 1: MongoDB Atlas (Recomendado para producción)
1. Crea un cluster gratuito en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Configura el acceso a la red (IP Whitelist)
3. Crea un usuario de base de datos
4. Obtén la cadena de conexión:
   ```
   mongodb+srv://usuario:password@cluster.xxxxx.mongodb.net/correcion-automatica
   ```
5. Configura `MONGODB_URI` en Easypanel con esta URL

#### Opción 2: MongoDB en Easypanel
1. Crea un nuevo servicio MongoDB en Easypanel
2. Anota el nombre del servicio y puerto
3. Usa la URL interna de Docker:
   ```
   mongodb://nombre-servicio-mongo:27017/correcion-automatica
   ```

#### Opción 3: Servidor MongoDB Propio
1. Asegúrate de que el servidor MongoDB sea accesible desde Easypanel
2. Configura autenticación si es necesario
3. Usa la URL completa:
   ```
   mongodb://usuario:password@ip-o-dominio:27017/correcion-automatica
   ```

### Habilitar HTTPS

Easypanel maneja automáticamente SSL/TLS con Let's Encrypt:
1. Configura tu dominio en Easypanel
2. Habilita SSL automático
3. El certificado se renovará automáticamente

### Escalar la Aplicación

Para escalar el backend horizontalmente:
1. En Easypanel, aumenta el número de réplicas del servicio `backend`
2. Asegúrate de que MongoDB pueda manejar múltiples conexiones
3. Considera usar MongoDB Atlas para mejor escalabilidad

## 🐛 Solución de Problemas

### El backend no se conecta a MongoDB

1. Verifica que `MONGODB_URI` esté configurado correctamente
2. Verifica los logs del backend:
   ```bash
   docker logs correcion-automatica-backend
   ```
3. Comprueba la conectividad:
   - Si usas MongoDB Atlas, verifica el IP Whitelist
   - Si usas un servidor propio, verifica firewall y puertos
   - Si usas otro servicio en Easypanel, verifica que estén en la misma red
4. Prueba la conexión manualmente desde el contenedor:
   ```bash
   docker exec -it correcion-automatica-backend sh
   # Dentro del contenedor
   node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('OK')).catch(e => console.error(e))"
   ```

### Error de CORS

1. Verifica que `CORS_ORIGIN` esté configurado correctamente
2. Si necesitas permitir múltiples orígenes, modifica el código en `src/app.js`

### Problemas con n8n Webhooks

1. Verifica que las URLs de los webhooks sean accesibles
2. Prueba los webhooks manualmente con curl o Postman
3. Revisa los logs del backend para ver errores de conexión

## 📊 Monitoreo

### Logs en Tiempo Real

```bash
# Ver logs del backend
docker logs -f correcion-automatica-backend
```

Para ver logs de MongoDB, accede a tu servicio MongoDB externo (Atlas dashboard, logs de Easypanel, etc.)

### Health Checks

El backend incluye health checks automáticos:
- Endpoint: `/health`
- Intervalo: cada 30 segundos
- Si falla 3 veces consecutivas, Docker reiniciará el contenedor

## 🔄 Actualización

Para actualizar la aplicación:

1. Haz push de los cambios a tu repositorio
2. En Easypanel, haz clic en "Redeploy"
3. O manualmente:
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

## 🗄️ Backup de MongoDB

El backup depende de dónde esté alojado tu MongoDB:

### MongoDB Atlas
- Los backups automáticos están incluidos en el plan gratuito
- Puedes configurar backups adicionales desde el dashboard
- Restauración con un clic desde la interfaz web

### MongoDB en Easypanel u Otro Servidor
```bash
# Crear backup usando mongodump desde tu máquina local
mongodump --uri="mongodb://usuario:password@host:27017/correcion-automatica" --out ./backup-$(date +%Y%m%d)

# Restaurar desde backup
mongorestore --uri="mongodb://usuario:password@host:27017/correcion-automatica" ./backup-20251106
```

### Alternativa: Backup desde el Backend
```bash
# Conectar al contenedor del backend
docker exec -it correcion-automatica-backend sh

# Instalar mongodump si no está disponible
apk add mongodb-tools

# Crear backup
mongodump --uri="$MONGODB_URI" --out /tmp/backup
```

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs de los contenedores
2. Verifica las variables de entorno
3. Consulta la documentación de Easypanel
4. Abre un issue en el repositorio del proyecto
