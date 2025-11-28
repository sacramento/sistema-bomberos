
'use server';

import { db } from '@/lib/firebase/firestore';
import { Service, Firefighter, Vehicle } from '@/lib/types';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { getVehicles } from './vehicles.service';
import { cache } from 'react';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const servicesCollection = collection(db, 'services');

const getAllFirefightersCached = cache(async () => {
    const firefighters = await getFirefighters();
    return new Map(firefighters.map(f => [f.id, f]));
});

const getAllVehiclesCached = cache(async () => {
    const vehicles = await getVehicles();
    return new Map(vehicles.map(v => [v.id, v]));
});


// Helper to enrich service data
const docToService = async (
    docSnap: any, 
    firefighterMap: Map<string, Firefighter>,
    vehicleMap: Map<string, Vehicle>
): Promise<Service> => {
    const data = docSnap.data();
    
    const getFirefighterObjects = (ids: string[]): Firefighter[] => {
        if (!ids) return [];
        return ids.map(id => firefighterMap.get(id)).filter(f => f !== undefined) as Firefighter[];
    };
    
    const interveningVehicles = (data.interveningVehicles || []).map((iv: any) => ({
        ...iv,
        vehicle: vehicleMap.get(iv.vehicleId)
    }));

    const service: Service = {
        id: docSnap.id,
        ...data,
        command: firefighterMap.get(data.commandId),
        serviceChief: firefighterMap.get(data.serviceChiefId),
        onDutyPersonnel: getFirefighterObjects(data.onDutyIds || []),
        offDutyPersonnel: getFirefighterObjects(data.offDutyIds || []),
        interveningVehicles
    };
    return service;
}


// Function to get all services
export const getServices = async (): Promise<Service[]> => {
    const q = query(servicesCollection, orderBy('date', 'desc'), orderBy('startTime', 'desc'));
    const querySnapshot = await getDocs(q);

    const [firefighterMap, vehicleMap] = await Promise.all([
        getAllFirefightersCached(),
        getAllVehiclesCached()
    ]);
    
    const servicesPromises = querySnapshot.docs.map(doc => docToService(doc, firefighterMap, vehicleMap));
    const services = await Promise.all(servicesPromises);

    return services;
}

export const addService = async (serviceData: Omit<Service, 'id' | 'command' | 'serviceChief' | 'onDutyPersonnel' | 'offDutyPersonnel'>): Promise<string> => {
    
    // The ID is now manually composed and set
    const docRef = doc(db, 'services', serviceData.id);

    const docSnap = await getDoc(docRef);
    if(docSnap.exists()) {
        throw new Error(`Ya existe un servicio con el ID ${serviceData.id}. Por favor, verifique el número de planilla.`);
    }

    await setDoc(docRef, serviceData);
    return docRef.id;
}
