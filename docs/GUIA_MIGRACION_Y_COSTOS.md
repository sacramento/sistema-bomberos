
# Guía de Supervivencia: Migración y Costos (SMA)

Este documento es tu hoja de ruta para cuando decidas sacar la app del "taller de pruebas" (Firebase Studio) y llevarla a la "vida real".

## 1. ¿Dónde vive mi app? (Los 3 pilares)

No te confundas con los nombres técnicos. Tu app necesita tres cosas para existir fuera de aquí:

1.  **El Código (GitHub):** Es lo que ya hiciste. Es el "plano" de la app. Si Firebase Studio desaparece, vos descargás tu código de GitHub a tu computadora y listo.
2.  **La Base de Datos (Firebase Console):** Es el servidor donde se guardan los bomberos. Tenés que crear un proyecto en [console.firebase.google.com](https://console.firebase.google.com). Es **GRATIS** (Plan Spark).
3.  **La Inteligencia Artificial (Google AI Studio):** Es de donde sacás la "llave" para que la IA responda. Se obtiene en [aistudio.google.com](https://aistudio.google.com). Es **GRATIS**.

---

## 2. Pasos para la Migración Final (Cuando cierren este estudio)

Cuando Firebase Studio ya no esté disponible, tu rutina será esta:

1.  **En tu PC:** Descargás un programa llamado "Visual Studio Code" (es el estándar mundial y es gratis).
2.  **Desde GitHub:** Descargás tu código (haciendo un "Clone").
3.  **Configuración:** Entrás al archivo `src/firebase/config.ts` y pegás los códigos de tu nuevo proyecto de Firebase.
4.  **Despliegue:** Usás un comando (`firebase deploy`) y tu app ya estará en internet con una dirección propia (ej: `bomberos-tu-cuartel.web.app`).

---

## 3. Costos (Plan Spark - 100% Gratis)

Mientras seas un cuartel con un uso normal, **no vas a pagar nada**. Google te regala:
*   50,000 lecturas diarias de base de datos.
*   20,000 escrituras diarias.
*   50,000 usuarios activos.

**Consejo de Oro:** Nunca borres tu cuenta de GitHub. Ese es tu seguro de vida. Mientras el código esté ahí, la app nunca se pierde.

---
*Desarrollado por OZNOVA Systems para la profesionalización tecnológica de los Cuerpos de Bomberos.*
