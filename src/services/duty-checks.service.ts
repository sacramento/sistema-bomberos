
'use client';

import { db } from '@/lib/firebase/firestore';
import { DutyCheck, LoggedInUser } from '@/lib/types';
import { collection, getDocs, doc, setDoc, query, orderBy, limit, getDoc, writeBatch } from 'firebase/firestore';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const DUTY_CHECKS_COLLECTION = 'duty_checks';

const cleanData = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, v === Object(v) && !Array.isArray(v) ? cleanData(v) : v])
    );
};

/**
 * Retrieves the most recent duty checks.
 */
export const getDutyChecks = async (): Promise<DutyCheck[]> => {
    if (!db) return [];
    const colRef = collection(db, DUTY_CHECKS_COLLECTION);
    const q = query(colRef, orderBy('date', 'desc'), limit(50));
    
    return getDocs(q)
        .then((querySnapshot) => {
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as DutyCheck));
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: colRef.path,
                operation: 'list',
            }));
            return [];
        });
};

/**
 * Adds a new duty check.
 */
export const addDutyCheck = async (data: Omit<DutyCheck, 'id'>, actor: LoggedInUser) => {
    if (!db || !actor) return;
    const colRef = collection(db, DUTY_CHECKS_COLLECTION);
    const docRef = doc(colRef);
    const cleaned = cleanData(data);

    return setDoc(docRef, cleaned)
        .then(() => {
            logAction(actor, 'CREATE_DUTY_CHECK', { entity: 'dutyCheck', id: docRef.id }, { vehicleId: data.vehicleId });
            return docRef.id;
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: cleaned,
            }));
        });
};

/**
 * Adds multiple duty checks in a single batch.
 */
export const addDutyChecksBatch = async (checks: Omit<DutyCheck, 'id'>[], actor: LoggedInUser) => {
    if (!db || !actor || checks.length === 0) return;
    const batch = writeBatch(db);
    const colRef = collection(db, DUTY_CHECKS_COLLECTION);
    
    checks.forEach(check => {
        const docRef = doc(colRef);
        batch.set(docRef, cleanData(check));
    });

    return batch.commit()
        .then(() => {
            logAction(actor, 'CREATE_DUTY_CHECK', { entity: 'dutyCheck', id: 'batch' }, { count: checks.length });
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: colRef.path,
                operation: 'write',
            }));
        });
}

/**
 * Gets a specific duty check by ID.
 */
export const getDutyCheckById = async (id: string): Promise<DutyCheck | null> => {
    if (!db) return null;
    const docRef = doc(db, DUTY_CHECKS_COLLECTION, id);
    
    return getDoc(docRef)
        .then(snap => {
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() } as DutyCheck;
            }
            return null;
        })
        .catch(async () => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'get' }));
            return null;
        });
};
