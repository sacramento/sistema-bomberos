// 'use client'; - Temporarily disabled to allow local data testing
import { getFirestore } from 'firebase/firestore';
import { app } from './firebase';

// We will only initialize firestore if the app is available
const db = app ? getFirestore(app) : null;

export { db };
