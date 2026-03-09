'use client';

import { Sanction, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, deleteDoc, query, updateDoc, setDoc } from 'firebase/firestore';
import { parseISO } from 'date-fns';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Retrieves all sanctions.
 */
export const getSanctions = async (): Promise<Sanction[]> => {
    if (!db) return [];
    const sanctionsCollection = collection(db, 'sanctions');
    
    return getDocs(sanctionsCollection)
        .then((querySnapshot) => {
            const sanctions: Sanction[] = [];
            querySnapshot.forEach((doc) => {
                sanctions.push({ id: doc.id, ...doc.data() } as Sanction);
            });
            return sanctions.sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime());
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: sanctionsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Adds a new sanction.
 */
export const addSanction = (sanctionData: Omit<Sanction, 'id'>, actor: LoggedInUser) => {
    if (!db) return;
    const sanctionsCollection = collection(db, 'sanctions');
    const docRef = doc(sanctionsCollection);

    setDoc(docRef, sanctionData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: sanctionData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_SANCTION', { entity: 'sanction', id: docRef.id }, sanctionData);
    }
};

/**
 * Updates an existing sanction.
 */
export const updateSanction = (id: string, sanctionData: Partial<Omit<Sanction, 'id' | 'firefighterId' | 'firefighterName'>>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'sanctions', id);
    
    updateDoc(docRef, sanctionData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: sanctionData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_SANCTION', { entity: 'sanction', id }, sanctionData);
    }
};

/**
 * Deletes a sanction.
 */
export const deleteSanction = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'sanctions', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_SANCTION', { entity: 'sanction', id });
    }
};
