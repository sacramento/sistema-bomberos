
'use server';

import { Vehicle, Firefighter, Specialization } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const vehiclesCollection = collection(db, 'vehicles');

// Helper to enrich vehicle data with full firefighter objects for the 'encargados'
const docToVehicle = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<Vehicle> => {
    const data = docSnap.data();
    
    const encargados = (data.encargadoIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];

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
        encargados,
    };
    return vehicle;
}

export const getVehicles = async (): Promise<Vehicle[]> => {
    const q = query(vehiclesCollection, orderBy('numeroMovil', 'asc'));
    const querySnapshot = await getDocs(q);

    const allFirefighters = await getFirefighters();
    const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
    
    const vehiclesPromises = querySnapshot.docs.map(doc => docToVehicle(doc, firefighterMap));
    const vehicles = await Promise.all(vehiclesPromises);

    return vehicles;
}

export const getVehicleById = async (id: string): Promise<Vehicle | null> => {
    const docRef = doc(db, 'vehicles', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const allFirefighters = await getFirefighters();
        const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
        return await docToVehicle(docSnap, firefighterMap);
    }
    return null;
}

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'encargados'>): Promise<string> => {
    // Ensure that enriched properties are not saved
    const { encargados, ...dataToSave } = vehicleData;
    const docRef = await addDoc(vehiclesCollection, dataToSave);
    return docRef.id;
};

export const updateVehicle = async (id: string, vehicleData: Partial<Omit<Vehicle, 'id' | 'encargados'>>): Promise<void> => {
    const docRef = doc(db, 'vehicles', id);
    const { encargados, ...dataToUpdate } = vehicleData;
    await updateDoc(docRef, dataToUpdate);
};

export const deleteVehicle = async (id: string): Promise<void> => {
    const docRef = doc(db, 'vehicles', id);
    await deleteDoc(docRef);
}
