
'use client';

import { Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

export const addFirefighter = (firefighterData: Omit<Firefighter, 'id'>, actor: LoggedInUser) => {
    if (!db) return;
    const firefightersCollection = collection(db, 'firefighters');
    const docRef = doc(firefightersCollection);

    setDoc(docRef, { ...firefighterData, status: firefighterData.status || 'Active' })
        .then(() => {
            if (actor) {
                logAction(actor, 'CREATE_FIREFIGHTER', { entity: 'firefighter', id: docRef.id }, firefighterData);
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: firefighterData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
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
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });
    
    await logAction(actor, 'BATCH_IMPORT_FIREFIGHTERS', { entity: 'firefighter', id: 'batch' }, { count: firefighters.length });
};

export const updateFirefighter = (id: string, firefighterData: Partial<Omit<Firefighter, 'id'>>, actor: LoggedInUser) => {
    if (!db || !actor) return;
    const docRef = doc(db, 'firefighters', id);
    
    updateDoc(docRef, firefighterData).then(() => {
        logAction(actor, 'UPDATE_FIREFIGHTER', { entity: 'firefighter', id }, firefighterData);
    }).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: firefighterData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });
};

export const deleteFirefighter = (id: string, actor: LoggedInUser) => {
    if (!db || !actor) return;
    const docRef = doc(db, 'firefighters', id);
    
    deleteDoc(docRef).then(() => {
        logAction(actor, 'DELETE_FIREFIGHTER', { entity: 'firefighter', id });
    }).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });
};
