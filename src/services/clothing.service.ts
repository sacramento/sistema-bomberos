
'use server';

import { ClothingItem, Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { cache } from 'react';
import { logAction } from './audit.service';

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

export const addClothingItem = async (itemData: Omit<ClothingItem, 'id' | 'firefighter'>, actor: LoggedInUser): Promise<string> => {
    const q = query(clothingCollection, where("code", "==", itemData.code));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error(`La prenda con el código ${itemData.code} ya existe.`);
    }
    
    const dataToSave: any = { ...itemData };
    for (const key in dataToSave) {
        if (dataToSave[key as keyof typeof dataToSave] === '') {
            dataToSave[key as keyof typeof dataToSave] = undefined;
        }
    }
    
    if (!itemData.firefighterId) {
        delete dataToSave.firefighterId;
    }


    const docRef = await addDoc(clothingCollection, dataToSave);
    await logAction(actor, 'CREATE_CLOTHING_ITEM', { entity: 'clothingItem', id: docRef.id }, dataToSave);
    return docRef.id;
};

type ClothingImportRow = {
    codigo: string;
    categoria: string;
    subcategoria: string;
    tipo: string;
    talle: string;
    estado: string;
    marca?: string;
    modelo?: string;
    observaciones?: string;
    legajo_bombero?: string;
}

export const batchAddClothingItems = async (items: ClothingImportRow[], actor: LoggedInUser): Promise<void> => {
    if (!items || items.length === 0) {
        return;
    }

    const batch = writeBatch(db);
    const firefighterMap = await getAllFirefightersByLegajoCached();
    const existingCodesQuery = await getDocs(query(clothingCollection));
    const existingCodes = new Set(existingCodesQuery.docs.map(doc => doc.data().code));
    
    for (const row of items) {
        if (existingCodes.has(row.codigo)) {
            console.warn(`Skipping item with duplicate code: ${row.codigo}`);
            continue;
        }

        const newDocRef = doc(collection(db, 'clothing'));
        
        const dataToSave: Partial<Omit<ClothingItem, 'id' | 'firefighter'>> = {
            code: row.codigo,
            category: row.categoria as any,
            subCategory: row.subcategoria as any,
            type: row.tipo as any,
            size: row.talle,
            state: row.estado as any,
            brand: row.marca || undefined,
            model: row.modelo || undefined,
            observations: row.observaciones || undefined
        };

        if (row.legajo_bombero) {
            const firefighter = firefighterMap.get(row.legajo_bombero);
            if (firefighter) {
                dataToSave.firefighterId = firefighter.id;
                dataToSave.deliveredAt = new Date().toISOString();
            } else {
                console.warn(`Firefighter with legajo "${row.legajo_bombero}" not found. Item "${row.codigo}" will be in storage.`);
            }
        }
        
        batch.set(newDocRef, dataToSave);
        existingCodes.add(row.codigo);
    }

    await batch.commit();
    await logAction(actor, 'BATCH_IMPORT_CLOTHING', { entity: 'clothingItem', id: 'batch' }, { count: items.length });
}


export const updateClothingItem = async (id: string, itemData: Partial<Omit<ClothingItem, 'id' | 'firefighter'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'clothing', id);

    if (itemData.code) {
        const q = query(clothingCollection, where("code", "==", itemData.code));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            throw new Error(`El código de prenda ${itemData.code} ya está en uso.`);
        }
    }
    
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
    await logAction(actor, 'UPDATE_CLOTHING_ITEM', { entity: 'clothingItem', id }, dataToUpdate);
};

export const deleteClothingItem = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'clothing', id);
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_CLOTHING_ITEM', { entity: 'clothingItem', id });
};
