# ChatFlow — Plataforma de Live Chat

Plataforma de atención al cliente en tiempo real, similar a Tidio. Construida con React + Firebase.

## Funcionalidades

- **Login con Google** — Solo agentes autorizados pueden entrar
- **Conversaciones en tiempo real** — Chat bidireccional con Firestore
- **IP + Geolocalización** — Ciudad, país, ISP de cada visitante automáticamente
- **Estado del agente** — Disponible / En descanso / No disponible
- **Gestión de agentes** — Agregar, quitar, cambiar roles (admin/agente)
- **Constructor de flujos** — Editor visual para automatizar respuestas
- **Widget embebible** — Script para instalar en cualquier sitio web
- **Conversaciones filtradas** — Todos / Abiertos / Míos / Cerrados

---

## Instalación local

```bash
# 1. Clonar el repo
git clone https://github.com/tu-usuario/chatflow.git
cd chatflow

# 2. Instalar dependencias
npm install

# 3. Configurar tu email como owner
# Abrí src/components/Auth/index.jsx y cambiá:
export const OWNER_EMAIL = 'tu@gmail.com'   # ← tu email real

# 4. Levantar en desarrollo
npm run dev
```

---

## Configuración de Firebase

### 1. Authentication
- Firebase Console → Authentication → Sign-in methods → **Google** → Habilitar
- Agregá tu dominio en "Authorized domains"

### 2. Firestore Database
- Firebase Console → Firestore Database → Crear base de datos
- Copiá las reglas de `firestore.rules` en la consola

### 3. (Opcional) Realtime Database
Para presencia en tiempo real (visitantes online):
- Firebase Console → Realtime Database → Crear
- Descomentá la línea `databaseURL` en `src/lib/firebase.js`

---

## Subir a GitHub

```bash
git init
git add .
git commit -m "🚀 initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/chatflow.git
git push -u origin main
```

---

## Deploy con Vercel (gratis)

1. Ir a [vercel.com](https://vercel.com) → Import Git Repository
2. Seleccionar el repo `chatflow`
3. Framework: **Vite** (detectado automáticamente)
4. Deploy → Tu URL estará disponible en segundos

---

## Cómo agregar agentes

1. Entrá como admin a la plataforma
2. Ir a **Agentes** → **Invitar agente**
3. Ingresá el email de Google del agente
4. La próxima vez que ese email ingrese, tendrá acceso

---

## Estructura del proyecto

```
chatflow/
├── src/
│   ├── components/
│   │   ├── Auth/          # Login, access control
│   │   ├── Layout/        # Sidebar, topbar
│   │   ├── Conversations/ # Chat en tiempo real + IP info
│   │   ├── Agents/        # Gestión de agentes
│   │   ├── Flows/         # Constructor visual de flujos
│   │   ├── Widget/        # Config del widget embebible
│   │   ├── Settings/      # Perfil del agente
│   │   ├── AgentStatus.jsx # Online/Break/Offline
│   │   └── Icon.jsx       # Sistema de íconos SVG
│   ├── lib/
│   │   ├── firebase.js    # Config Firebase
│   │   └── geo.js         # IP geolocalización
│   ├── store/             # Estado global (Zustand)
│   ├── App.jsx
│   └── main.jsx
├── firestore.rules        # Reglas de seguridad
├── index.html
├── vite.config.js
└── package.json
```

---

## Widget para tu sitio web

Pegá esto en tu sitio web antes de `</body>`:

```html
<script>
  window.ChatFlowConfig = {
    projectId: "chat-web-4e49d",
    color:     "#6C47FF",
    botName:   "Asistente",
  };
</script>
<script src="https://cdn.chatflow.app/widget.js" async></script>
```

La URL del CDN es de ejemplo — para producción necesitás hostear el widget script en Firebase Hosting o similar.
