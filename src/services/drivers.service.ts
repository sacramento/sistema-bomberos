'use client';

import { Driver, Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Obtiene todos los choferes. Sin orderBy en el servidor para evitar ocultar registros.
 */
export const getDrivers = async (): Promise<Driver[]> => {
    if (!db) return [];
    const colRef = collection(db, 'drivers');

    return getDocs(colRef)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            
            const drivers: Driver[] = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const firefighter = firefighterMap.get(data.firefighterId);
                return {
                    id: docSnap.id,
                    firefighterId: data.firefighterId,
                    habilitaciones: data.habilitaciones || [],
                    firefighter,
                } as Driver;
            });
            
            // Ordenamos por apellido en memoria
            return drivers.sort((a, b) => {
                const nameA = a.firefighter?.lastName || '';
                const nameB = b.firefighter?.lastName || '';
                return nameA.localeCompare(nameB);
            });
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: colRef.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

export const addDriver = async (driverData: Omit<Driver, 'id' | 'firefighter'>, actor: LoggedInUser): Promise<string> => {
    if (!db) throw new Error("Database not initialized");
    const colRef = collection(db, 'drivers');
    const docRef = doc(colRef);

    setDoc(docRef, driverData)
        .then(() => {
            if (actor) {
                logAction(actor, 'CREATE_DRIVER', { entity: 'driver', id: docRef.id }, driverData);
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: driverData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

    return docRef.id;
};

export const updateDriver = async (id: string, driverData: Partial<Omit<Driver, 'id' | 'firefighter' | 'firefighterId'>>, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'drivers', id);
    
    updateDoc(docRef, driverData)
        .then(() => {
            if (actor) {
                logAction(actor, 'UPDATE_DRIVER', { entity: 'driver', id }, driverData);
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: driverData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};

export const deleteDriver = async (id: string, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'drivers', id);
    
    deleteDoc(docRef)
        .then(() => {
            if (actor) {
                logAction(actor, 'DELETE_DRIVER', { entity: 'driver', id });
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
