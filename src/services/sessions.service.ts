'use client';

import { Session, Firefighter, AttendanceStatus, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const SESSIONS_COLLECTION = 'sessions';

export const getSessions = async (): Promise<Session[]> => {
    if (!db) return [];
    const colRef = collection(db, SESSIONS_COLLECTION);
    
    return getDocs(colRef)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            
            const results: Session[] = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const getFirefighterObjects = (ids: string[]): Firefighter[] => {
                    if (!ids) return [];
                    return ids.map(id => firefighterMap.get(id)).filter((f): f is Firefighter => !!f);
                };
                
                return {
                    id: docSnap.id,
                    ...data,
                    instructors: getFirefighterObjects(data.instructorIds || []),
                    assistants: getFirefighterObjects(data.assistantIds || []),
                    attendees: getFirefighterObjects(data.attendeeIds || []),
                } as Session;
            });

            return results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: colRef.path,
                operation: 'list',
            }));
            return [];
        });
};

export const getSessionById = async(id: string): Promise<Session | null> => {
    if (!db) return null;
    const docRef = doc(db, SESSIONS_COLLECTION, id);
    
    return getDoc(docRef)
        .then(async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const firefighters = await getFirefighters();
                const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
                const getFirefighterObjects = (ids: string[]): Firefighter[] => {
                    if (!ids) return [];
                    return ids.map(id => firefighterMap.get(id)).filter((f): f is Firefighter => !!f);
                };
                return {
                    id: docSnap.id,
                    ...data,
                    instructors: getFirefighterObjects(data.instructorIds || []),
                    assistants: getFirefighterObjects(data.assistantIds || []),
                    attendees: getFirefighterObjects(data.attendeeIds || []),
                } as Session;
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
}

export const addSession = (sessionData: Omit<Session, 'id' | 'attendance'>, actor: LoggedInUser) => {
    if (!db) return;
    const colRef = collection(db, SESSIONS_COLLECTION);
    const docRef = doc(colRef);
    
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
    
    setDoc(docRef, sessionToStore).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: sessionToStore,
        }));
    });

    if (actor) {
        logAction(actor, 'CREATE_SESSION', { entity: 'session', id: docRef.id }, sessionToStore);
    }
};

export const updateSession = (id: string, sessionData: Partial<Session>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, SESSIONS_COLLECTION, id);
    
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

    updateDoc(docRef, dataToUpdate).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        }));
    });

    if (actor) {
        logAction(actor, 'UPDATE_SESSION', { entity: 'session', id }, dataToUpdate);
    }
};

export const updateSessionAttendance = (id: string, attendance: Record<string, AttendanceStatus>, actor: LoggedInUser = null) => {
    if (!db) return;
    const docRef = doc(db, SESSIONS_COLLECTION, id);
    
    updateDoc(docRef, { attendance }).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { attendance },
        }));
    });

    if (actor) {
        logAction(actor, 'UPDATE_ATTENDANCE', { entity: 'session', id }, { count: Object.keys(attendance).length });
    }
};

export const deleteSession = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, SESSIONS_COLLECTION, id);
    
    deleteDoc(docRef).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        }));
    });

    if (actor) {
        logAction(actor, 'DELETE_SESSION', { entity: 'session', id });
    }
};
