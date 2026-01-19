

'use server';

import { db } from '@/lib/firebase/firestore';
import { Service, Firefighter, Vehicle, LoggedInUser } from '@/lib/types';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { getVehicles } from './vehicles.service';
import { cache } from 'react';
import { logAction } from './audit.service';

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


const docToService = async (docSnap: any, firefighterMap: Map<string, Firefighter>, vehicleMap: Map<string, Vehicle>): Promise<Service> => {
    const data = docSnap.data();

    const getPersonnel = (id: string | undefined): Firefighter | undefined => id ? firefighterMap.get(id) : undefined;
    const getPersonnelList = (ids: string[] | undefined): Firefighter[] => ids?.map(id => firefighterMap.get(id)).filter((f): f is Firefighter => !!f) || [];

    return {
        id: docSnap.id,
        ...data,
        status: data.status || 'Activo',
        command: getPersonnel(data.commandId),
        serviceChief: getPersonnel(data.serviceChiefId),
        stationOfficer: getPersonnel(data.stationOfficerId),
        onDutyPersonnel: getPersonnelList(data.onDutyIds),
        offDutyPersonnel: getPersonnelList(data.offDutyIds),
    } as Service;
};

export const getServices = async (): Promise<Service[]> => {
    const servicesSnapshot = await getDocs(query(servicesCollection, orderBy('startDateTime', 'desc')));
    const firefighterMap = await getAllFirefightersCached();
    const vehicleMap = await getAllVehiclesCached();
    
    const servicePromises = servicesSnapshot.docs.map(doc => docToService(doc, firefighterMap, vehicleMap));
    return Promise.all(servicePromises);
}

export const getServiceById = async (id: string): Promise<Service | null> => {
    const docRef = doc(db, 'services', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const firefighterMap = await getAllFirefightersCached();
        const vehicleMap = await getAllVehiclesCached();
        const serviceData = await docToService(docSnap, firefighterMap, vehicleMap);
        return serviceData;
    }
    return null;
}

export const addService = async (serviceData: any, actor: LoggedInUser): Promise<string> => {
    const dataToSave = { ...serviceData };
    dataToSave.year = new Date(dataToSave.startDateTime).getFullYear();
    dataToSave.manualId = Number(dataToSave.manualId);
    dataToSave.zone = Number(dataToSave.zone);
    if (!dataToSave.endDateTime) dataToSave.endDateTime = dataToSave.startDateTime;
    if (!dataToSave.status) dataToSave.status = 'Activo';

    const docRef = await addDoc(servicesCollection, dataToSave);
    await logAction(actor, 'CREATE_SERVICE', { entity: 'service', id: docRef.id }, dataToSave);
    return docRef.id;
}

export const updateService = async (id: string, serviceData: Partial<Service>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'services', id);
    const dataToUpdate: any = { ...serviceData };
    if (dataToUpdate.startDateTime) dataToUpdate.year = new Date(dataToUpdate.startDateTime).getFullYear();
    if (dataToUpdate.manualId) dataToUpdate.manualId = Number(dataToUpdate.manualId);
    if (dataToUpdate.zone) dataToUpdate.zone = Number(dataToUpdate.zone);
    if (dataToUpdate.latitude === '') dataToUpdate.latitude = null;
    if (dataToUpdate.longitude === '') dataToUpdate.longitude = null;
    
    await updateDoc(docRef, dataToUpdate);
    await logAction(actor, 'UPDATE_SERVICE', { entity: 'service', id }, dataToUpdate);
}

export const deleteService = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'services', id);
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_SERVICE', { entity: 'service', id });
}
