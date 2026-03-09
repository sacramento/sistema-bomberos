import { initializeFirebase } from '@/firebase';

/**
 * Inicialización unificada de Firestore para toda la aplicación.
 * Funciona tanto en entorno de servidor como de cliente.
 */
const sdks = initializeFirebase();

export const db = sdks.firestore;
