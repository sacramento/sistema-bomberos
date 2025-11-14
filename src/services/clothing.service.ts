
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

const getAllFirefightersByLegajoCached = cache(async () => {
    const firefighters = await getFirefighters();
    return new Map(firefighters.map(f => [f.legajo, f]));
});

const docToClothingItem = async (
    docSnap: any, 
    firefighterMap: Map<string, Firefighter>
): Promise<ClothingItem> => {
    const data = docSnap.data();
    
    const firefighter: Firefighter | undefined = data.firefighterId 
        ? firefighterMap.get(data.firefighterId) 
        : undefined;
    
    const item: ClothingItem = {
        id: docSnap.id,
        code: data.code,
        category: data.category,
        subCategory: data.subCategory,
        type: data.type,
        size: data.size,
        brand: data.brand,
        model: data.model,
        observations: data.observations,
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
    
    // Ensure optional fields that are empty strings are saved as undefined
    const dataToSave: any = { ...itemData };
    for (const key in dataToSave) {
        if (dataToSave[key as keyof typeof dataToSave] === '') {
            dataToSave[key as keyof typeof dataToSave] = undefined;
        }
    }
    
    // If no firefighter is assigned, ensure fighterId is not present
    if (!itemData.firefighterId) {
        delete dataToSave.firefighterId;
    }


    const docRef = await addDoc(clothingCollection, dataToSave);
    return docRef.id;
};

export const batchAddClothingItems = async (items: (Omit<ClothingItem, 'id' | 'firefighter' | 'firefighterId'> & { firefighterLegajo?: string })[]): Promise<void> => {
    if (!items || items.length === 0) {
        return;
    }

    const batch = writeBatch(db);
    const firefighterMap = await getAllFirefightersByLegajoCached();
    const existingCodesQuery = await getDocs(query(clothingCollection));
    const existingCodes = new Set(existingCodesQuery.docs.map(doc => doc.data().code));
    
    for (const item of items) {
        if (existingCodes.has(item.code)) {
            console.warn(`Skipping item with duplicate code: ${item.code}`);
            continue; // Skip this item
        }

        const newDocRef = doc(collection(db, 'clothing'));
        const { firefighterLegajo, ...itemData } = item;
        const dataToSave: any = { ...itemData };

        if (firefighterLegajo) {
            const firefighter = firefighterMap.get(firefighterLegajo);
            if (firefighter) {
                dataToSave.firefighterId = firefighter.id;
                dataToSave.deliveredAt = new Date().toISOString();
            } else {
                console.warn(`Firefighter with legajo "${firefighterLegajo}" not found. Item "${item.code}" will be in storage.`);
            }
        }
        
        batch.set(newDocRef, dataToSave);
        existingCodes.add(item.code); // Add to set to prevent duplicates within the same batch
    }

    await batch.commit();
}


export const updateClothingItem = async (id: string, itemData: Partial<Omit<ClothingItem, 'id' | 'firefighter'>>): Promise<void> => {
    const docRef = doc(db, 'clothing', id);

    if (itemData.code) {
        const q = query(clothingCollection, where("code", "==", itemData.code));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            throw new Error(`El código de prenda ${itemData.code} ya está en uso.`);
        }
    }
    
    // Ensure optional fields that are empty strings are saved as undefined
    const dataToUpdate: any = { ...itemData };
     for (const key in dataToUpdate) {
        if (dataToUpdate[key as keyof typeof dataToUpdate] === '') {
            dataToUpdate[key as keyof typeof dataToUpdate] = undefined;
        }
    }
    
     if (!itemData.firefighterId) {
        dataToUpdate.firefighterId = null;
    }

    await updateDoc(docRef, dataToUpdate);
};

export const deleteClothingItem = async (id: string): Promise<void> => {
    const docRef = doc(db, 'clothing', id);
    await deleteDoc(docRef);
};
