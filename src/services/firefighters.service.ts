
import { Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, addDoc, query, where } from 'firebase/firestore';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const firefightersCollection = collection(db, 'firefighters');

export const getFirefighters = async (): Promise<Firefighter[]> => {
    // Simplificado para máxima robustez: obtener todos los documentos.
    const querySnapshot = await getDocs(firefightersCollection);
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
        
        const firefighterWithDefaultStatus = {
            ...firefighter,
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

    // Si el legajo cambia, verificar unicidad.
    if (firefighterData.legajo && firefighterData.legajo !== docSnap.data().legajo) {
        const q = query(firefightersCollection, where("legajo", "==", firefighterData.legajo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            throw new Error(`El nuevo legajo ${firefighterData.legajo} ya está en uso.`);
        }
    }

    await updateDoc(docRef, firefighterData);
};


export const deleteFirefighter = async (id: string): Promise<void> => {
    const docRef = doc(db, 'firefighters', id);
    await deleteDoc(docRef);
};
