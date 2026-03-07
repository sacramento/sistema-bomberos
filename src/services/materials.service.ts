
'use server';

import { Material, Vehicle, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getVehicles } from './vehicles.service';
import { cache } from 'react';
import { logAction } from './audit.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const materialsCollection = collection(db, 'materials');

// Cache data for the duration of a single request
const getAllVehiclesCached = cache(async () => {
    const vehicles = await getVehicles();
    return new Map(vehicles.map(v => [v.id, v]));
});

const getAllVehiclesByNumberCached = cache(async () => {
    const vehicles = await getVehicles();
    return new Map(vehicles.map(v => [v.numeroMovil, v]));
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
        codigo: data.codigo || '',
        nombre: data.nombre,
        categoryId: data.categoryId || '',
        subCategoryId: data.subCategoryId || '',
        itemTypeId: data.itemTypeId || '',
        marca: data.marca || '',
        modelo: data.modelo || '',
        acople: data.acople,
        composicion: data.composicion,
        caracteristicas: data.caracteristicas || '',
        medida: data.medida || '',
        ubicacion: data.ubicacion,
        estado: data.estado,
        condicion: data.condicion || 'Bueno',
        cuartel: data.cuartel || '',
        vehiculo: vehiculo,
    };
    return material;
}

export const getMaterials = async (): Promise<Material[]> => {
    // Obtenemos los materiales ordenados por código, pero permitiendo nulos al final
    const q = query(materialsCollection, orderBy('codigo', 'asc'));
    const querySnapshot = await getDocs(q);

    const vehicleMap = await getAllVehiclesCached();
    
    const materialsPromises = querySnapshot.docs.map(doc => docToMaterial(doc, vehicleMap));
    const materials = await Promise.all(materialsPromises);

    return materials;
}

/**
 * Generates the next sequential number for a given code prefix.
 */
export const getNextMaterialSequence = async (prefix: string): Promise<number> => {
    const q = query(materialsCollection, where("codigo", ">=", prefix), where("codigo", "<=", prefix + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    
    let maxNum = 0;
    querySnapshot.forEach(doc => {
        const code = doc.data().codigo as string;
        const numPart = code.substring(prefix.length);
        const num = parseInt(numPart);
        if (!isNaN(num) && num > maxNum) {
            maxNum = num;
        }
    });
    
    return maxNum + 1;
};

export const addMaterial = async (materialData: Omit<Material, 'id' | 'vehiculo'>, actor: LoggedInUser): Promise<string> => {
    if (materialData.codigo) {
        const q = query(materialsCollection, where("codigo", "==", materialData.codigo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error(`El material con el código ${materialData.codigo} ya existe.`);
        }
    }

    const docRef = await addDoc(materialsCollection, materialData);
    await logAction(actor, 'CREATE_MATERIAL', { entity: 'material', id: docRef.id }, materialData);
    return docRef.id;
};

export const updateMaterial = async (id: string, materialData: Partial<Omit<Material, 'id' | 'vehiculo'>>, actor: LoggedInUser): Promise<void> => {
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
    await logAction(actor, 'UPDATE_MATERIAL', { entity: 'material', id }, dataToUpdate);
};

export const deleteMaterial = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'materials', id);
    const docSnap = await getDoc(docRef);
    const details = docSnap.exists() ? { nombre: docSnap.data().nombre } : {};
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_MATERIAL', { entity: 'material', id }, details);
};

export const batchAddMaterials = async (items: any[], actor: LoggedInUser): Promise<void> => {
    if (!items || items.length === 0) return;

    const batch = writeBatch(db);
    const vehicleMap = await getAllVehiclesByNumberCached();
    
    // Obtener todos los códigos existentes para evitar duplicados
    const existingCodesQuery = await getDocs(query(materialsCollection));
    const existingCodes = new Set(existingCodesQuery.docs.map(doc => doc.data().codigo).filter(Boolean));

    for (const item of items) {
        // Si tiene código y ya existe, saltar
        if (item.codigo && existingCodes.has(item.codigo)) continue;

        const docRef = doc(materialsCollection);
        let finalCuartel = item.cuartel;
        let finalUbicacion = item.ubicacion;

        // Si es ubicación vehículo, intentar mapear número de móvil a ID de Firestore
        if (item.ubicacion.type === 'vehiculo' && item.numero_movil) {
            const v = vehicleMap.get(item.numero_movil.toString());
            if (v) {
                finalUbicacion = { ...item.ubicacion, vehiculoId: v.id };
                finalCuartel = v.cuartel;
            }
        }

        const materialData = {
            codigo: item.codigo || '',
            nombre: item.nombre || 'Sin nombre',
            categoryId: item.categoryId || '',
            subCategoryId: item.subCategoryId || '',
            itemTypeId: item.itemTypeId || '',
            marca: item.marca || '',
            modelo: item.modelo || '',
            acople: item.acople || '',
            composicion: item.composicion || '',
            caracteristicas: item.caracteristicas || '',
            medida: item.medida || '',
            estado: item.estado || 'En Servicio',
            condicion: item.condicion || 'Bueno',
            cuartel: finalCuartel || '',
            ubicacion: finalUbicacion
        };

        batch.set(docRef, materialData);
        if (item.codigo) existingCodes.add(item.codigo);
    }

    await batch.commit();
    await logAction(actor, 'BATCH_IMPORT_MATERIALS', { entity: 'material', id: 'batch' }, { count: items.length });
};

export const deleteAllMaterials = async (actor: LoggedInUser, vehicleId?: string): Promise<number> => {
    let q;
    if (vehicleId) {
        q = query(materialsCollection, 
            where('ubicacion.type', '==', 'vehiculo'), 
            where('ubicacion.vehiculoId', '==', vehicleId)
        );
    } else {
        q = query(materialsCollection);
    }

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return 0;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    const details = vehicleId ? { vehicleId, count: querySnapshot.size } : { count: querySnapshot.size };
    await logAction(actor, 'DELETE_MATERIAL', { entity: 'material', id: 'batch' }, details);
    return querySnapshot.size;
}
