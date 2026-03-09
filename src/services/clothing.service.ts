'use client';

import { ClothingItem, Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, writeBatch, where, setDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Retrieves all clothing items, ordered by code.
 */
export const getClothingItems = async (): Promise<ClothingItem[]> => {
    if (!db) return [];
    const clothingCollection = collection(db, 'clothing');
    const q = query(clothingCollection, orderBy('code', 'asc'));
    
    return getDocs(q)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            
            const items: ClothingItem[] = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    firefighter: data.firefighterId ? firefighterMap.get(data.firefighterId) : undefined,
                } as ClothingItem;
            });
            return items;
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: clothingCollection.path,
                operation: 'list',
            }));
            return [];
        });
};

/**
 * Adds a new clothing item.
 */
export const addClothingItem = (itemData: Omit<ClothingItem, 'id' | 'firefighter'>, actor: LoggedInUser) => {
    if (!db) return;
    const clothingCollection = collection(db, 'clothing');
    const docRef = doc(clothingCollection);

    setDoc(docRef, itemData).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: itemData,
        }));
    });

    if (actor) {
        logAction(actor, 'CREATE_CLOTHING_ITEM', { entity: 'clothingItem', id: docRef.id }, itemData);
    }
};

/**
 * Updates an existing clothing item.
 */
export const updateClothingItem = (id: string, itemData: Partial<Omit<ClothingItem, 'id' | 'firefighter'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'clothing', id);
    
    updateDoc(docRef, itemData).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: itemData,
        }));
    });

    if (actor) {
        logAction(actor, 'UPDATE_CLOTHING_ITEM', { entity: 'clothingItem', id }, itemData);
    }
};

/**
 * Deletes a clothing item.
 */
export const deleteClothingItem = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'clothing', id);
    
    deleteDoc(docRef).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        }));
    });

    if (actor) {
        logAction(actor, 'DELETE_CLOTHING_ITEM', { entity: 'clothingItem', id });
    }
};

/**
 * Batch adds clothing items from CSV.
 */
export const batchAddClothingItems = async (items: any[], actor: LoggedInUser) => {
    if (!db || !items || items.length === 0) return;
    const batch = writeBatch(db);
    const clothingCollection = collection(db, 'clothing');

    items.forEach(item => {
        const docRef = doc(clothingCollection);
        batch.set(docRef, item);
    });

    batch.commit().catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: clothingCollection.path,
            operation: 'write',
        }));
    });

    if (actor) {
        logAction(actor, 'BATCH_IMPORT_CLOTHING', { entity: 'clothingItem', id: 'batch' }, { count: items.length });
    }
};
