'use client';

import { RepairRecord, LoggedInUser, Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where, setDoc } from 'firebase/firestore';
import { parseISO } from 'date-fns';
import { logAction } from './audit.service';
import { getFirefighters } from './firefighters.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Retrieves all repair records for a specific vehicle, ordered by date descending.
 */
export const getRepairRecordsByVehicle = async (vehicleId: string): Promise<RepairRecord[]> => {
    if (!db) return [];
    const repairsCollection = collection(db, 'repair_records');
    const q = query(repairsCollection, where('vehicleId', '==', vehicleId));
    
    return getDocs(q)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            
            const records: RepairRecord[] = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const personnel = (data.personnelIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
                return { id: docSnap.id, ...data, personnel } as RepairRecord;
            });

            return records.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: repairsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Adds a new repair record.
 */
export const addRepairRecord = (recordData: Omit<RepairRecord, 'id' | 'personnel'>, actor: LoggedInUser) => {
    if (!db) return;
    const repairsCollection = collection(db, 'repair_records');
    const docRef = doc(repairsCollection);

    setDoc(docRef, recordData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: recordData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_REPAIR_RECORD', { entity: 'repairRecord', id: docRef.id }, { vehicleId: recordData.vehicleId });
    }
};

/**
 * Updates an existing repair record.
 */
export const updateRepairRecord = (id: string, recordData: Partial<Omit<RepairRecord, 'id' | 'personnel'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'repair_records', id);
    
    updateDoc(docRef, recordData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: recordData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_REPAIR_RECORD', { entity: 'repairRecord', id }, recordData);
    }
};

/**
 * Deletes a repair record.
 */
export const deleteRepairRecord = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'repair_records', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_REPAIR_RECORD', { entity: 'repairRecord', id });
    }
};
