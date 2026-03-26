
# Guía de Costos y Migración - Plataforma SMA

Este documento explica cómo funciona el modelo de costos de los servicios utilizados en esta aplicación y los pasos para llevar la app a producción de forma gratuita o económica.

## 1. Costos de los Servicios (Plan Spark)

La aplicación SMA está construida sobre tecnologías que ofrecen capas gratuitas muy amplias, ideales para instituciones como Cuerpos de Bomberos.

### Firebase (Base de Datos, Autenticación y Hosting)
Firebase utiliza el **Plan Spark**, que es 100% gratuito mientras no se excedan estos límites:

*   **Firestore (Base de Datos):**
    *   **Lecturas:** 50,000 por día (Gratis).
    *   **Escrituras:** 20,000 por día (Gratis).
    *   **Eliminaciones:** 20,000 por día (Gratis).
    *   **Almacenamiento:** 1 GB total.
*   **Autenticación:** Gratis para los primeros 50,000 usuarios activos mensuales.
*   **Hosting (Web):** 10 GB de almacenamiento y 360 MB de transferencia diaria.

> **Nota:** Un cuartel con 100 integrantes que cargan servicios y toman asistencia difícilmente consumirá más de 2,000 o 3,000 lecturas diarias. Estás muy lejos del límite.

### Google AI Studio (IA - Gemini)
*   **Plan Gratuito:** Disponible para uso moderado. Permite hasta 15 consultas por minuto sin costo.
*   **Privacidad:** En el plan gratuito, los datos (anonimizados) podrían usarse para mejorar los modelos. Para máxima privacidad institucional, se puede pasar al plan pago que cobra centavos por millón de tokens.

---

## 2. Consejos para mantener la App Gratis

1.  **Monitoreo:** Una vez migrada la app, en la [Consola de Firebase](https://console.firebase.google.com/), sección "Usage & Billing", podés ver exactamente cuántas lecturas y escrituras llevás en el día.
2.  **Imágenes:** Si vas a subir fotos de vehículos o perfiles, tratá de que no sean archivos de 10MB. La app está configurada para manejar placeholders, pero si habilitás subida de archivos, el almacenamiento de 5GB (Storage) es tu límite.
3.  **Usuarios:** No borres y crees usuarios todo el tiempo; mantené la base de datos limpia.

---

## 3. Pasos para la Migración Final

Cuando decidas que la app está lista para el uso oficial:

1.  **Cuenta Institucional:** Creá un correo de Google del cuartel (ej: `informatica@bomberosx.com.ar`).
2.  **Proyecto Firebase:** Entra a la consola y creá un nuevo proyecto llamado "SMA-Cuartel-X".
3.  **Configuración:** Descargá tu código desde aquí (vía Git) y actualizá el archivo `src/firebase/config.ts` con las credenciales de tu nuevo proyecto.
4.  **Despliegue:** Usá el comando `firebase deploy` para que la app sea accesible desde una dirección `.web.app` o tu propio dominio.

---

*Desarrollado por OZNOVA Systems para la profesionalización tecnológica de los Cuerpos de Bomberos.*
