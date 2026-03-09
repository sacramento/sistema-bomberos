'use server';

import { Vehicle, Firefighter, MaintenanceItem, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { getMaintenanceItems } from './maintenance-items.service';
import { cache } from 'react';
import { logAction } from './audit.service';

const getVehiclesCollection = () => collection(db, 'vehicles');

const getAllFirefightersCached = cache(async () => {
    const firefighters = await getFirefighters();
    return new Map(firefighters.map(f => [f.id, f]));
});

const docToVehicle = async (
    docSnap: any, 
    firefighterMap: Map<string, Firefighter>,
    maintenanceItemMap: Map<string, MaintenanceItem>
): Promise<Vehicle> => {
    const data = docSnap.data();
    const encargados = (data.encargadoIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
    const materialEncargados = (data.materialEncargadoIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
    const maintenanceItems = (data.maintenanceItemIds || []).map((id: string) => maintenanceItemMap.get(id)).filter(Boolean) as MaintenanceItem[];

    return {
        id: docSnap.id,
        numeroMovil: data.numeroMovil,
        dominio: data.dominio || '',
        marca: data.marca,
        modelo: data.modelo,
        ano: data.ano,
        kilometraje: data.kilometraje,
        cuartel: data.cuartel,
        especialidad: data.especialidad,
        capacidadAgua: data.capacidadAgua,
        tipoVehiculo: data.tipoVehiculo,
        traccion: data.traccion,
        encargadoIds: data.encargadoIds || [],
        materialEncargadoIds: data.materialEncargadoIds || [],
        observaciones: data.observaciones,
        maintenanceItemIds: data.maintenanceItemIds || [],
        encargados,
        materialEncargados,
        maintenanceItems,
    };
}

export const getVehicles = async (): Promise<Vehicle[]> => {
    const q = query(getVehiclesCollection(), orderBy('numeroMovil', 'asc'));
    const querySnapshot = await getDocs(q);
    const [firefighterMap, maintenanceItems] = await Promise.all([getAllFirefightersCached(), getMaintenanceItems()]);
    const maintenanceItemMap = new Map(maintenanceItems.map(i => [i.id, i]));
    
    const vehiclesPromises = querySnapshot.docs.map(doc => docToVehicle(doc, firefighterMap, maintenanceItemMap));
    return await Promise.all(vehiclesPromises);
}

export const getVehicleById = async (id: string): Promise<Vehicle | null> => {
    const docRef = doc(db, 'vehicles', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const [firefighterMap, maintenanceItems] = await Promise.all([getAllFirefightersCached(), getMaintenanceItems()]);
        const maintenanceItemMap = new Map(maintenanceItems.map(i => [i.id, i]));
        return await docToVehicle(docSnap, firefighterMap, maintenanceItemMap);
    }
    return null;
}

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'encargados' | 'materialEncargados' | 'maintenanceItems'>, actor: LoggedInUser): Promise<string> => {
    const q = query(getVehiclesCollection(), where("numeroMovil", "==", vehicleData.numeroMovil));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) throw new Error(`El móvil con el número ${vehicleData.numeroMovil} ya existe.`);

    const dataToSave = { ...vehicleData };
    const docRef = await addDoc(getVehiclesCollection(), dataToSave);
    await logAction(actor, 'CREATE_VEHICLE', { entity: 'vehicle', id: docRef.id }, dataToSave);
    return docRef.id;
};

export const updateVehicle = async (id: string, vehicleData: Partial<Omit<Vehicle, 'id' | 'encargados' | 'materialEncargados' | 'maintenanceItems'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'vehicles', id);
    await updateDoc(docRef, vehicleData);
    await logAction(actor, 'UPDATE_VEHICLE', { entity: 'vehicle', id }, vehicleData);
};

export const deleteVehicle = async (id: string, actor: LoggedInUser): Promise<void> => {
    const batch = writeBatch(db);
    const vehicleDocRef = doc(db, 'vehicles', id);
    const vehicleSnap = await getDoc(vehicleDocRef);
    const details = vehicleSnap.exists() ? { numeroMovil: vehicleSnap.data().numeroMovil } : {};
    batch.delete(vehicleDocRef);
    await batch.commit();
    await logAction(actor, 'DELETE_VEHICLE', { entity: 'vehicle', id }, details);
};
