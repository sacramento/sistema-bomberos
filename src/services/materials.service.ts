'use client';

import { Material, Vehicle, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, updateDoc, deleteDoc, writeBatch, setDoc, query, where } from 'firebase/firestore';
import { getVehicles } from './vehicles.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const MATERIALS_COLLECTION = 'materials';

const cleanData = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, v === Object(v) && !Array.isArray(v) ? cleanData(v) : v])
    );
};

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
                    ...data,
                    vehiculo: vehiculo,
                } as Material;
            });
            
            return results.sort((a, b) => {
                const codeA = a.codigo || '';
                const codeB = b.codigo || '';
                if (!codeA && !codeB) return (a.nombre || '').localeCompare(b.nombre || '');
                if (!codeA) return 1;
                if (!codeB) return -1;
                return codeA.localeCompare(codeB, undefined, { numeric: true });
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
    const cleaned = cleanData(materialData);
    
    setDoc(docRef, cleaned).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: cleaned,
        }));
    });

    if (actor) {
        logAction(actor, 'CREATE_MATERIAL', { entity: 'material', id: docRef.id }, cleaned);
    }
};

export const updateMaterial = (id: string, materialData: Partial<Omit<Material, 'id' | 'vehiculo'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, MATERIALS_COLLECTION, id);
    const cleaned = cleanData(materialData);
    
    updateDoc(docRef, cleaned).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: cleaned,
        }));
    });

    if (actor) {
        logAction(actor, 'UPDATE_MATERIAL', { entity: 'material', id }, cleaned);
    }
};

export const deleteMaterial = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, MATERIALS_COLLECTION, id);
    
    deleteDoc(docRef).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        }));
    });

    if (actor) {
        logAction(actor, 'DELETE_MATERIAL', { entity: 'material', id });
    }
};

export const batchAddMaterials = async (items: any[], actor: LoggedInUser) => {
    if (!db || !items || !actor) return;
    const batch = writeBatch(db);
    const colRef = collection(db, MATERIALS_COLLECTION);
    
    items.forEach(item => {
        const docRef = doc(colRef);
        batch.set(docRef, cleanData(item));
    });
    
    batch.commit().catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: colRef.path,
            operation: 'write',
        }));
    });
    
    logAction(actor, 'BATCH_IMPORT_MATERIALS', { entity: 'material', id: 'batch' }, { count: items.length });
};