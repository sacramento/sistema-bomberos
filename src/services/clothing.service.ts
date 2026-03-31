
'use client';

import { ClothingItem, Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, writeBatch, where, setDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const cleanData = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (obj instanceof Date || obj.constructor?.name === 'Timestamp' || obj.constructor?.name === 'FieldValue' || obj._methodName) {
        return obj;
    }
    if (Array.isArray(obj)) return obj.map(cleanData);
    
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
            cleaned[key] = cleanData(value);
        }
    }
    return cleaned;
};

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
 * Gets next sequence for auto code generation in clothing.
 */
export const getNextClothingSequence = async (prefix: string): Promise<number> => {
    if (!db) return 1;
    const colRef = collection(db, 'clothing');
    
    return getDocs(colRef).then(snapshot => {
        const matchingCodes = snapshot.docs
            .map(d => d.data().code as string)
            .filter(code => code && code.startsWith(prefix));
        
        if (matchingCodes.length === 0) return 1;
        
        const sequences = matchingCodes.map(code => {
            const seqStr = code.replace(prefix, '');
            return parseInt(seqStr, 10) || 0;
        });
        
        return Math.max(...sequences) + 1;
    }).catch(() => 1);
};

/**
 * Adds a new clothing item.
 */
export const addClothingItem = (itemData: Omit<ClothingItem, 'id' | 'firefighter'>, actor: LoggedInUser) => {
    if (!db) return;
    const clothingCollection = collection(db, 'clothing');
    const docRef = doc(clothingCollection);
    const cleaned = cleanData(itemData);

    setDoc(docRef, cleaned).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: cleaned,
        }));
    });

    if (actor) {
        logAction(actor, 'CREATE_CLOTHING_ITEM', { entity: 'clothingItem', id: docRef.id }, cleaned);
    }
};

/**
 * Updates an existing clothing item.
 */
export const updateClothingItem = (id: string, itemData: Partial<Omit<ClothingItem, 'id' | 'firefighter'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'clothing', id);
    const cleaned = cleanData(itemData);
    
    updateDoc(docRef, cleaned).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: cleaned,
        }));
    });

    if (actor) {
        logAction(actor, 'UPDATE_CLOTHING_ITEM', { entity: 'clothingItem', id }, cleaned);
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
        batch.set(docRef, cleanData(item));
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
