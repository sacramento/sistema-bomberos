'use client';

import { Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, addDoc, query, where } from 'firebase/firestore';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const getFirefighters = async (): Promise<Firefighter[]> => {
    if (!db) return [];
    const colRef = collection(db, 'firefighters');
    return getDocs(colRef)
        .then((querySnapshot) => {
            const firefighters: Firefighter[] = [];
            querySnapshot.forEach((doc) => {
                firefighters.push({ id: doc.id, ...doc.data() } as Firefighter);
            });
            return firefighters;
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: colRef.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

export const addFirefighter = async (firefighterData: Omit<Firefighter, 'id'>, actor: LoggedInUser): Promise<string> => {
    if (!db) throw new Error("DB not initialized");
    const firefightersCollection = collection(db, 'firefighters');
    
    const docRef = doc(firefightersCollection);
    setDoc(docRef, { ...firefighterData, status: firefighterData.status || 'Active' })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: firefighterData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

    if (actor) {
        logAction(actor, 'CREATE_FIREFIGHTER', { entity: 'firefighter', id: docRef.id }, firefighterData);
    }
    return docRef.id;
};

export const batchAddFirefighters = async (firefighters: Omit<Firefighter, 'id'>[], actor: LoggedInUser): Promise<void> => {
    if (!db || !firefighters || firefighters.length === 0 || !actor) return;
    const batch = writeBatch(db);
    const firefightersCollection = collection(db, 'firefighters');
    for (const firefighter of firefighters) {
        const docRef = doc(firefightersCollection); 
        batch.set(docRef, {
            ...firefighter,
            status: firefighter.status === 'Active' || firefighter.status === 'Inactive' ? firefighter.status : 'Active'
        });
    }
    batch.commit().catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: firefightersCollection.path,
            operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    
    await logAction(actor, 'BATCH_IMPORT_FIREFIGHTERS', { entity: 'firefighter', id: 'batch' }, { count: firefighters.length });
};

export const updateFirefighter = async (id: string, firefighterData: Partial<Omit<Firefighter, 'id'>>, actor: LoggedInUser): Promise<void> => {
    if (!db || !actor) return;
    const docRef = doc(db, 'firefighters', id);
    
    updateDoc(docRef, firefighterData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: firefighterData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    
    await logAction(actor, 'UPDATE_FIREFIGHTER', { entity: 'firefighter', id }, firefighterData);
};

export const deleteFirefighter = async (id: string, actor: LoggedInUser): Promise<void> => {
    if (!db || !actor) return;
    const docRef = doc(db, 'firefighters', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    
    await logAction(actor, 'DELETE_FIREFIGHTER', { entity: 'firefighter', id });
};
