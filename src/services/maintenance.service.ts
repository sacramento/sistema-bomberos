
'use server';

import { MaintenanceRecord } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const recordsCollection = collection(db, 'maintenance_records');

/**
 * Retrieves all maintenance records for a specific vehicle, ordered by date descending.
 * @param vehicleId The ID of the vehicle.
 */
export const getMaintenanceRecordsByVehicle = async (vehicleId: string): Promise<MaintenanceRecord[]> => {
    const q = query(recordsCollection, where('vehicleId', '==', vehicleId), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const records: MaintenanceRecord[] = [];
    querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as MaintenanceRecord);
    });
    return records;
};

/**
 * Adds a new maintenance record.
 */
export const addMaintenanceRecord = async (recordData: Omit<MaintenanceRecord, 'id'>): Promise<string> => {
    const docRef = await addDoc(recordsCollection, recordData);
    return docRef.id;
};

/**
 * Updates an existing maintenance record.
 */
export const updateMaintenanceRecord = async (id: string, recordData: Partial<Omit<MaintenanceRecord, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'maintenance_records', id);
    await updateDoc(docRef, recordData);
};

/**
 * Deletes a maintenance record.
 */
export const deleteMaintenanceRecord = async (id: string): Promise<void> => {
    const docRef = doc(db, 'maintenance_records', id);
    await deleteDoc(docRef);
};

    