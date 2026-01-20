
'use server';

import { RepairRecord, LoggedInUser, Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, where, orderBy, getDoc } from 'firebase/firestore';
import { parseISO } from 'date-fns';
import { logAction } from './audit.service';
import { getFirefighters } from './firefighters.service';
import { cache } from 'react';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const repairsCollection = collection(db, 'repair_records');

const getAllFirefightersCached = cache(async () => {
    const firefighters = await getFirefighters();
    return new Map(firefighters.map(f => [f.id, f]));
});

const docToRepairRecord = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<RepairRecord> => {
    const data = docSnap.data();
    const personnel = (data.personnelIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
    
    return {
        id: docSnap.id,
        ...data,
        personnel,
    } as RepairRecord;
};

/**
 * Retrieves all repair records for a specific vehicle, ordered by date descending.
 * @param vehicleId The ID of the vehicle.
 */
export const getRepairRecordsByVehicle = async (vehicleId: string): Promise<RepairRecord[]> => {
    const q = query(repairsCollection, where('vehicleId', '==', vehicleId));
    const querySnapshot = await getDocs(q);
    const firefighterMap = await getAllFirefightersCached();
    
    const recordsPromises = querySnapshot.docs.map(doc => docToRepairRecord(doc, firefighterMap));
    let records = await Promise.all(recordsPromises);

    records.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

    return records;
};

/**
 * Adds a new repair record.
 */
export const addRepairRecord = async (recordData: Omit<RepairRecord, 'id' | 'personnel'>, actor: LoggedInUser): Promise<string> => {
    const docRef = await addDoc(repairsCollection, recordData);
    await logAction(actor, 'CREATE_REPAIR_RECORD', { entity: 'repairRecord', id: docRef.id }, { vehicleId: recordData.vehicleId });
    return docRef.id;
};

/**
 * Updates an existing repair record.
 */
export const updateRepairRecord = async (id: string, recordData: Partial<Omit<RepairRecord, 'id' | 'personnel'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'repair_records', id);
    await updateDoc(docRef, recordData);
    await logAction(actor, 'UPDATE_REPAIR_RECORD', { entity: 'repairRecord', id }, recordData);
};

/**
 * Deletes a repair record.
 */
export const deleteRepairRecord = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'repair_records', id);
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_REPAIR_RECORD', { entity: 'repairRecord', id });
};
