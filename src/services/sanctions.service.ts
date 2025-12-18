
'use server';

import { Sanction, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { parseISO } from 'date-fns';
import { logAction } from './audit.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const sanctionsCollection = collection(db, 'sanctions');

export const getSanctions = async (): Promise<Sanction[]> => {
    const querySnapshot = await getDocs(query(sanctionsCollection));
    const sanctions: Sanction[] = [];
    querySnapshot.forEach((doc) => {
        sanctions.push({ id: doc.id, ...doc.data() } as Sanction);
    });
    return sanctions.sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime());
};

export const addSanction = async (sanctionData: Omit<Sanction, 'id'>, actor: LoggedInUser): Promise<string> => {
    const docRef = await addDoc(sanctionsCollection, sanctionData);
    await logAction(actor, 'CREATE_SANCTION', { entity: 'sanction', id: docRef.id }, sanctionData);
    return docRef.id;
};

export const updateSanction = async (id: string, sanctionData: Partial<Omit<Sanction, 'id' | 'firefighterId' | 'firefighterName'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'sanctions', id);
    await updateDoc(docRef, sanctionData);
    await logAction(actor, 'UPDATE_SANCTION', { entity: 'sanction', id }, sanctionData);
};

export const deleteSanction = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'sanctions', id);
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_SANCTION', { entity: 'sanction', id });
};
