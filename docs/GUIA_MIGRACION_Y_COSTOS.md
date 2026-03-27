
# Guía de Supervivencia: Migración y Costos (SMA)

Este documento es tu hoja de ruta para cuando decidas sacar la app del "taller de pruebas" (Firebase Studio) y llevarla a la "vida real".

## 1. ¿Dónde vive mi app? (Los 3 pilares)

1.  **El Código (GitHub):** Es el plano de la app. Está seguro en tu cuenta.
2.  **La Base de Datos (Firebase Console):** Es el servidor oficial. Aquí se guardan los datos.
3.  **La Inteligencia Artificial (Google AI Studio):** De aquí sacás la "llave" para que la IA responda.

---

## 2. Seguridad: Variables de Entorno

Para evitar que Google te envíe alertas de seguridad, hemos "escondido" las llaves del proyecto.
*   Tus llaves ahora viven en el archivo `.env.local`.
*   El archivo `.gitignore` le prohíbe a GitHub subir esas llaves.
*   **Importante:** Cuando instales la app en un servidor real (como Vercel o Firebase Hosting), deberás cargar estas mismas llaves en la sección "Environment Variables" de ese servidor.

---

## 3. Costos (Plan Spark - 100% Gratis)

Mientras seas un cuartel con un uso normal, **no vas a pagar nada**. Google regala:
*   50,000 lecturas diarias de base de datos.
*   20,000 escrituras diarias.
*   50,000 usuarios activos.

**Consejo de Oro:** Nunca borres tu cuenta de GitHub. Es tu seguro de vida. Si el código está ahí, la app nunca se pierde.

---
*Desarrollado por OZNOVA Systems para la profesionalización tecnológica de los Cuerpos de Bomberos.*
