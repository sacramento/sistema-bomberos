'use client';

import { Material, Vehicle, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getVehicles } from './vehicles.service';
import { logAction } from './audit.service';

/**
 * Obtiene todos los materiales.
 * IMPORTANTE: Eliminamos el 'orderBy' del servidor. Firestore oculta los documentos
 * que no tienen el campo por el cual se ordena. Al traerlos todos y ordenar en JS,
 * garantizamos que los materiales sin código vuelvan a aparecer.
 */
export const getMaterials = async (): Promise<Material[]> => {
    if (!db) return [];
    
    const materialsCollection = collection(db, 'materials');
    // Traemos todos los documentos sin filtros de ordenamiento de Firestore
    const querySnapshot = await getDocs(materialsCollection);
    
    const vehiclesData = await getVehicles();
    const vehicleMap = new Map(vehiclesData.map(v => [v.id, v]));
    
    const results: Material[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let vehiculo: Vehicle | undefined = undefined;
        if (data.ubicacion?.type === 'vehiculo' && data.ubicacion?.vehiculoId) {
            vehiculo = vehicleMap.get(data.ubicacion.vehiculoId);
        }
        return {
            id: docSnap.id,
            codigo: data.codigo || '',
            nombre: data.nombre || 'Sin nombre',
            categoryId: data.categoryId || '',
            subCategoryId: data.subCategoryId || '',
            itemTypeId: data.itemTypeId || '',
            marca: data.marca || '',
            modelo: data.modelo || '',
            acople: data.acople,
            composicion: data.composicion,
            caracteristicas: data.caracteristicas || '',
            medida: data.medida || '',
            ubicacion: data.ubicacion || { type: 'deposito' },
            estado: data.estado || 'Fuera de Servicio',
            condicion: data.condicion || 'Bueno',
            cuartel: data.cuartel || '',
            vehiculo: vehiculo,
        } as Material;
    });
    
    // Ordenamos en memoria (JavaScript) para que los que no tienen código queden al final
    return results.sort((a, b) => {
        if (!a.codigo) return 1;
        if (!b.codigo) return -1;
        return a.codigo.localeCompare(b.codigo);
    });
}

export const getNextMaterialSequence = async (prefix: string): Promise<number> => {
    if (!db) return 1;
    const materialsCollection = collection(db, 'materials');
    const q = query(materialsCollection, where("codigo", ">=", prefix), where("codigo", "<=", prefix + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    let maxNum = 0;
    querySnapshot.forEach(docSnap => {
        const code = docSnap.data().codigo as string;
        const numPart = code.substring(prefix.length);
        const num = parseInt(numPart);
        if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    return maxNum + 1;
};

export const addMaterial = async (materialData: Omit<Material, 'id' | 'vehiculo'>, actor: LoggedInUser): Promise<string> => {
    if (!db) throw new Error("Database not initialized");
    const materialsCollection = collection(db, 'materials');
    
    if (materialData.codigo) {
        const q = query(materialsCollection, where("codigo", "==", materialData.codigo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) throw new Error(`El código ${materialData.codigo} ya existe.`);
    }
    
    const docRef = await addDoc(materialsCollection, materialData);
    if (actor) {
        await logAction(actor, 'CREATE_MATERIAL', { entity: 'material', id: docRef.id }, materialData);
    }
    return docRef.id;
};

export const updateMaterial = async (id: string, materialData: Partial<Omit<Material, 'id' | 'vehiculo'>>, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'materials', id);
    await updateDoc(docRef, materialData);
    if (actor) {
        await logAction(actor, 'UPDATE_MATERIAL', { entity: 'material', id }, materialData);
    }
};

export const deleteMaterial = async (id: string, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'materials', id);
    await deleteDoc(docRef);
    if (actor) {
        await logAction(actor, 'DELETE_MATERIAL', { entity: 'material', id });
    }
};

export const batchAddMaterials = async (items: any[], actor: LoggedInUser): Promise<void> => {
    if (!db || !items || items.length === 0) return;
    const batch = writeBatch(db);
    const materialsCollection = collection(db, 'materials');
    for (const item of items) {
        const docRef = doc(materialsCollection);
        batch.set(docRef, item);
    }
    await batch.commit();
    if (actor) {
        await logAction(actor, 'BATCH_IMPORT_MATERIALS', { entity: 'material', id: 'batch' }, { count: items.length });
    }
};
