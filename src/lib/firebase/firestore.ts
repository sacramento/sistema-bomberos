'use client';
import { initializeFirebase } from '@/firebase';

/**
 * Inicialización unificada de Firestore para toda la aplicación.
 * Marcado como 'use client' para soportar el flujo de errores contextuales.
 */
const services = initializeFirebase();
export const db = services.firestore;
