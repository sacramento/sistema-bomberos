import { Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

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
    return firefighters;
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
