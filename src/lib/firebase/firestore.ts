
import { initializeFirebase } from '@/firebase';

/**
 * Inicialización unificada de Firestore para toda la aplicación.
 */
const { firestore } = initializeFirebase();

export const db = firestore;
