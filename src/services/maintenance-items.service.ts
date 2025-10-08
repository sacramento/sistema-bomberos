
'use server';

import { MaintenanceItem } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const itemsCollection = collection(db, 'maintenance_items');

/**
 * Retrieves all maintenance checklist items, ordered by name.
 */
export const getMaintenanceItems = async (): Promise<MaintenanceItem[]> => {
    const q = query(itemsCollection, orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    const items: MaintenanceItem[] = [];
    querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as MaintenanceItem);
    });
    return items;
};

/**
 * Adds a new maintenance checklist item.
 */
export const addMaintenanceItem = async (itemData: Omit<MaintenanceItem, 'id'>): Promise<string> => {
    const docRef = await addDoc(itemsCollection, itemData);
    return docRef.id;
};

/**
 * Updates an existing maintenance checklist item.
 */
export const updateMaintenanceItem = async (id: string, itemData: Partial<Omit<MaintenanceItem, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'maintenance_items', id);
    await updateDoc(docRef, itemData);
};

/**
 * Deletes a maintenance checklist item.
 */
export const deleteMaintenanceItem = async (id: string): Promise<void> => {
    const docRef = doc(db, 'maintenance_items', id);
    await deleteDoc(docRef);
};
