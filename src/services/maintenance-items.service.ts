'use client';

import { MaintenanceItem, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Retrieves all maintenance checklist items, ordered by name.
 */
export const getMaintenanceItems = async (): Promise<MaintenanceItem[]> => {
    if (!db) return [];
    const itemsCollection = collection(db, 'maintenance_items');
    const q = query(itemsCollection, orderBy('name', 'asc'));
    
    return getDocs(q)
        .then((querySnapshot) => {
            const items: MaintenanceItem[] = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as MaintenanceItem);
            });
            return items;
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: itemsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Adds a new maintenance checklist item.
 */
export const addMaintenanceItem = (itemData: Omit<MaintenanceItem, 'id'>, actor: LoggedInUser) => {
    if (!db) return;
    const itemsCollection = collection(db, 'maintenance_items');
    const docRef = doc(itemsCollection);

    setDoc(docRef, itemData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: itemData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_MAINTENANCE_ITEM', { entity: 'maintenanceItem', id: docRef.id }, itemData);
    }
};

/**
 * Updates an existing maintenance checklist item.
 */
export const updateMaintenanceItem = (id: string, itemData: Partial<Omit<MaintenanceItem, 'id'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'maintenance_items', id);
    
    updateDoc(docRef, itemData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: itemData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_MAINTENANCE_ITEM', { entity: 'maintenanceItem', id }, itemData);
    }
};

/**
 * Deletes a maintenance checklist item.
 */
export const deleteMaintenanceItem = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'maintenance_items', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_MAINTENANCE_ITEM', { entity: 'maintenanceItem', id });
    }
};
