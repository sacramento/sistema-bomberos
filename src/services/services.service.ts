
'use server';

import { db } from '@/lib/firebase/firestore';
import { Service, Firefighter, Vehicle, InterveningVehicle } from '@/lib/types';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { getVehicles } from './vehicles.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const servicesCollection = collection(db, 'services');

/**
 * Converts a Firestore document into a fully enriched Service object.
 * This helper function fetches related firefighter and vehicle data.
 * @param docSnap The Firestore document snapshot of the service.
 * @param firefighterMap A map of firefighter IDs to Firefighter objects.
 * @param vehicleMap A map of vehicle IDs to Vehicle objects.
 * @returns A promise that resolves to the enriched Service object.
 */
const docToService = async (
    docSnap: any, 
    firefighterMap: Map<string, Firefighter>,
    vehicleMap: Map<string, Vehicle>
): Promise<Service> => {
    const data = docSnap.data();
    
    const getFirefighterObjects = (ids: string[] | undefined): Firefighter[] => {
        if (!ids || !Array.isArray(ids)) return [];
        return ids.map(id => firefighterMap.get(id)).filter(f => f !== undefined) as Firefighter[];
    };
    
    const interveningVehiclesData: any[] = data.interveningVehicles || [];
    const enrichedInterveningVehicles: InterveningVehicle[] = interveningVehiclesData.map((iv) => ({
        ...iv,
        vehicle: vehicleMap.get(iv.vehicleId)
    })).filter(iv => iv.vehicle); // Ensure we only include vehicles that were found
    
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
        interveningVehicles: interveningVehiclesData,
        collaboration: data.collaboration,
        recognition: data.recognition,
        observations: data.observations,
        command: firefighterMap.get(data.commandId),
        serviceChief: firefighterMap.get(data.serviceChiefId),
        onDutyPersonnel: getFirefighterObjects(onDutyIds),
        offDutyPersonnel: getFirefighterObjects(offDutyIds),
        enrichedInterveningVehicles: enrichedInterveningVehicles,
    };
    return service;
}


/**
 * Retrieves all services from Firestore and enriches them with related data.
 * This function fetches the latest firefighters and vehicles to ensure data consistency.
 * @returns A promise that resolves to an array of enriched Service objects.
 */
export const getServices = async (): Promise<Service[]> => {
    // 1. Fetch all necessary data concurrently.
    const [servicesSnapshot, firefighters, vehicles] = await Promise.all([
        getDocs(query(servicesCollection, orderBy('date', 'desc'), orderBy('manualId', 'desc'))),
        getFirefighters(),
        getVehicles()
    ]);

    // 2. Create maps for efficient lookups. This is crucial for performance.
    const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
    
    // 3. Process each service document to create enriched objects.
    const servicesPromises = servicesSnapshot.docs.map(doc => docToService(doc, firefighterMap, vehicleMap));
    const services = await Promise.all(servicesPromises);

    return services;
}

/**
 * Adds a new service record to the database.
 * @param serviceData The core data for the new service.
 * @returns The ID of the newly created service document.
 */
export const addService = async (serviceData: Omit<Service, 'id' | 'command' | 'serviceChief' | 'onDutyPersonnel' | 'offDutyPersonnel' | 'enrichedInterveningVehicles'>): Promise<string> => {
    const docRef = await addDoc(servicesCollection, serviceData);
    return docRef.id;
}
