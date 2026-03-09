
'use client';

import { Material, Vehicle, LoggedInUser } from '@/lib/types';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getVehicles } from './vehicles.service';
import { cache } from 'react';
import { logAction } from './audit.service';

const { firestore: db } = initializeFirebase();
const materialsCollection = collection(db, 'materials');

const getAllVehiclesCached = cache(async () => {
    const vehicles = await getVehicles();
    return new Map(vehicles.map(v => [v.id, v]));
});

const docToMaterial = async (
    docSnap: any, 
    vehicleMap: Map<string, Vehicle>
): Promise<Material> => {
    const data = docSnap.data();
    let vehiculo: Vehicle | undefined = undefined;
    if (data.ubicacion?.type === 'vehiculo' && data.ubicacion?.vehiculoId) {
        vehiculo = vehicleMap.get(data.ubicacion.vehiculoId);
    }
    return {
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
    } as Material;
}

export const getMaterials = async (): Promise<Material[]> => {
    const querySnapshot = await getDocs(materialsCollection);
    const vehicleMap = await getAllVehiclesCached();
    const materialsPromises = querySnapshot.docs.map(doc => docToMaterial(doc, vehicleMap));
    const results = await Promise.all(materialsPromises);
    return results.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
}

export const getNextMaterialSequence = async (prefix: string): Promise<number> => {
    const q = query(materialsCollection, where("codigo", ">=", prefix), where("codigo", "<=", prefix + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    let maxNum = 0;
    querySnapshot.forEach(doc => {
        const code = doc.data().codigo as string;
        const numPart = code.substring(prefix.length);
        const num = parseInt(numPart);
        if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    return maxNum + 1;
};

export const addMaterial = async (materialData: Omit<Material, 'id' | 'vehiculo'>, actor: LoggedInUser): Promise<string> => {
    if (materialData.codigo) {
        const q = query(materialsCollection, where("codigo", "==", materialData.codigo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) throw new Error(`El código ${materialData.codigo} ya existe.`);
    }
    const docRef = await addDoc(materialsCollection, materialData);
    await logAction(actor, 'CREATE_MATERIAL', { entity: 'material', id: docRef.id }, materialData);
    return docRef.id;
};

export const updateMaterial = async (id: string, materialData: Partial<Omit<Material, 'id' | 'vehiculo'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'materials', id);
    await updateDoc(docRef, materialData);
    await logAction(actor, 'UPDATE_MATERIAL', { entity: 'material', id }, materialData);
};

export const deleteMaterial = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'materials', id);
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_MATERIAL', { entity: 'material', id });
};

export const batchAddMaterials = async (items: any[], actor: LoggedInUser): Promise<void> => {
    if (!items || items.length === 0) return;
    const batch = writeBatch(db);
    for (const item of items) {
        const docRef = doc(materialsCollection);
        batch.set(docRef, item);
    }
    await batch.commit();
    await logAction(actor, 'BATCH_IMPORT_MATERIALS', { entity: 'material', id: 'batch' }, { count: items.length });
};
