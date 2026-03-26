
# Guía de Costos y Migración - Plataforma SMA

Este documento explica cómo funciona el modelo de costos de los servicios utilizados en esta aplicación y los pasos para llevar la app a producción.

## 1. Costos de los Servicios

La aplicación SMA está construida sobre tecnologías que ofrecen capas gratuitas muy amplias, ideales para instituciones como Cuerpos de Bomberos.

### Firebase (Base de Datos, Autenticación y Hosting)
Firebase ofrece el **Plan Spark**, que es 100% gratuito.
- **Autenticación:** Gratis para los primeros 50,000 usuarios activos mensuales.
- **Firestore (Datos):** Gratis hasta 50,000 lecturas y 20,000 escrituras **por día**. Un cuartel con 100 integrantes difícilmente alcance este límite en uso normal.
- **Hosting:** Gratis hasta 10GB de almacenamiento de archivos.

### Google AI Studio (Inteligencia Artificial - Gemini)
El "cerebro" de la app utiliza la API de Gemini.
- **Plan Gratuito:** Disponible para desarrollo y uso moderado. Permite hasta 15 consultas por minuto (RPM) en el modelo Flash 2.0 sin costo.
- **Privacidad:** En el plan gratuito, Google podría usar los datos para mejorar sus modelos (anonimizados). Si la privacidad es crítica, se recomienda pasar al plan pago (que solo cobra centavos por cada millón de palabras).

---

## 2. Pasos para la Migración Final

Cuando decidas que la app está lista para ser usada oficialmente por el cuartel, deberás:

1. **Crear una Cuenta Institucional:** Se recomienda crear un correo de Google del cuartel (ej: `sistemas@bomberosx.com.ar`).
2. **Descargar el Código:** Utiliza los comandos Git detallados en el `README.md` de la raíz.
3. **Crear un Proyecto en Firebase Console:** Entra a [console.firebase.google.com](https://console.firebase.google.com) y crea un nuevo proyecto.
4. **Configurar las Credenciales:** Reemplaza el archivo `src/firebase/config.ts` con los valores de tu nuevo proyecto.
5. **Desplegar (Deploy):** Usa Firebase CLI para subir la app a la web.

---

## 3. ¿Tengo que pagar ahora?
**No.** Todo el desarrollo que estamos haciendo en este entorno está cubierto. Solo deberás considerar costos si la app crece a niveles de tráfico masivos, lo cual no es común en un entorno institucional cerrado.

*Desarrollado por OZNOVA Systems para la profesionalización bomberil.*
