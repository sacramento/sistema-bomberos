'use client';

import { Session, Firefighter, AttendanceStatus, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, deleteDoc, query, orderBy, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
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
 * Retrieves all aspirante workshops.
 */
export const getAspiranteWorkshops = async (): Promise<Session[]> => {
    if (!db) return [];
    const workshopsCollection = collection(db, 'aspirantes-workshops');
    const q = query(workshopsCollection, orderBy('date', 'desc'));
    
    return getDocs(q)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            
            const results: Session[] = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const getFirefighterObjects = (ids?: string[]) => ids?.map(id => firefighterMap.get(id)).filter((f): f is Firefighter => !!f) || [];
                return {
                    id: docSnap.id,
                    ...data,
                    instructors: getFirefighterObjects(data.instructorIds),
                    assistants: getFirefighterObjects(data.assistantIds),
                    attendees: getFirefighterObjects(data.attendeeIds),
                } as Session;
            });
            return results;
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: workshopsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Retrieves an aspirante workshop by its ID.
 */
export const getAspiranteWorkshopById = async (id: string): Promise<Session | null> => {
    if (!db) return null;
    const docRef = doc(db, 'aspirantes-workshops', id);
    
    return getDoc(docRef).then(async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            const getFirefighterObjects = (ids?: string[]) => ids?.map(id => firefighterMap.get(id)).filter((f): f is Firefighter => !!f) || [];
            
            return {
                id: docSnap.id,
                ...data,
                instructors: getFirefighterObjects(data.instructorIds),
                assistants: getFirefighterObjects(data.assistantIds),
                attendees: getFirefighterObjects(data.attendeeIds),
            } as Session;
        }
        return null;
    }).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'get' }));
        return null;
    });
};

/**
 * Adds a new workshop for aspirantes.
 */
export const addAspiranteWorkshop = (sessionData: Omit<Session, 'id' | 'attendance'>, actor: LoggedInUser) => {
    if (!db) return;
    const workshopsCollection = collection(db, 'aspirantes-workshops');
    const docRef = doc(workshopsCollection);
    
    const sessionToStore = cleanData({
        title: sessionData.title,
        description: sessionData.description,
        specialization: sessionData.specialization,
        date: sessionData.date,
        startTime: sessionData.startTime,
        instructorIds: sessionData.instructors.map(f => f.id),
        assistantIds: sessionData.assistants.map(f => f.id),
        attendeeIds: sessionData.attendees.map(f => f.id),
        attendance: {},
    });

    setDoc(docRef, sessionToStore).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: sessionToStore,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_WORKSHOP', { entity: 'aspiranteWorkshop', id: docRef.id }, sessionToStore);
    }
};

/**
 * Updates an existing workshop for aspirantes.
 */
export const updateAspiranteWorkshop = (id: string, sessionData: Partial<Session>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'aspirantes-workshops', id);
    
    const dataToUpdate: any = cleanData({
        title: sessionData.title,
        description: sessionData.description,
        specialization: sessionData.specialization,
        date: sessionData.date,
        startTime: sessionData.startTime,
        instructorIds: sessionData.instructors?.map(f => f.id),
        assistantIds: sessionData.assistants?.map(f => f.id),
        attendeeIds: sessionData.attendees?.map(f => f.id),
    });

    updateDoc(docRef, dataToUpdate).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_WORKSHOP', { entity: 'aspiranteWorkshop', id }, dataToUpdate);
    }
};

/**
 * Deletes an aspirante workshop.
 */
export const deleteAspiranteWorkshop = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'aspirantes-workshops', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_WORKSHOP', { entity: 'aspiranteWorkshop', id });
    }
};

/**
 * Updates attendance for an aspirante workshop.
 */
export const updateAspiranteWorkshopAttendance = (id: string, attendance: Record<string, AttendanceStatus>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'aspirantes-workshops', id);
    
    updateDoc(docRef, { attendance }).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { attendance },
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_ATTENDANCE', { entity: 'aspiranteWorkshop', id }, { count: Object.keys(attendance).length });
    }
};
