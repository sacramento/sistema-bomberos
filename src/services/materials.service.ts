'use client';

import { Material, Vehicle, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, query, doc, updateDoc, deleteDoc, writeBatch, where, setDoc } from 'firebase/firestore';
import { getVehicles } from './vehicles.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Obtiene todos los materiales.
 * Se elimina el orderBy del servidor para evitar ocultar documentos sin código
 * y para prevenir errores de permisos si el índice no está listo.
 */
export const getMaterials = async (): Promise<Material[]> => {
    if (!db) return [];
    
    const materialsCollection = collection(db, 'materials');
    
    return getDocs(materialsCollection)
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
            
            // Ordenamiento en memoria para mayor fiabilidad
            return results.sort((a, b) => {
                if (!a.codigo && !b.codigo) return a.nombre.localeCompare(b.nombre);
                if (!a.codigo) return 1;
                if (!b.codigo) return -1;
                return a.codigo.localeCompare(b.codigo, undefined, { numeric: true });
            });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: materialsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
}

export const getNextMaterialSequence = async (prefix: string): Promise<number> => {
    if (!db) return 1;
    const materialsCollection = collection(db, 'materials');
    const q = query(materialsCollection, where("codigo", ">=", prefix), where("codigo", "<=", prefix + '\uf8ff'));
    
    return getDocs(q)
        .then(querySnapshot => {
            let maxNum = 0;
            querySnapshot.forEach(docSnap => {
                const code = docSnap.data().codigo as string;
                const numPart = code.substring(prefix.length);
                const num = parseInt(numPart);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            });
            return maxNum + 1;
        })
        .catch(async () => {
            return 1;
        });
};

export const addMaterial = async (materialData: Omit<Material, 'id' | 'vehiculo'>, actor: LoggedInUser): Promise<string> => {
    if (!db) throw new Error("Database not initialized");
    const materialsCollection = collection(db, 'materials');
    const docRef = doc(materialsCollection);
    
    return setDoc(docRef, materialData)
        .then(() => {
            if (actor) {
                logAction(actor, 'CREATE_MATERIAL', { entity: 'material', id: docRef.id }, materialData);
            }
            return docRef.id;
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: materialData,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });
};

export const updateMaterial = async (id: string, materialData: Partial<Omit<Material, 'id' | 'vehiculo'>>, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'materials', id);
    
    return updateDoc(docRef, materialData)
        .then(() => {
            if (actor) {
                logAction(actor, 'UPDATE_MATERIAL', { entity: 'material', id }, materialData);
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: materialData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};

export const deleteMaterial = async (id: string, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'materials', id);
    
    return deleteDoc(docRef)
        .then(() => {
            if (actor) {
                logAction(actor, 'DELETE_MATERIAL', { entity: 'material', id });
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};

export const batchAddMaterials = async (items: any[], actor: LoggedInUser): Promise<void> => {
    if (!db || !items || !actor) return;
    const batch = writeBatch(db);
    const materialsCollection = collection(db, 'materials');
    for (const item of items) {
        const docRef = doc(materialsCollection);
        batch.set(docRef, item);
    }
    
    return batch.commit()
        .then(() => {
            logAction(actor, 'BATCH_IMPORT_MATERIALS', { entity: 'material', id: 'batch' }, { count: items.length });
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: materialsCollection.path,
                operation: 'write',
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};
