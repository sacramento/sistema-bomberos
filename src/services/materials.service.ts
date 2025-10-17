
'use server';

import { Material, Vehicle } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getVehicles } from './vehicles.service';
import { cache } from 'react';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const materialsCollection = collection(db, 'materials');

// Cache data for the duration of a single request
const getAllVehiclesCached = cache(async () => {
    const vehicles = await getVehicles();
    return new Map(vehicles.map(v => [v.id, v]));
});

// Helper to enrich material data with vehicle details
const docToMaterial = async (
    docSnap: any, 
    vehicleMap: Map<string, Vehicle>
): Promise<Material> => {
    const data = docSnap.data();
    
    let vehiculo: Vehicle | undefined = undefined;
    if (data.ubicacion?.type === 'vehiculo' && data.ubicacion?.vehiculoId) {
        vehiculo = vehicleMap.get(data.ubicacion.vehiculoId);
    }
    
    const material: Material = {
        id: docSnap.id,
        codigo: data.codigo,
        nombre: data.nombre,
        tipo: data.tipo,
        especialidad: data.especialidad,
        caracteristicas: data.caracteristicas,
        ubicacion: data.ubicacion,
        estado: data.estado,
        cuartel: data.cuartel,
        vehiculo: vehiculo,
    };
    return material;
}

export const getMaterials = async (): Promise<Material[]> => {
    const q = query(materialsCollection, orderBy('nombre', 'asc'));
    const querySnapshot = await getDocs(q);

    const vehicleMap = await getAllVehiclesCached();
    
    const materialsPromises = querySnapshot.docs.map(doc => docToMaterial(doc, vehicleMap));
    const materials = await Promise.all(materialsPromises);

    return materials;
}

export const addMaterial = async (materialData: Omit<Material, 'id' | 'vehiculo'>): Promise<string> => {
    const q = query(materialsCollection, where("codigo", "==", materialData.codigo));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error(`El material con el código ${materialData.codigo} ya existe.`);
    }

    const docRef = await addDoc(materialsCollection, materialData);
    return docRef.id;
};

export const updateMaterial = async (id: string, materialData: Partial<Omit<Material, 'id' | 'vehiculo'>>): Promise<void> => {
    const docRef = doc(db, 'materials', id);

    if (materialData.codigo) {
        const q = query(materialsCollection, where("codigo", "==", materialData.codigo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            throw new Error(`El código de material ${materialData.codigo} ya está en uso.`);
        }
    }
    
    const dataToUpdate = { ...materialData };
    await updateDoc(docRef, dataToUpdate);
};

export const deleteMaterial = async (id: string): Promise<void> => {
    const docRef = doc(db, 'materials', id);
    await deleteDoc(docRef);
};
