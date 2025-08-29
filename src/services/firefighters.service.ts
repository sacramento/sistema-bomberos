import { Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const firefightersCollection = collection(db, 'firefighters');

export const getFirefighters = async (): Promise<Firefighter[]> => {
    const querySnapshot = await getDocs(firefightersCollection);
    const firefighters: Firefighter[] = [];
    querySnapshot.forEach((doc) => {
        firefighters.push({ id: doc.id, ...doc.data() } as Firefighter);
    });
    // Sort by ID (legajo)
    return firefighters.sort((a, b) => a.id.localeCompare(b.id));
};

export const addFirefighter = async (firefighterData: Omit<Firefighter, 'id' | 'status'>, id: string): Promise<void> => {
    const docRef = doc(db, 'firefighters', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        throw new Error(`El bombero con el legajo ${id} ya existe.`);
    }
    
    const newFirefighter: Omit<Firefighter, 'id'> = { 
        ...firefighterData, 
        status: 'Active' 
    };

    await setDoc(docRef, newFirefighter);
};


export const batchAddFirefighters = async (firefighters: Firefighter[]): Promise<void> => {
    if (!firefighters || firefighters.length === 0) {
        return;
    }

    const batch = writeBatch(db);

    for (const firefighter of firefighters) {
        // We assume the ID is provided in the CSV and is the document ID.
        const docRef = doc(db, 'firefighters', firefighter.id);
        
        // We set status to 'Active' by default for all imported firefighters
        const { id, ...firefighterData } = {
            ...firefighter,
            status: 'Active' as const
        };

        batch.set(docRef, firefighterData, { merge: true }); // Use merge: true to avoid overwriting existing data completely if needed, or create new.
    }

    await batch.commit();
};

export const updateFirefighter = async (id: string, firefighterData: Partial<Omit<Firefighter, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'firefighters', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        throw new Error(`No se encontró al bombero con el legajo ${id}.`);
    }

    await updateDoc(docRef, firefighterData);
};

export const deleteFirefighter = async (id: string): Promise<void> => {
    const docRef = doc(db, 'firefighters', id);
    await deleteDoc(docRef);
};
