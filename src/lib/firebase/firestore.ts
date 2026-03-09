
import { initializeFirebase } from '@/firebase';

/**
 * Inicialización unificada de Firestore para toda la aplicación.
 * Utiliza el singleton de la plataforma para asegurar consistencia entre cliente y servidor.
 */
const { firestore } = initializeFirebase();

export const db = firestore;
