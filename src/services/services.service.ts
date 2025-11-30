
'use server';

import { db } from '@/lib/firebase/firestore';
import { Service, Firefighter, Vehicle } from '@/lib/types';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc } from 'firebase/firestore';
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

        const allFirefighters = await getFirefighters();
        const allVehicles = await getVehicles();
        const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
        const vehicleMap = new Map(allVehicles.map(v => [v.id, v]));

        const enrichedService: Service = {
            ...serviceData,
            command: serviceData.commandId ? firefighterMap.get(serviceData.commandId) : undefined,
            serviceChief: serviceData.serviceChiefId ? firefighterMap.get(serviceData.serviceChiefId) : undefined,
            onDutyPersonnel: (serviceData.onDutyIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[],
            offDutyPersonnel: (serviceData.offDutyIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[],
        };

        return enrichedService;
    }
    return null;
}

export const addService = async (serviceData: any): Promise<string> => {
    const dataToSave = { ...serviceData };
    dataToSave.year = Number(dataToSave.year);
    dataToSave.manualId = Number(dataToSave.manualId);

    const docRef = await addDoc(servicesCollection, dataToSave);
    return docRef.id;
}
