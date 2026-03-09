'use client';

import { SparePart, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where, setDoc } from 'firebase/firestore';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

/**
 * Retrieves all spare parts for a specific vehicle.
 */
export const getSparePartsByVehicle = async (vehicleId: string): Promise<SparePart[]> => {
    if (!db) return [];
    const sparePartsCollection = collection(db, 'spare_parts');
    const q = query(sparePartsCollection, where('vehicleId', '==', vehicleId));
    
    return getDocs(q)
        .then((querySnapshot) => {
            const parts: SparePart[] = [];
            querySnapshot.forEach((doc) => {
                parts.push({ id: doc.id, ...doc.data() } as SparePart);
            });
            parts.sort((a, b) => a.name.localeCompare(b.name));
            return parts;
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: sparePartsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Adds a new spare part.
 */
export const addSparePart = (partData: Omit<SparePart, 'id'>, actor: LoggedInUser) => {
    if (!db) return;
    const sparePartsCollection = collection(db, 'spare_parts');
    const docRef = doc(sparePartsCollection);

    setDoc(docRef, partData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: partData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_SPARE_PART', { entity: 'sparePart', id: docRef.id }, partData);
    }
};

/**
 * Updates an existing spare part.
 */
export const updateSparePart = (id: string, partData: Partial<Omit<SparePart, 'id' | 'vehicleId'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'spare_parts', id);
    
    updateDoc(docRef, partData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: partData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_SPARE_PART', { entity: 'sparePart', id }, partData);
    }
};

/**
 * Deletes a spare part.
 */
export const deleteSparePart = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'spare_parts', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_SPARE_PART', { entity: 'sparePart', id });
    }
};
