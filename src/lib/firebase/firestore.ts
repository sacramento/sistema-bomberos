
import { initializeFirebase } from '@/firebase';

/**
 * Inicialización unificada de Firestore.
 * Obtenemos la instancia de forma segura para evitar errores de referencia nula.
 */
const services = initializeFirebase();

export const db = services.firestore;
