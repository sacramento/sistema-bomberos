'use client';

import { MaintenanceRecord, LoggedInUser, Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where, setDoc } from 'firebase/firestore';
import { parseISO } from 'date-fns';
import { logAction } from './audit.service';
import { getFirefighters } from './firefighters.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Retrieves all maintenance records for a specific vehicle, ordered by date descending.
 */
export const getMaintenanceRecordsByVehicle = async (vehicleId: string): Promise<MaintenanceRecord[]> => {
    if (!db) return [];
    const recordsCollection = collection(db, 'maintenance_records');
    const q = query(recordsCollection, where('vehicleId', '==', vehicleId));
    
    return getDocs(q)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            
            const records: MaintenanceRecord[] = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const assistants = (data.assistantIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
                return { id: docSnap.id, ...data, assistants } as MaintenanceRecord;
            });

            return records.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: recordsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Adds a new maintenance record.
 */
export const addMaintenanceRecord = (recordData: Omit<MaintenanceRecord, 'id' | 'assistants'>, actor: LoggedInUser) => {
    if (!db) return;
    const recordsCollection = collection(db, 'maintenance_records');
    const docRef = doc(recordsCollection);

    setDoc(docRef, recordData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: recordData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_MAINTENANCE_RECORD', { entity: 'maintenanceRecord', id: docRef.id }, { vehicleId: recordData.vehicleId });
    }
};

/**
 * Updates an existing maintenance record.
 */
export const updateMaintenanceRecord = (id: string, recordData: Partial<Omit<MaintenanceRecord, 'id' | 'assistants'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'maintenance_records', id);
    
    updateDoc(docRef, recordData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: recordData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_MAINTENANCE_RECORD', { entity: 'maintenanceRecord', id }, recordData);
    }
};

/**
 * Deletes a maintenance record.
 */
export const deleteMaintenanceRecord = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'maintenance_records', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_MAINTENANCE_RECORD', { entity: 'maintenanceRecord', id });
    }
};
