
'use server';

import { MaintenanceRecord, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { parseISO } from 'date-fns';
import { logAction } from './audit.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const recordsCollection = collection(db, 'maintenance_records');

/**
 * Retrieves all maintenance records for a specific vehicle, ordered by date descending.
 * @param vehicleId The ID of the vehicle.
 */
export const getMaintenanceRecordsByVehicle = async (vehicleId: string): Promise<MaintenanceRecord[]> => {
    // Simple query by vehicleId, no complex ordering on the server side.
    const q = query(recordsCollection, where('vehicleId', '==', vehicleId));
    const querySnapshot = await getDocs(q);
    const records: MaintenanceRecord[] = [];
    querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as MaintenanceRecord);
    });

    // Sort the records on the client/server side after fetching.
    records.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

    return records;
};

/**
 * Adds a new maintenance record.
 */
export const addMaintenanceRecord = async (recordData: Omit<MaintenanceRecord, 'id'>, actor: LoggedInUser): Promise<string> => {
    const docRef = await addDoc(recordsCollection, recordData);
    await logAction(actor, 'CREATE_MAINTENANCE_RECORD', { entity: 'maintenanceRecord', id: docRef.id }, { vehicleId: recordData.vehicleId });
    return docRef.id;
};

/**
 * Updates an existing maintenance record.
 */
export const updateMaintenanceRecord = async (id: string, recordData: Partial<Omit<MaintenanceRecord, 'id'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'maintenance_records', id);
    await updateDoc(docRef, recordData);
    await logAction(actor, 'UPDATE_MAINTENANCE_RECORD', { entity: 'maintenanceRecord', id }, recordData);
};

/**
 * Deletes a maintenance record.
 */
export const deleteMaintenanceRecord = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'maintenance_records', id);
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_MAINTENANCE_RECORD', { entity: 'maintenanceRecord', id });
};
