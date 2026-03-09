import { initializeFirebase } from '@/firebase';

/**
 * Inicialización unificada de Firestore para toda la aplicación.
 * Proporciona una instancia única y estable de la base de datos.
 */
const services = initializeFirebase();
export const db = services.firestore;
