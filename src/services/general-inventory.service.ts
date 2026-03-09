'use client';

import { GeneralInventoryItem, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
 * Adds a new general inventory item.
 */
export const addGeneralInventoryItem = (itemData: Omit<GeneralInventoryItem, 'id'>, actor: LoggedInUser) => {
    if (!db) return;
    const inventoryCollection = collection(db, 'general_inventory');
    const docRef = doc(inventoryCollection);

    setDoc(docRef, itemData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: itemData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_GENERAL_INVENTORY_ITEM', { entity: 'generalInventoryItem', id: docRef.id }, itemData);
    }
};

/**
 * Updates an existing general inventory item.
 */
export const updateGeneralInventoryItem = (id: string, itemData: Partial<Omit<GeneralInventoryItem, 'id'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'general_inventory', id);
    
    updateDoc(docRef, itemData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: itemData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_GENERAL_INVENTORY_ITEM', { entity: 'generalInventoryItem', id }, itemData);
    }
};

/**
 * Deletes a general inventory item.
 */
export const deleteGeneralInventoryItem = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'general_inventory', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_GENERAL_INVENTORY_ITEM', { entity: 'generalInventoryItem', id });
    }
};
