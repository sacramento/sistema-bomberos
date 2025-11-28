
'use server';

import { db } from '@/lib/firebase/firestore';
import { Service, Firefighter, Vehicle, InterveningVehicle } from '@/lib/types';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc } from 'firebase/firestore';
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
    
    const getFirefighterObjects = (ids: string[] | undefined): Firefighter[] => {
        if (!ids) return [];
        return ids.map(id => firefighterMap.get(id)).filter(f => f !== undefined) as Firefighter[];
    };
    
    const enrichedInterveningVehicles: InterveningVehicle[] = (data.interveningVehicles || []).map((iv: any) => ({
        ...iv,
        vehicle: vehicleMap.get(iv.vehicleId)
    }));
    
    // Safely access IDs, providing an empty array as a fallback
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
        enrichedInterveningVehicles: enrichedInterveningVehicles,
    };
    return service;
}


// Function to get all services
export const getServices = async (): Promise<Service[]> => {
    const q = query(servicesCollection, orderBy('date', 'desc'), orderBy('manualId', 'desc'));
    const querySnapshot = await getDocs(q);

    const [firefighterMap, vehicleMap] = await Promise.all([
        getAllFirefightersCached(),
        getAllVehiclesCached()
    ]);
    
    const servicesPromises = querySnapshot.docs.map(doc => docToService(doc, firefighterMap, vehicleMap));
    const services = await Promise.all(servicesPromises);

    return services;
}

export const addService = async (serviceData: Omit<Service, 'id' | 'command' | 'serviceChief' | 'onDutyPersonnel' | 'offDutyPersonnel' | 'enrichedInterveningVehicles'>): Promise<string> => {
    const docRef = await addDoc(servicesCollection, serviceData);
    return docRef.id;
}
