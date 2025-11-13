
'use server';

import { ClothingItem, Firefighter } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { cache } from 'react';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const clothingCollection = collection(db, 'clothing');

const getAllFirefightersCached = cache(async () => {
    const firefighters = await getFirefighters();
    return new Map(firefighters.map(f => [f.id, f]));
});

const docToClothingItem = async (
    docSnap: any, 
    firefighterMap: Map<string, Firefighter>
): Promise<ClothingItem> => {
    const data = docSnap.data();
    
    let firefighter: Firefighter | undefined = undefined;
    if (data.firefighterId) {
        firefighter = firefighterMap.get(data.firefighterId);
    }
    
    const item: ClothingItem = {
        id: docSnap.id,
        code: data.code,
        category: data.category,
        subCategory: data.subCategory,
        type: data.type,
        size: data.size,
        state: data.state,
        firefighterId: data.firefighterId,
        deliveredAt: data.deliveredAt,
        firefighter: firefighter,
    };
    return item;
}

export const getClothingItems = async (): Promise<ClothingItem[]> => {
    const q = query(clothingCollection, orderBy('code', 'asc'));
    const querySnapshot = await getDocs(q);

    const firefighterMap = await getAllFirefightersCached();
    
    const itemsPromises = querySnapshot.docs.map(doc => docToClothingItem(doc, firefighterMap));
    const items = await Promise.all(itemsPromises);

    return items;
}

export const addClothingItem = async (itemData: Omit<ClothingItem, 'id' | 'firefighter'>): Promise<string> => {
    const q = query(clothingCollection, where("code", "==", itemData.code));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error(`La prenda con el código ${itemData.code} ya existe.`);
    }

    const docRef = await addDoc(clothingCollection, itemData);
    return docRef.id;
};

export const updateClothingItem = async (id: string, itemData: Partial<Omit<ClothingItem, 'id' | 'firefighter'>>): Promise<void> => {
    const docRef = doc(db, 'clothing', id);

    if (itemData.code) {
        const q = query(clothingCollection, where("code", "==", itemData.code));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            throw new Error(`El código de prenda ${itemData.code} ya está en uso.`);
        }
    }
    
    await updateDoc(docRef, itemData);
};

export const deleteClothingItem = async (id: string): Promise<void> => {
    const docRef = doc(db, 'clothing', id);
    await deleteDoc(docRef);
};
