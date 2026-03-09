'use client';

import { Session, Firefighter, AttendanceStatus, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, deleteDoc, query, orderBy, updateDoc, setDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Retrieves all aspirante training sessions.
 */
export const getAspiranteSessions = async (): Promise<Session[]> => {
    if (!db) return [];
    const sessionsCollection = collection(db, 'aspirantes-sessions');
    const q = query(sessionsCollection, orderBy('date', 'desc'));
    
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
                path: sessionsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
};

/**
 * Adds a new training session for aspirantes.
 */
export const addAspiranteSession = (sessionData: Omit<Session, 'id' | 'attendance'>, actor: LoggedInUser) => {
    if (!db) return;
    const sessionsCollection = collection(db, 'aspirantes-sessions');
    const docRef = doc(sessionsCollection);
    
    const sessionToStore = {
        title: sessionData.title,
        description: sessionData.description,
        specialization: sessionData.specialization,
        date: sessionData.date,
        startTime: sessionData.startTime,
        instructorIds: sessionData.instructors.map(f => f.id),
        assistantIds: sessionData.assistants.map(f => f.id),
        attendeeIds: sessionData.attendees.map(f => f.id),
        attendance: {},
    };

    setDoc(docRef, sessionToStore).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: sessionToStore,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_SESSION', { entity: 'aspiranteSession', id: docRef.id }, sessionToStore);
    }
};

/**
 * Updates an existing training session for aspirantes.
 */
export const updateAspiranteSession = (id: string, sessionData: Partial<Session>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'aspirantes-sessions', id);
    
    const dataToUpdate: any = {
        title: sessionData.title,
        description: sessionData.description,
        specialization: sessionData.specialization,
        date: sessionData.date,
        startTime: sessionData.startTime,
        instructorIds: sessionData.instructors?.map(f => f.id),
        assistantIds: sessionData.assistants?.map(f => f.id),
        attendeeIds: sessionData.attendees?.map(f => f.id),
    };

    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

    updateDoc(docRef, dataToUpdate).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_SESSION', { entity: 'aspiranteSession', id }, dataToUpdate);
    }
};

/**
 * Deletes an aspirante training session.
 */
export const deleteAspiranteSession = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'aspirantes-sessions', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_SESSION', { entity: 'aspiranteSession', id });
    }
};

/**
 * Updates attendance for an aspirante training session.
 */
export const updateAspiranteSessionAttendance = (id: string, attendance: Record<string, AttendanceStatus>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'aspirantes-sessions', id);
    
    updateDoc(docRef, { attendance }).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { attendance },
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_ATTENDANCE', { entity: 'aspiranteSession', id }, { count: Object.keys(attendance).length });
    }
};
