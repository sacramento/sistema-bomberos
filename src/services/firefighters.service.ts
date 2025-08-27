'use client';
import { db } from '@/lib/firebase/firestore';
import { Firefighter } from '@/lib/types';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

const FIREFIGHTERS_COLLECTION = 'firefighters';

export const getFirefighters = async (): Promise<Firefighter[]> => {
    try {
        const firefightersRef = collection(db, FIREFIGHTERS_COLLECTION);
        const querySnapshot = await getDocs(firefightersRef);
        
        const firefighters: Firefighter[] = [];
        querySnapshot.forEach((doc) => {
            firefighters.push({ id: doc.id, ...doc.data() } as Firefighter);
        });
        return firefighters;
    } catch (error) {
        console.error("Error fetching firefighters: ", error);
        // Devuelve un array vacío si la colección no existe o hay un error.
        return [];
    }
};

export const addFirefighter = async (firefighter: Omit<Firefighter, 'id' | 'status'>, id: string): Promise<void> => {
    try {
        // Usa el 'id' (legajo) proporcionado para crear o sobrescribir el documento.
        const firefighterRef = doc(db, FIREFIGHTERS_COLLECTION, id);
        await setDoc(firefighterRef, { ...firefighter, status: 'Active' });
    } catch (error) {
        console.error("Error adding firefighter: ", error);
        throw new Error('No se pudo agregar el bombero.');
    }
};