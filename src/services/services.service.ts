
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
    
    const onDutyIds: string[] = data.onDutyIds || [];
    const offDutyIds: string[] = data.offDutyIds || [];
    
    const interveningVehiclesData: InterveningVehicle[] = data.interveningVehicles || [];

    const interveningVehicles = interveningVehiclesData.map(iv => ({
        ...iv,
        vehicle: vehicleMap.get(iv.vehicleId)
    }));
    

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
        interveningVehicles: interveningVehicles,
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


export const getServices = async (): Promise<Service[]> => {
    const [servicesSnapshot, firefighterMap, vehicles] = await Promise.all([
        getDocs(query(servicesCollection, orderBy('date', 'desc'), orderBy('manualId', 'desc'))),
        getFirefighters().then(ffs => new Map(ffs.map(f => [f.id, f]))),
        getVehicles()
    ]);
    
    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
    
    const servicesPromises = servicesSnapshot.docs.map(doc => docToService(doc, firefighterMap, vehicleMap));
    const services = await Promise.all(servicesPromises);

    return services;
}

export const getServiceById = async (id: string): Promise<Service | null> => {
    const docRef = doc(db, 'services', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const [firefighterMap, vehicles] = await Promise.all([
             getFirefighters().then(ffs => new Map(ffs.map(f => [f.id, f]))),
             getVehicles()
        ]);
        const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
        return await docToService(docSnap, firefighterMap, vehicleMap);
    }
    return null;
}

export const addService = async (serviceData: Omit<Service, 'id' | 'command' | 'serviceChief' | 'onDutyPersonnel' | 'offDutyPersonnel' | 'interveningVehicles'> & { interveningVehicles: Partial<InterveningVehicle>[] }): Promise<string> => {
    const dataToSave = {
        ...serviceData,
        interveningVehicles: serviceData.interveningVehicles.map(iv => ({
            vehicleId: iv.vehicleId,
            departureTime: iv.departureTime,
            returnTime: iv.returnTime
        }))
    };

    const docRef = await addDoc(servicesCollection, dataToSave);
    return docRef.id;
}
