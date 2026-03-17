
'use client';

import { Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
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
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: colRef.path,
                operation: 'list',
            }));
            return [];
        });
};

export const getFirefighterById = async (id: string): Promise<Firefighter | null> => {
    if (!db) return null;
    const docRef = doc(db, 'firefighters', id);
    return getDoc(docRef)
        .then((docSnap) => {
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Firefighter;
            }
            return null;
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            }));
            return null;
        });
};

export const addFirefighter = (firefighterData: Omit<Firefighter, 'id'>, actor: LoggedInUser) => {
    if (!db) return;
    const firefightersCollection = collection(db, 'firefighters');
    const docRef = doc(firefightersCollection);
    const cleaned = cleanData(firefighterData);

    setDoc(docRef, { ...cleaned, status: cleaned.status || 'Active' })
        .then(() => {
            if (actor) {
                logAction(actor, 'CREATE_FIREFIGHTER', { entity: 'firefighter', id: docRef.id }, cleaned);
            }
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: cleaned,
            }));
        });
};

export const batchAddFirefighters = async (firefighters: Omit<Firefighter, 'id'>[], actor: LoggedInUser): Promise<void> => {
    if (!db || !firefighters || firefighters.length === 0 || !actor) return;
    const batch = writeBatch(db);
    const firefightersCollection = collection(db, 'firefighters');
    for (const firefighter of firefighters) {
        const docRef = doc(firefightersCollection); 
        batch.set(docRef, cleanData({
            ...firefighter,
            status: firefighter.status || 'Active'
        }));
    }
    
    // Non-blocking batch commit
    batch.commit().catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: firefightersCollection.path,
            operation: 'write',
        }));
    });
    
    logAction(actor, 'BATCH_IMPORT_FIREFIGHTERS', { entity: 'firefighter', id: 'batch' }, { count: firefighters.length });
};

export const updateFirefighter = (id: string, firefighterData: Partial<Omit<Firefighter, 'id'>>, actor: LoggedInUser) => {
    if (!db || !actor) return;
    const docRef = doc(db, 'firefighters', id);
    const cleaned = cleanData(firefighterData);
    
    updateDoc(docRef, cleaned).then(() => {
        logAction(actor, 'UPDATE_FIREFIGHTER', { entity: 'firefighter', id }, cleaned);
    }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: cleaned,
        }));
    });
};

export const deleteFirefighter = (id: string, actor: LoggedInUser) => {
    if (!db || !actor) return;
    const docRef = doc(db, 'firefighters', id);
    
    deleteDoc(docRef).then(() => {
        logAction(actor, 'DELETE_FIREFIGHTER', { entity: 'firefighter', id });
    }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        }));
    });
};
