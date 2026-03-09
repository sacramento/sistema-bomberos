import { initializeFirebase } from '@/firebase';

/**
 * Inicialización unificada de Firestore para toda la aplicación.
 * Esto asegura que tanto el cliente como las Server Actions usen la misma instancia.
 */
const services = initializeFirebase();
export const db = services.firestore;
