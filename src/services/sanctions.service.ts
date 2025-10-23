
'use server';

import { Sanction } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { parseISO } from 'date-fns';

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

export const addSanction = async (sanctionData: Omit<Sanction, 'id'>): Promise<string> => {
    const docRef = await addDoc(sanctionsCollection, sanctionData);
    return docRef.id;
};

export const updateSanction = async (id: string, sanctionData: Partial<Omit<Sanction, 'id' | 'firefighterId' | 'firefighterName'>>): Promise<void> => {
    const docRef = doc(db, 'sanctions', id);
    await updateDoc(docRef, sanctionData);
};

export const deleteSanction = async (id: string): Promise<void> => {
    const docRef = doc(db, 'sanctions', id);
    await deleteDoc(docRef);
};
