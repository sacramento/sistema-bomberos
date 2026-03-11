
'use client';

import { Driver, Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const cleanData = (obj: any) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
    );
};

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
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: colRef.path,
                operation: 'list',
            }));
            return [];
        });
};

export const addDriver = (driverData: Omit<Driver, 'id' | 'firefighter'>, actor: LoggedInUser) => {
    if (!db) return;
    const colRef = collection(db, 'drivers');
    const docRef = doc(colRef);
    const cleaned = cleanData(driverData);

    setDoc(docRef, cleaned)
        .then(() => {
            if (actor) {
                logAction(actor, 'CREATE_DRIVER', { entity: 'driver', id: docRef.id }, cleaned);
            }
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: cleaned,
            }));
        });
};

export const updateDriver = (id: string, driverData: Partial<Omit<Driver, 'id' | 'firefighter' | 'firefighterId'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'drivers', id);
    const cleaned = cleanData(driverData);
    
    updateDoc(docRef, cleaned)
        .then(() => {
            if (actor) {
                logAction(actor, 'UPDATE_DRIVER', { entity: 'driver', id }, cleaned);
            }
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: cleaned,
            }));
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
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            }));
        });
};
