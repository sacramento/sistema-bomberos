'use client';

import { Driver, Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Obtiene todos los choferes.
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
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

export const addDriver = (driverData: Omit<Driver, 'id' | 'firefighter'>, actor: LoggedInUser) => {
    if (!db) return;
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
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
};

export const updateDriver = (id: string, driverData: Partial<Omit<Driver, 'id' | 'firefighter' | 'firefighterId'>>, actor: LoggedInUser) => {
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
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
};

export const deleteDriver = (id: string, actor: LoggedInUser) => {
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
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
};