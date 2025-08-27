'use client';
import { db } from '@/lib/firebase/firestore';
import { Firefighter } from '@/lib/types';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

const FIREFIGHTERS_COLLECTION = 'firefighters';

export const getFirefighters = async (): Promise<Firefighter[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, FIREFIGHTERS_COLLECTION));
        const firefighters: Firefighter[] = [];
        querySnapshot.forEach((doc) => {
            firefighters.push({ id: doc.id, ...doc.data() } as Firefighter);
        });
        return firefighters;
    } catch (error) {
        console.error("Error fetching firefighters: ", error);
        return [];
    }
};

export const addFirefighter = async (firefighter: Omit<Firefighter, 'id' | 'status'>, id: string): Promise<void> => {
    try {
        const firefighterRef = doc(db, FIREFIGHTERS_COLLECTION, id);
        await setDoc(firefighterRef, { ...firefighter, status: 'Active' });
    } catch (error) {
        console.error("Error adding firefighter: ", error);
        throw new Error('No se pudo agregar el bombero.');
    }
};

// Bonus: A function to seed initial data if the collection is empty.
export const seedFirefighters = async (initialFirefighters: Firefighter[]) => {
    const firefightersCollection = collection(db, FIREFIGHTERS_COLLECTION);
    const snapshot = await getDocs(firefightersCollection);
    if (snapshot.empty) {
        console.log('No firefighters found, seeding initial data...');
        const promises = initialFirefighters.map(f => {
            const { id, ...data } = f;
            return setDoc(doc(db, FIREFIGHTERS_COLlection, id), data);
        });
        await Promise.all(promises);
        console.log('Initial firefighter data seeded.');
    }
};
