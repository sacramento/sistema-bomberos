
'use server';

import { db } from '@/lib/firebase/firestore';
import { Service, Firefighter, Vehicle } from '@/lib/types';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { getVehicles } from './vehicles.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const servicesCollection = collection(db, 'services');

const docToService = (docSnap: any): Service => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
    } as Service;
};

export const getServices = async (): Promise<Service[]> => {
    const servicesSnapshot = await getDocs(query(servicesCollection, orderBy('date', 'desc')));
    return servicesSnapshot.docs.map(doc => docToService(doc));
}

export const getServiceById = async (id: string): Promise<Service | null> => {
    const docRef = doc(db, 'services', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const serviceData = docToService(docSnap);
        return serviceData;
    }
    return null;
}

export const addService = async (serviceData: any): Promise<string> => {
    const dataToSave = { ...serviceData };
    dataToSave.year = Number(dataToSave.year);
    dataToSave.manualId = Number(dataToSave.manualId);
    dataToSave.zone = Number(dataToSave.zone);

    const docRef = await addDoc(servicesCollection, dataToSave);
    return docRef.id;
}

export const updateService = async (id: string, serviceData: Partial<Service>): Promise<void> => {
    const docRef = doc(db, 'services', id);
    // Ensure numeric fields are correctly typed
    const dataToUpdate: any = { ...serviceData };
    if (dataToUpdate.year) dataToUpdate.year = Number(dataToUpdate.year);
    if (dataToUpdate.manualId) dataToUpdate.manualId = Number(dataToUpdate.manualId);
    if (dataToUpdate.zone) dataToUpdate.zone = Number(dataToUpdate.zone);
    
    await updateDoc(docRef, dataToUpdate);
}
