
'use server';

import { SparePart, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { logAction } from './audit.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const sparePartsCollection = collection(db, 'spare_parts');

export const getSparePartsByVehicle = async (vehicleId: string): Promise<SparePart[]> => {
    const q = query(sparePartsCollection, where('vehicleId', '==', vehicleId), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    const parts: SparePart[] = [];
    querySnapshot.forEach((doc) => {
        parts.push({ id: doc.id, ...doc.data() } as SparePart);
    });
    return parts;
};

export const addSparePart = async (partData: Omit<SparePart, 'id'>): Promise<string> => {
    const docRef = await addDoc(sparePartsCollection, partData);
    await logAction({} as LoggedInUser, 'CREATE_SPARE_PART', { entity: 'sparePart', id: docRef.id }, partData);
    return docRef.id;
};

export const updateSparePart = async (id: string, partData: Partial<Omit<SparePart, 'id' | 'vehicleId'>>): Promise<void> => {
    const docRef = doc(db, 'spare_parts', id);
    await updateDoc(docRef, partData);
    await logAction({} as LoggedInUser, 'UPDATE_SPARE_PART', { entity: 'sparePart', id }, partData);
};

export const deleteSparePart = async (id: string): Promise<void> => {
    const docRef = doc(db, 'spare_parts', id);
    await deleteDoc(docRef);
    await logAction({} as LoggedInUser, 'DELETE_SPARE_PART', { entity: 'sparePart', id });
};
