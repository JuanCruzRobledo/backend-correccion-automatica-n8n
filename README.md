# 🚀 Backend - Sistema de Corrección Automática

Backend API REST para el sistema de corrección automática con gestión completa de universidades, cursos, rúbricas y usuarios.

---

## 📋 Tabla de Contenidos

- [Tecnologías](#-tecnologías)
- [Requisitos](#-requisitos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Migración de Datos](#-migración-de-datos)
- [API Endpoints](#-api-endpoints)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Modelos de Datos](#-modelos-de-datos)

---

## 🛠️ Tecnologías

- **Node.js** - Entorno de ejecución
- **Express 4.18** - Framework web
- **MongoDB + Mongoose** - Base de datos y ODM
- **JWT** - Autenticación con JSON Web Tokens
- **bcrypt** - Hash de contraseñas
- **Multer** - Upload de archivos
- **Axios** - Cliente HTTP para webhooks n8n
- **CORS** - Cross-Origin Resource Sharing

---

## 📦 Requisitos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB** >= 6.0 (local o MongoDB Atlas)

---

## 🔧 Instalación

```bash
# Navegar a la carpeta del backend
cd backend

# Instalar dependencias
npm install
```

---

## ⚙️ Configuración

### 1. Variables de entorno

Crear archivo `.env` en la raíz del backend (copiar desde `.env.example`):

```bash
cp .env.example .env
```

### 2. Editar `.env`

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/correcion-automatica
# Para MongoDB Atlas: mongodb+srv://username:password@cluster.xxxxx.mongodb.net/correcion-automatica

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion
JWT_EXPIRES_IN=7d

# n8n Webhooks
N8N_RUBRIC_WEBHOOK_URL=https://tu-servidor.n8n.example/webhook/rubrica
N8N_GRADING_WEBHOOK_URL=https://tu-servidor.n8n.example/webhook/corregir
N8N_SPREADSHEET_WEBHOOK_URL=https://tu-servidor.n8n.example/webhook/spreadsheet

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### 3. MongoDB

**Opción A: MongoDB Local**
```bash
# Instalar MongoDB Community Edition
# https://www.mongodb.com/try/download/community

# Iniciar MongoDB
mongod
```

**Opción B: MongoDB Atlas (Cloud)**
1. Crear cuenta en https://www.mongodb.com/cloud/atlas
2. Crear cluster gratuito
3. Obtener connection string
4. Actualizar `MONGODB_URI` en `.env`

---

## 🚀 Ejecución

### Desarrollo

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:5000` con auto-reload (nodemon).

### Producción

```bash
npm start
```

---

## 🌱 Migración de Datos

El script de migración crea:
- 4 universidades (UTN-FRM, UTN-FRSN, UTN-FRA, UTN-FRBA)
- 17 cursos distribuidos por universidad
- 5 rúbricas preestablecidas
- 2 usuarios (admin + usuario de prueba)

### Ejecutar migración

```bash
npm run seed
```

### Salida esperada

```
🌱 Iniciando migración de datos...

🗑️  Limpiando colecciones existentes...
✅ Colecciones limpiadas

🏫 Migrando universidades...
✅ 4 universidades creadas

📚 Migrando cursos...
✅ 17 cursos creados

📋 Migrando rúbricas...
✅ 5 rúbricas creadas

👤 Creando usuario administrador...
✅ Usuario admin creado (username: admin, password: admin123)

👤 Creando usuario de prueba...
✅ Usuario de prueba creado (username: usuario, password: usuario123)

============================================================
✅ Migración completada exitosamente!
============================================================
📊 Resumen:
   - Universidades: 4
   - Cursos: 17
   - Rúbricas: 5
   - Usuarios: 2 (admin + usuario)
============================================================

🔐 Credenciales de acceso:
   Admin:   username: admin    | password: admin123
   Usuario: username: usuario  | password: usuario123
============================================================
```

---

## 📡 API Endpoints

### Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login de usuario | No |
| POST | `/api/auth/register` | Registrar usuario (DESACTIVADO desde frontend) | Admin |
| POST | `/api/auth/change-password` | Cambiar contraseña (obligatorio en primer login) | Sí |
| GET | `/api/auth/verify` | Verificar token | Sí |

#### Ejemplo Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "username": "admin",
    "role": "admin"
  }
}
```

---

### Universidades

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/universities` | Listar universidades | No |
| GET | `/api/universities/:id` | Obtener una universidad | No |
| POST | `/api/universities` | Crear universidad | Admin |
| PUT | `/api/universities/:id` | Actualizar universidad | Admin |
| DELETE | `/api/universities/:id` | Eliminar (baja lógica) | Admin |

#### Ejemplo Crear Universidad

```bash
curl -X POST http://localhost:5000/api/universities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "university_id": "utn-frc",
    "name": "UTN - Facultad Regional Córdoba"
  }'
```

---

### Cursos

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/courses` | Listar cursos | No |
| GET | `/api/courses?university_id=xxx` | Filtrar por universidad | No |
| GET | `/api/courses/:id` | Obtener un curso | No |
| POST | `/api/courses` | Crear curso | Admin |
| PUT | `/api/courses/:id` | Actualizar curso | Admin |
| DELETE | `/api/courses/:id` | Eliminar (baja lógica) | Admin |

#### Ejemplo Crear Curso

```bash
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "course_id": "algoritmos-1",
    "name": "Algoritmos y Estructuras de Datos 1",
    "university_id": "utn-frm"
  }'
```

---

### Rúbricas

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/rubrics` | Listar rúbricas | No |
| GET | `/api/rubrics?university_id=xxx&course_id=yyy` | Filtrar rúbricas | No |
| GET | `/api/rubrics/:id` | Obtener una rúbrica | No |
| POST | `/api/rubrics` | Crear desde JSON | Admin |
| POST | `/api/rubrics/from-pdf` | Crear desde PDF (n8n) | Admin |
| PUT | `/api/rubrics/:id` | Actualizar rúbrica | Admin |
| DELETE | `/api/rubrics/:id` | Eliminar (baja lógica) | Admin |

#### Ejemplo Crear Rúbrica desde JSON

```bash
curl -X POST http://localhost:5000/api/rubrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "TP Funciones",
    "university_id": "utn-frm",
    "course_id": "programacion-1",
    "rubric_json": {
      "rubric_id": "tp-funciones",
      "title": "Trabajo Práctico: Funciones",
      "criteria": [...]
    }
  }'
```

#### Ejemplo Crear Rúbrica desde PDF

```bash
curl -X POST http://localhost:5000/api/rubrics/from-pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=TP Arrays" \
  -F "university_id=utn-frm" \
  -F "course_id=programacion-2" \
  -F "pdf_file=@/path/to/rubric.pdf"
```

---

### Usuarios

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | Listar usuarios activos | Admin |
| GET | `/api/users?includeDeleted=true` | Listar todos (incluye eliminados) | Admin |
| GET | `/api/users/:id` | Obtener un usuario | Admin |
| POST | `/api/users` | Crear usuario | Admin |
| PUT | `/api/users/:id` | Actualizar usuario | Admin |
| DELETE | `/api/users/:id` | Eliminar (soft delete) | Admin |
| PUT | `/api/users/:id/restore` | Restaurar usuario eliminado | Admin |

#### Ejemplo Crear Usuario

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "username": "profesor1",
    "password": "password123",
    "role": "user"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "_id": "...",
    "username": "profesor1",
    "role": "user",
    "deleted": false,
    "createdAt": "2025-10-22T..."
  }
}
```

#### Ejemplo Eliminar Usuario (Soft Delete)

```bash
curl -X DELETE http://localhost:5000/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Nota:** El usuario se marca como `deleted: true` pero no se elimina físicamente.

#### Ejemplo Restaurar Usuario

```bash
curl -X PUT http://localhost:5000/api/users/USER_ID/restore \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Validaciones de Usuarios

- ✅ Username único (mínimo 3 caracteres, solo minúsculas, números, guiones)
- ✅ Password mínimo 6 caracteres (se hashea con bcrypt)
- ✅ Roles disponibles: `admin` o `user`
- ✅ Usuarios eliminados no pueden hacer login (403 Forbidden)
- ✅ No se puede reutilizar username de cuentas eliminadas
- ✅ Usuario `admin` principal protegido (no se puede eliminar ni cambiar rol)

---

### Health Check

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Estado del servidor | No |

```bash
curl http://localhost:5000/health
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Backend de corrección automática funcionando correctamente",
  "timestamp": "2025-10-22T..."
}
```

---

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Configuración MongoDB
│   ├── models/
│   │   ├── University.js        # Modelo Universidad
│   │   ├── Course.js            # Modelo Curso
│   │   ├── Rubric.js            # Modelo Rúbrica
│   │   └── User.js              # Modelo Usuario (con soft delete)
│   ├── controllers/
│   │   ├── authController.js    # Login, register, verify
│   │   ├── universityController.js
│   │   ├── courseController.js
│   │   ├── rubricController.js
│   │   └── userController.js    # CRUD usuarios (NUEVO)
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── universityRoutes.js
│   │   ├── courseRoutes.js
│   │   ├── rubricRoutes.js
│   │   └── userRoutes.js        # Rutas usuarios (NUEVO)
│   ├── middleware/
│   │   └── auth.js              # JWT verification + role check
│   ├── services/
│   │   └── n8nService.js        # Llamadas a webhooks n8n
│   └── app.js                   # Express app principal
├── scripts/
│   ├── seedDatabase.js          # Migración de datos iniciales
│   └── migrateDeletedField.js   # Migrar campo deleted (NUEVO)
├── uploads/
│   └── temp/                    # Archivos temporales (PDFs)
├── .env                         # Variables de entorno (NO SUBIR A GIT)
├── .env.example                 # Template de .env
├── .gitignore
├── package.json
└── README.md
```

---

## 🗄️ Modelos de Datos

### University

```javascript
{
  _id: ObjectId,
  university_id: String (unique),
  name: String,
  deleted: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### Course

```javascript
{
  _id: ObjectId,
  course_id: String (unique),
  name: String,
  university_id: String,
  deleted: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### Rubric

```javascript
{
  _id: ObjectId,
  rubric_id: String (unique, auto-generado),
  name: String,
  university_id: String,
  course_id: String,
  rubric_json: Object,
  source: String (enum: "pdf", "json", "manual"),
  original_file_url: String (opcional),
  deleted: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### User

```javascript
{
  _id: ObjectId,
  username: String (unique, lowercase, min 3 chars),
  password: String (hashed con bcrypt, min 6 chars),
  role: String (enum: "admin", "user"),
  deleted: Boolean (default: false), // Soft delete
  createdAt: Date,
  updatedAt: Date
}
```

**Métodos del modelo:**
- `findActive()` - Retorna usuarios activos (deleted: false o sin campo)
- `softDelete()` - Marca usuario como deleted: true
- `restore()` - Restaura usuario (deleted: false)
- `comparePassword(candidatePassword)` - Verifica contraseña
- `toPublicJSON()` - Retorna datos sin password

---

## 🔐 Autenticación y Autorización

### Middleware de autenticación

- **`authenticate`**: Verifica token JWT en header `Authorization: Bearer <token>`
- **`requireAdmin`**: Verifica que el usuario tenga rol `admin`

### Uso en rutas

```javascript
import { authenticate, requireAdmin } from './middleware/auth.js';

// Ruta protegida (cualquier usuario autenticado)
router.get('/protected', authenticate, controller);

// Ruta solo para admin
router.post('/admin-only', authenticate, requireAdmin, controller);
```

---

## 🧪 Testing con Thunder Client / Postman

### 1. Login

```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Copiar el `token` de la respuesta.

### 2. Crear universidad (protegido)

```
POST http://localhost:5000/api/universities
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE

{
  "university_id": "utn-frc",
  "name": "UTN - Facultad Regional Córdoba"
}
```

---

## 📝 Notas Importantes

### Baja Lógica (Soft Delete)

- **No se eliminan registros de la BD**, solo se marca `deleted: true`
- Los modelos tienen un pre-hook que excluye registros eliminados en consultas
- Para incluir eliminados: `Model.find({ deleted: { $in: [true, false] } })`

### Hash de Contraseñas

- Se usa `bcrypt` con 10 salt rounds
- El hash se realiza automáticamente en el hook `pre-save` del modelo User
- Las contraseñas **nunca** se devuelven en las respuestas (field `select: false`)

### Generación de rubric_id

- El `rubric_id` se genera automáticamente:
  ```
  {university_id}-{course_id}-{timestamp}-{random}
  ```
- Ejemplo: `utn-frm-programacion-1-1729513200000-a3f9k2`

---

## 🚨 Troubleshooting

### Error: ECONNREFUSED MongoDB

```bash
# Verificar que MongoDB esté corriendo
mongosh

# Si no está corriendo, iniciar MongoDB
mongod
```

### Error: JWT_SECRET is not defined

```bash
# Verificar que existe .env
ls -la .env

# Copiar desde .env.example si no existe
cp .env.example .env

# Editar .env y configurar JWT_SECRET
```

### Error: Cannot find module

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 Soporte

Para problemas o preguntas, consultar:
- Documentación principal: `PROYECTO_PLAN.md` en la raíz del proyecto
- Issues del repositorio

---

**Última actualización**: Noviembre 2025
