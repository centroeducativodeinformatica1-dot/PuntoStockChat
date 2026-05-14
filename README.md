# 🟢 PuntoStock — Sistema POS/SaaS

> Control Simple. Negocios en Orden.

Sistema de gestión de stock y ventas multi-negocio, con aislamiento completo de datos por negocio, diseñado para emprendedores.

---

## 📁 Estructura del proyecto

```
puntostock/
├── index.html              ← App principal
├── firestore.rules         ← Reglas de seguridad Firebase
├── css/
│   └── styles.css          ← Design system completo
└── js/
    ├── firebase-config.js  ← Configuración Firebase (EDITAR)
    ├── app.js              ← Core: estado, navegación, helpers
    ├── auth.js             ← Login, registro, logout
    ├── dashboard.js        ← Métricas y resumen
    ├── ventas.js           ← POS con escáner
    ├── stock.js            ← CRUD de productos
    └── modules.js          ← Historial, Clientes, Proveedores, Caja, Admin, Config
```

---

## 🚀 Setup en 5 pasos

### 1. Crear proyecto Firebase

1. Ir a [console.firebase.google.com](https://console.firebase.google.com)
2. Crear nuevo proyecto → dale un nombre (ej: `puntostock-prod`)
3. Activar **Authentication** → Métodos de inicio → Email/Contraseña ✅
4. Activar **Firestore Database** → Crear en modo de producción

### 2. Configurar credenciales

Editar `js/firebase-config.js` con los datos de tu proyecto:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

> Los encontrás en Firebase Console → Configuración del proyecto → Tu app → SDK

### 3. Aplicar reglas de seguridad

En Firebase Console → Firestore → Pestaña **Reglas**:

Copiar y pegar el contenido de `firestore.rules` → Publicar.

### 4. Crear el primer admin

Registrate normalmente en la app. Luego en Firebase Console → Firestore → Collection `users` → tu documento → editá el campo `role` a `admin`.

```
users/
  {tu-uid}/
    role: "admin"   ← cambiar de "owner" a "admin"
    businessId: {tu-uid}
    ...
```

### 5. Deploy

**Opción A — Firebase Hosting (recomendado):**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting  # public: . (raíz), SPA: sí
firebase deploy
```

**Opción B — Cualquier hosting estático:**
Subir todos los archivos tal como están a Netlify, Vercel, o tu hosting.

---

## 🔧 Módulos incluidos

| Módulo | Descripción |
|--------|-------------|
| 🔐 **Auth** | Login/registro por negocio, recuperación de contraseña |
| 📊 **Dashboard** | Ventas del día, semana, stock bajo, top productos |
| 🛒 **Ventas (POS)** | Escáner de código de barras, carrito, múltiples medios de pago |
| 📦 **Stock** | CRUD productos, ajuste de stock, alertas de stock bajo |
| 📋 **Historial** | Ventas con filtros por fecha y método de pago |
| 💰 **Cierre de caja** | Desglose por método, diferencia de efectivo |
| 👥 **Clientes** | CRUD con cuenta corriente |
| 🏭 **Proveedores** | CRUD de proveedores |
| ⚙️ **Admin** | Activar/desactivar negocios, cambiar planes |
| ⚙️ **Config** | Editar datos del negocio |

---

## 📊 Estructura de datos en Firestore

```
businesses/
  {businessId}/
    name, email, phone, active, plan, createdAt
    /productos/{id}     → nombre, precio, stock, categoria, codigo...
    /ventas/{id}        → items[], total, metodoPago, fecha
    /clientes/{id}      → nombre, email, telefono, saldoCC
    /proveedores/{id}   → nombre, empresa, contacto...
    /movimientos/{id}   → ajustes de stock
    /cierres/{id}       → cierres de caja diarios

users/
  {uid}/
    businessId, name, email, role (owner | admin)
```

---

## 🔑 Aislamiento de datos

Cada negocio tiene su propio `businessId` (igual al UID del owner). 
Todas las consultas son `businesses/{businessId}/colección` — los datos de un negocio **nunca se mezclan** con los de otro.

Las reglas de Firestore validan server-side que cada usuario solo acceda a su `businessId`.

---

## 🖨️ Integración con escáner de código de barras

Los escáneres USB/Bluetooth se comportan como teclado. La app detecta automáticamente cuando se escanea un código (muchos caracteres en < 300ms + Enter) y lo busca en el campo `codigo` o `codigoBarra` del producto.

No necesitás ningún driver ni configuración especial.

---

## 🎨 Paleta de colores

| Variable | Valor | Uso |
|----------|-------|-----|
| `--bg-primary` | `#0D1117` | Fondo principal |
| `--bg-secondary` | `#161B22` | Sidebar, topbar |
| `--green-primary` | `#7ED321` | Acento principal |
| `--text-primary` | `#F0F6FC` | Texto principal |
| `--red` | `#F85149` | Errores, alertas |

---

## 📱 Responsive

Funciona en desktop y mobile. En pantallas < 900px el sidebar se oculta y aparece el botón hamburguesa.

---

## 🛡️ Seguridad

- Cada negocio aislado por `businessId` en Firestore
- Reglas server-side validan cada request
- Negocios inactivos no pueden iniciar sesión
- Admin puede activar/desactivar cuentas manualmente desde el panel

---

*PuntoStock © 2025 — Hecho con ❤️ para emprendedores*
