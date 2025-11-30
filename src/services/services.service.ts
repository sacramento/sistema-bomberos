
'use server';

import { db } from '@/lib/firebase/firestore';
import { Service } from '@/lib/types';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc } from 'firebase/firestore';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const servicesCollection = collection(db, 'services');

// Simplified service fetcher. It does NOT enrich data anymore.
const docToService = (docSnap: any): Service => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
    } as Service;
};

export const getServices = async (): Promise<Service[]> => {
    const servicesSnapshot = await getDocs(query(servicesCollection, orderBy('date', 'desc'), orderBy('manualId', 'desc')));
    return servicesSnapshot.docs.map(doc => docToService(doc));
}

export const getServiceById = async (id: string): Promise<Service | null> => {
    const docRef = doc(db, 'services', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docToService(docSnap);
    }
    return null;
}

export const addService = async (serviceData: any): Promise<string> => {
    const dataToSave = { ...serviceData };

    // Ensure numeric fields are stored as numbers
    dataToSave.year = Number(dataToSave.year);
    dataToSave.manualId = Number(dataToSave.manualId);

    const docRef = await addDoc(servicesCollection, dataToSave);
    return docRef.id;
}
