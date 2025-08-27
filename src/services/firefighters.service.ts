'use client';
import { db } from '@/lib/firebase/firestore';
import { Firefighter } from '@/lib/types';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

const FIREFIGHTERS_COLLECTION = 'firefighters';

// Seed data - only for initial setup
const initialFirefighters: Firefighter[] = [
  { id: 'FG-001', name: 'Juan Pérez', rank: 'COMANDANTE', firehouse: 'Cuartel 1', status: 'Active' },
  { id: 'FG-002', name: 'Ana Gómez', rank: 'OFICIAL PRINCIPAL', firehouse: 'Cuartel 1', status: 'Active' },
  { id: 'FG-003', name: 'Carlos Sánchez', rank: 'BOMBERO', firehouse: 'Cuartel 2', status: 'Active' },
  { id: 'FG-004', name: 'Laura Fernández', rank: 'BOMBERO', firehouse: 'Cuartel 2', status: 'Inactive' },
  { id: 'FG-005', name: 'Miguel Torres', rank: 'COMANDANTE MAYOR', firehouse: 'Cuartel 1', status: 'Active' },
  { id: 'FG-006', name: 'Patricia Ramírez', rank: 'CABO', firehouse: 'Cuartel 3', status: 'Active' },
  { id: 'FG-007', name: 'Roberto Díaz', rank: 'SARGENTO', firehouse: 'Cuartel 3', status: 'Active' },
];

/**
 * Ensures the firefighters collection is seeded with initial data if it's empty.
 */
const seedFirefighters = async () => {
    try {
        console.log('Seeding initial firefighter data...');
        for (const firefighter of initialFirefighters) {
            const { id, ...data } = firefighter;
            await setDoc(doc(db, FIREFIGHTERS_COLLECTION, id), data);
        }
        console.log('Initial firefighter data seeded successfully.');
    } catch (error) {
        console.error("Error seeding firefighters: ", error);
        throw new Error('Failed to seed firefighters.');
    }
};

export const getFirefighters = async (): Promise<Firefighter[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, FIREFIGHTERS_COLLECTION));
        
        if (querySnapshot.empty) {
            await seedFirefighters();
            const seededSnapshot = await getDocs(collection(db, FIREFIGHTERS_COLLECTION));
            const firefighters: Firefighter[] = [];
            seededSnapshot.forEach((doc) => {
                firefighters.push({ id: doc.id, ...doc.data() } as Firefighter);
            });
            return firefighters;
        }

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
