
'use server';

import { Vehicle, Firefighter, Specialization, MaintenanceItem } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { getMaintenanceItems } from './maintenance-items.service';
import { cache } from 'react';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const vehiclesCollection = collection(db, 'vehicles');
const maintenanceRecordsCollection = collection(db, 'maintenance_records');

// Cache data for the duration of a single request
const getAllFirefightersCached = cache(async () => {
    const firefighters = await getFirefighters();
    return new Map(firefighters.map(f => [f.id, f]));
});

const getAllMaintenanceItemsCached = cache(async () => {
    const items = await getMaintenanceItems();
    return new Map(items.map(i => [i.id, i]));
});


// Helper to enrich vehicle data
const docToVehicle = async (
    docSnap: any, 
    firefighterMap: Map<string, Firefighter>,
    maintenanceItemMap: Map<string, MaintenanceItem>
): Promise<Vehicle> => {
    const data = docSnap.data();
    
    const encargados = (data.encargadoIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
    const maintenanceItems = (data.maintenanceItemIds || []).map((id: string) => maintenanceItemMap.get(id)).filter(Boolean) as MaintenanceItem[];

    const vehicle: Vehicle = {
        id: docSnap.id,
        numeroMovil: data.numeroMovil,
        marca: data.marca,
        modelo: data.modelo,
        ano: data.ano,
        kilometraje: data.kilometraje,
        cuartel: data.cuartel,
        especialidad: data.especialidad,
        capacidadAgua: data.capacidadAgua,
        tipoVehiculo: data.tipoVehiculo,
        traccion: data.traccion,
        encargadoIds: data.encargadoIds,
        observaciones: data.observaciones,
        maintenanceItemIds: data.maintenanceItemIds || [],
        encargados,
        maintenanceItems,
    };
    return vehicle;
}

export const getVehicles = async (): Promise<Vehicle[]> => {
    const q = query(vehiclesCollection, orderBy('numeroMovil', 'asc'));
    const querySnapshot = await getDocs(q);

    const [firefighterMap, maintenanceItemMap] = await Promise.all([
        getAllFirefightersCached(),
        getAllMaintenanceItemsCached()
    ]);
    
    const vehiclesPromises = querySnapshot.docs.map(doc => docToVehicle(doc, firefighterMap, maintenanceItemMap));
    const vehicles = await Promise.all(vehiclesPromises);

    return vehicles;
}

export const getVehicleById = async (id: string): Promise<Vehicle | null> => {
    const docRef = doc(db, 'vehicles', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const [firefighterMap, maintenanceItemMap] = await Promise.all([
            getAllFirefightersCached(),
            getAllMaintenanceItemsCached()
        ]);
        return await docToVehicle(docSnap, firefighterMap, maintenanceItemMap);
    }
    return null;
}

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'encargados' | 'maintenanceItems'>): Promise<string> => {
    const q = query(vehiclesCollection, where("numeroMovil", "==", vehicleData.numeroMovil));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error(`El móvil con el número ${vehicleData.numeroMovil} ya existe.`);
    }

    const dataToSave = { 
        ...vehicleData,
        maintenanceItemIds: vehicleData.maintenanceItemIds || [],
     };
    const docRef = await addDoc(vehiclesCollection, dataToSave);
    return docRef.id;
};

export const updateVehicle = async (id: string, vehicleData: Partial<Omit<Vehicle, 'id' | 'encargados' | 'maintenanceItems'>>): Promise<void> => {
    const docRef = doc(db, 'vehicles', id);

    if (vehicleData.numeroMovil) {
        const q = query(vehiclesCollection, where("numeroMovil", "==", vehicleData.numeroMovil));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            throw new Error(`El número de móvil ${vehicleData.numeroMovil} ya está en uso por otro vehículo.`);
        }
    }
    
    const dataToUpdate = { ...vehicleData };
    await updateDoc(docRef, dataToUpdate);
};

export const deleteVehicle = async (id: string): Promise<void> => {
    const batch = writeBatch(db);
    
    const vehicleDocRef = doc(db, 'vehicles', id);
    batch.delete(vehicleDocRef);

    const maintQuery = query(maintenanceRecordsCollection, where('vehicleId', '==', id));
    const maintSnapshot = await getDocs(maintQuery);
    maintSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
};
