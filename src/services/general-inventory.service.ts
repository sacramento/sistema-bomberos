
'use client';

import { GeneralInventoryItem, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const cleanData = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, v === Object(v) && !Array.isArray(v) ? cleanData(v) : v])
    );
};

/**
 * Retrieves all general inventory items.
 */
export const getGeneralInventory = async (): Promise<GeneralInventoryItem[]> => {
    if (!db) return [];
    const inventoryCollection = collection(db, 'general_inventory');
    const q = query(inventoryCollection, orderBy('nombre', 'asc'));
    
    return getDocs(q)
        .then((querySnapshot) => {
            const items: GeneralInventoryItem[] = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as GeneralInventoryItem);
            });
            return items;
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: inventoryCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Gets next sequence for auto code generation.
 */
export const getNextInventorySequence = async (prefix: string): Promise<number> => {
    if (!db) return 1;
    const colRef = collection(db, 'general_inventory');
    
    return getDocs(colRef).then(snapshot => {
        const matchingCodes = snapshot.docs
            .map(d => d.data().codigo as string)
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
 * Adds a new general inventory item.
 */
export const addGeneralInventoryItem = (itemData: Omit<GeneralInventoryItem, 'id'>, actor: LoggedInUser) => {
    if (!db) return;
    const inventoryCollection = collection(db, 'general_inventory');
    const docRef = doc(inventoryCollection);
    const cleaned = cleanData(itemData);

    setDoc(docRef, cleaned).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: cleaned,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_GENERAL_INVENTORY_ITEM', { entity: 'generalInventoryItem', id: docRef.id }, cleaned);
    }
};

/**
 * Updates an existing general inventory item.
 */
export const updateGeneralInventoryItem = (id: string, itemData: Partial<Omit<GeneralInventoryItem, 'id'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'general_inventory', id);
    const cleaned = cleanData(itemData);
    
    updateDoc(docRef, cleaned).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: cleaned,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_GENERAL_INVENTORY_ITEM', { entity: 'generalInventoryItem', id }, cleaned);
    }
};

/**
 * Deletes a general inventory item.
 */
export const deleteGeneralInventoryItem = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'general_inventory', id);
    
    deleteDoc(docRef).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        }));
    });

    if (actor) {
        logAction(actor, 'DELETE_GENERAL_INVENTORY_ITEM', { entity: 'generalInventoryItem', id });
    }
};
