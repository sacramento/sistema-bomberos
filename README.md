
# SMA - Sistema de Gestión Operativa Integral (Bomberos)

Esta es una plataforma profesional diseñada para la gestión de Cuerpos de Bomberos, enfocada en la centralización de datos de personal, materiales, flota y asistencia.

## 🚀 GUÍA RÁPIDA: Cómo descargar el código (Paso a Paso)

Si querés llevarte este código a tu computadora o subirlo a tu propio GitHub, seguí estos pasos exactos dentro de la **Terminal** de Firebase Studio (la pestaña de abajo):

### 1. Preparar el código por PRIMERA VEZ
Copiá y pegá estos comandos de a uno:
```bash
git init -b main
git add .
git commit -m "Version Inicial SMA"
```

### 2. Conectar con tu GitHub
1. Entrá a [GitHub.com](https://github.com) y creá un repositorio nuevo (botón "New").
2. Ponéle nombre (ej: `sistema-bomberos`) y dale a "Create repository".
3. GitHub te va a dar una dirección (URL) que termina en `.git`. Copiala.
4. En la terminal de acá abajo, escribí:
```bash
git remote add origin TU_URL_AQUI
git push -u origin main
```

---

### 🔄 Cómo subir cambios NUEVOS (Tu rutina diaria)
Cada vez que hagamos modificaciones y quieras que se guarden en GitHub, hacé esto en la Terminal:

1. **Preparar los cambios:**
   ```bash
   git add .
   ```
2. **Ponerles un nombre (para saber qué cambiaste):**
   ```bash
   git commit -m "Agregue filtros en reportes" 
   ```
   *(Podés escribir lo que quieras entre las comillas)*
3. **Subirlos a la nube:**
   ```bash
   git push
   ```

---

## 📄 Documentación del Sistema
Para entender cómo funciona la gestión, consultá:
- [Guía de Costos y Migración](docs/GUIA_MIGRACION_Y_COSTOS.md): Todo sobre Firebase y cómo mantener la app gratis.
- [Estructura de Categorías](docs/categorias-materiales.md): Cómo se clasifican los equipos.

---
*Desarrollado por OZNOVA Systems para la profesionalización tecnológica de los Cuerpos de Bomberos.*
