'use client';

import { Material, Vehicle, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, updateDoc, deleteDoc, writeBatch, setDoc, query, where } from 'firebase/firestore';
import { getVehicles } from './vehicles.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const MATERIALS_COLLECTION = 'materials';

export const getMaterials = async (): Promise<Material[]> => {
    if (!db) return [];
    const colRef = collection(db, MATERIALS_COLLECTION);
    
    return getDocs(colRef)
        .then(async (querySnapshot) => {
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
                    estado: data.estado || 'En Servicio',
                    condicion: data.condicion || 'Bueno',
                    cuartel: data.cuartel || '',
                    vehiculo: vehiculo,
                } as Material;
            });
            
            return results.sort((a, b) => {
                if (!a.codigo && !b.codigo) return a.nombre.localeCompare(b.nombre);
                if (!a.codigo) return 1;
                if (!b.codigo) return -1;
                return a.codigo.localeCompare(b.codigo, undefined, { numeric: true });
            });
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: colRef.path,
                operation: 'list',
            }));
            return [];
        });
}

/**
 * Calculates the next sequence number for a material code prefix.
 */
export const getNextMaterialSequence = async (prefix: string): Promise<number> => {
    if (!db) return 1;
    const colRef = collection(db, MATERIALS_COLLECTION);
    
    return getDocs(colRef).then(snapshot => {
        const matchingCodes = snapshot.docs
            .map(d => d.data().codigo as string)
            .filter(code => code && code.startsWith(prefix));
        
        if (matchingCodes.length === 0) return 1;
        
        const sequences = matchingCodes.map(code => {
            const seqStr = code.replace(prefix, '');
            return parseInt(seqStr, 10) || 0;
        });
        
        return Math.max(...sequences) + 1;
    }).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: colRef.path,
            operation: 'list',
        }));
        return 1;
    });
};

export const addMaterial = (materialData: Omit<Material, 'id' | 'vehiculo'>, actor: LoggedInUser) => {
    if (!db) return;
    const colRef = collection(db, MATERIALS_COLLECTION);
    const docRef = doc(colRef);
    
    setDoc(docRef, materialData).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: materialData,
        }));
    });

    if (actor) {
        logAction(actor, 'CREATE_MATERIAL', { entity: 'material', id: docRef.id }, materialData);
    }
};

export const updateMaterial = (id: string, materialData: Partial<Omit<Material, 'id' | 'vehiculo'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, MATERIALS_COLLECTION, id);
    
    updateDoc(docRef, materialData).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: materialData,
        }));
    });

    if (actor) {
        logAction(actor, 'UPDATE_MATERIAL', { entity: 'material', id }, materialData);
    }
};

export const deleteMaterial = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, MATERIALS_COLLECTION, id);
    
    deleteDoc(docRef).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        }));
    });

    if (actor) {
        logAction(actor, 'DELETE_MATERIAL', { entity: 'material', id });
    }
};

export const batchAddMaterials = async (items: any[], actor: LoggedInUser): Promise<void> => {
    if (!db || !items || !actor) return;
    const batch = writeBatch(db);
    const colRef = collection(db, MATERIALS_COLLECTION);
    for (const item of items) {
        const docRef = doc(colRef);
        batch.set(docRef, item);
    }
    
    batch.commit().catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: colRef.path,
            operation: 'write',
        }));
    });
    
    logAction(actor, 'BATCH_IMPORT_MATERIALS', { entity: 'material', id: 'batch' }, { count: items.length });
};
