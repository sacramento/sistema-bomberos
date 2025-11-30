
'use server';

import { db } from '@/lib/firebase/firestore';
import { Service, Firefighter } from '@/lib/types';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { cache } from 'react';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const servicesCollection = collection(db, 'services');

const getAllFirefightersCached = cache(async () => {
    const firefighters = await getFirefighters();
    return new Map(firefighters.map(f => [f.id, f]));
});

/**
 * Converts a Firestore document into a Service object with basic enrichment.
 * @param docSnap The Firestore document snapshot of the service.
 * @param firefighterMap A map of firefighter IDs to Firefighter objects.
 * @returns A promise that resolves to the enriched Service object.
 */
const docToService = async (
    docSnap: any, 
    firefighterMap: Map<string, Firefighter>
): Promise<Service> => {
    const data = docSnap.data();
    
    const getFirefighterObjects = (ids: string[] | undefined): Firefighter[] => {
        if (!ids || !Array.isArray(ids)) return [];
        return ids.map(id => firefighterMap.get(id)).filter(f => f !== undefined) as Firefighter[];
    };
    
    const onDutyIds = data.onDutyIds || [];
    const offDutyIds = data.offDutyIds || [];

    const service: Service = {
        id: docSnap.id,
        cuartel: data.cuartel,
        year: data.year,
        manualId: data.manualId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        serviceType: data.serviceType,
        address: data.address,
        summonMethods: data.summonMethods || [],
        commandId: data.commandId,
        serviceChiefId: data.serviceChiefId,
        onDutyIds: onDutyIds,
        offDutyIds: offDutyIds,
        interveningVehicles: data.interveningVehicles || [],
        collaboration: data.collaboration,
        recognition: data.recognition,
        observations: data.observations,
        command: firefighterMap.get(data.commandId),
        serviceChief: firefighterMap.get(data.serviceChiefId),
        onDutyPersonnel: getFirefighterObjects(onDutyIds),
        offDutyPersonnel: getFirefighterObjects(offDutyIds),
    };
    return service;
}


/**
 * Retrieves all services from Firestore and enriches them with related data.
 */
export const getServices = async (): Promise<Service[]> => {
    const [servicesSnapshot, firefighterMap] = await Promise.all([
        getDocs(query(servicesCollection, orderBy('date', 'desc'), orderBy('manualId', 'desc'))),
        getAllFirefightersCached()
    ]);
    
    const servicesPromises = servicesSnapshot.docs.map(doc => docToService(doc, firefighterMap));
    const services = await Promise.all(servicesPromises);

    return services;
}

export const getServiceById = async (id: string): Promise<Service | null> => {
    const docRef = doc(db, 'services', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const firefighterMap = await getAllFirefightersCached();
        return await docToService(docSnap, firefighterMap);
    }
    return null;
}

/**
 * Adds a new service record to the database.
 * @param serviceData The core data for the new service.
 * @returns The ID of the newly created service document.
 */
export const addService = async (serviceData: Omit<Service, 'id' | 'command' | 'serviceChief' | 'onDutyPersonnel' | 'offDutyPersonnel'>): Promise<string> => {
    const docRef = await addDoc(servicesCollection, serviceData);
    return docRef.id;
}
