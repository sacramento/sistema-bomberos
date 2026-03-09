'use server';

import { Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, addDoc, query, where } from 'firebase/firestore';
import { logAction } from './audit.service';

export const getFirefighters = async (): Promise<Firefighter[]> => {
    if (!db) return [];
    const querySnapshot = await getDocs(collection(db, 'firefighters'));
    const firefighters: Firefighter[] = [];
    querySnapshot.forEach((doc) => {
        firefighters.push({ id: doc.id, ...doc.data() } as Firefighter);
    });
    return firefighters;
};

export const addFirefighter = async (firefighterData: Omit<Firefighter, 'id'>, actor: LoggedInUser): Promise<string> => {
    if (!db) throw new Error("DB not initialized");
    const firefightersCollection = collection(db, 'firefighters');
    
    const q = query(firefightersCollection, where("legajo", "==", firefighterData.legajo));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        throw new Error(`El bombero con el legajo ${firefighterData.legajo} ya existe.`);
    }
    
    const newFirefighter: Omit<Firefighter, 'id'> = { 
        ...firefighterData,
        status: firefighterData.status || 'Active'
    };

    const docRef = await addDoc(firefightersCollection, newFirefighter);
    await logAction(actor, 'CREATE_FIREFIGHTER', { entity: 'firefighter', id: docRef.id }, newFirefighter);
    return docRef.id;
};

export const batchAddFirefighters = async (firefighters: Omit<Firefighter, 'id'>[], actor: LoggedInUser): Promise<void> => {
    if (!db || !firefighters || firefighters.length === 0) return;
    const batch = writeBatch(db);
    const firefightersCollection = collection(db, 'firefighters');
    for (const firefighter of firefighters) {
        const docRef = doc(firefightersCollection); 
        batch.set(docRef, {
            ...firefighter,
            status: firefighter.status === 'Active' || firefighter.status === 'Inactive' ? firefighter.status : 'Active'
        });
    }
    await batch.commit();
    await logAction(actor, 'BATCH_IMPORT_FIREFIGHTERS', { entity: 'firefighter', id: 'batch' }, { count: firefighters.length });
};

export const updateFirefighter = async (id: string, firefighterData: Partial<Omit<Firefighter, 'id'>>, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'firefighters', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error(`No se encontró al bombero.`);

    if (firefighterData.legajo && firefighterData.legajo !== docSnap.data().legajo) {
        const firefightersCollection = collection(db, 'firefighters');
        const q = query(firefightersCollection, where("legajo", "==", firefighterData.legajo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            throw new Error(`El nuevo legajo ${firefighterData.legajo} ya está en uso.`);
        }
    }

    await updateDoc(docRef, firefighterData);
    await logAction(actor, 'UPDATE_FIREFIGHTER', { entity: 'firefighter', id }, firefighterData);
};

export const deleteFirefighter = async (id: string, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'firefighters', id);
    const docSnap = await getDoc(docRef);
    const details = docSnap.exists() ? { firstName: docSnap.data().firstName, lastName: docSnap.data().lastName } : {};
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_FIREFIGHTER', { entity: 'firefighter', id }, details);
};
