
import { Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, addDoc, query, where, orderBy } from 'firebase/firestore';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const firefightersCollection = collection(db, 'firefighters');

export const getFirefighters = async (): Promise<Firefighter[]> => {
    const q = query(firefightersCollection, orderBy('legajo', 'asc'));
    const querySnapshot = await getDocs(q);
    const firefighters: Firefighter[] = [];
    querySnapshot.forEach((doc) => {
        firefighters.push({ id: doc.id, ...doc.data() } as Firefighter);
    });
    return firefighters;
};


export const addFirefighter = async (firefighterData: Omit<Firefighter, 'id' | 'status'>): Promise<string> => {
    const q = query(firefightersCollection, where("legajo", "==", firefighterData.legajo));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        throw new Error(`El bombero con el legajo ${firefighterData.legajo} ya existe.`);
    }
    
    // Ensure status is always set to 'Active' on creation and legajo is included
    const newFirefighter: Omit<Firefighter, 'id'> = { 
        ...firefighterData, 
        legajo: firefighterData.legajo, // Ensure legajo is explicitly part of the object
        status: 'Active'
    };

    const docRef = await addDoc(firefightersCollection, newFirefighter);
    return docRef.id;
};


export const batchAddFirefighters = async (firefighters: Omit<Firefighter, 'id'>[]): Promise<void> => {
    if (!firefighters || firefighters.length === 0) {
        return;
    }

    const batch = writeBatch(db);

    for (const firefighter of firefighters) {
        const docRef = doc(collection(db, 'firefighters')); 
        
        // Ensure status is valid and all fields are present
        const firefighterWithDefaultStatus = {
            ...firefighter,
            legajo: firefighter.legajo,
            firstName: firefighter.firstName,
            lastName: firefighter.lastName,
            rank: firefighter.rank,
            firehouse: firefighter.firehouse,
            status: firefighter.status === 'Active' || firefighter.status === 'Inactive' ? firefighter.status : 'Active'
        };

        batch.set(docRef, firefighterWithDefaultStatus);
    }

    await batch.commit();
};

export const updateFirefighter = async (id: string, firefighterData: Partial<Omit<Firefighter, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'firefighters', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        throw new Error(`No se encontró al bombero.`);
    }

    // If legajo is being changed, check for uniqueness (only for aspirantes, handled in component)
    if (firefighterData.legajo && firefighterData.legajo !== docSnap.data().legajo) {
        const q = query(firefightersCollection, where("legajo", "==", firefighterData.legajo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            // Find if the existing doc is the same we are editing, in case of race conditions or complex UI states.
            const existingDoc = querySnapshot.docs[0];
            if (existingDoc.id !== id) {
                 throw new Error(`El nuevo legajo ${firefighterData.legajo} ya está en uso.`);
            }
        }
    }

    await updateDoc(docRef, firefighterData);
};


export const deleteFirefighter = async (id: string): Promise<void> => {
    const docRef = doc(db, 'firefighters', id);
    await deleteDoc(docRef);
};
