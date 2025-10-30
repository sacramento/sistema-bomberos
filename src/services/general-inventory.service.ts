
'use server';

import { GeneralInventoryItem } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, where } from 'firebase/firestore';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const inventoryCollection = collection(db, 'general_inventory');

export const getGeneralInventory = async (): Promise<GeneralInventoryItem[]> => {
    const q = query(inventoryCollection, orderBy('nombre', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const items: GeneralInventoryItem[] = [];
    querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as GeneralInventoryItem);
    });

    return items;
}

export const addGeneralInventoryItem = async (itemData: Omit<GeneralInventoryItem, 'id'>): Promise<string> => {
    const q = query(inventoryCollection, where("codigo", "==", itemData.codigo));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error(`El ítem con el código ${itemData.codigo} ya existe.`);
    }

    const docRef = await addDoc(inventoryCollection, itemData);
    return docRef.id;
};

export const updateGeneralInventoryItem = async (id: string, itemData: Partial<Omit<GeneralInventoryItem, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'general_inventory', id);

    if (itemData.codigo) {
        const q = query(inventoryCollection, where("codigo", "==", itemData.codigo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            throw new Error(`El código de ítem ${itemData.codigo} ya está en uso.`);
        }
    }
    
    await updateDoc(docRef, itemData);
};

export const deleteGeneralInventoryItem = async (id: string): Promise<void> => {
    const docRef = doc(db, 'general_inventory', id);
    await deleteDoc(docRef);
};
