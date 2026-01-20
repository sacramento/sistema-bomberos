
'use server';

import { MaintenanceRecord, LoggedInUser, Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, where, orderBy, getDoc } from 'firebase/firestore';
import { parseISO } from 'date-fns';
import { logAction } from './audit.service';
import { getFirefighters } from './firefighters.service';
import { cache } from 'react';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const recordsCollection = collection(db, 'maintenance_records');

const getAllFirefightersCached = cache(async () => {
    const firefighters = await getFirefighters();
    return new Map(firefighters.map(f => [f.id, f]));
});

const docToMaintenanceRecord = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<MaintenanceRecord> => {
    const data = docSnap.data();
    const assistants = (data.assistantIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];

    return {
        id: docSnap.id,
        ...data,
        assistants,
    } as MaintenanceRecord;
};


/**
 * Retrieves all maintenance records for a specific vehicle, ordered by date descending.
 * @param vehicleId The ID of the vehicle.
 */
export const getMaintenanceRecordsByVehicle = async (vehicleId: string): Promise<MaintenanceRecord[]> => {
    const q = query(recordsCollection, where('vehicleId', '==', vehicleId));
    const querySnapshot = await getDocs(q);
    const firefighterMap = await getAllFirefightersCached();
    
    const recordsPromises = querySnapshot.docs.map(doc => docToMaintenanceRecord(doc, firefighterMap));
    let records = await Promise.all(recordsPromises);

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
