'use client';

import { Session, Firefighter, AttendanceStatus, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, query, updateDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const sessionsCollection = collection(db, 'sessions');

/**
 * Obtiene las sesiones. Se ordena en memoria para evitar ocultar documentos sin fecha.
 */
export const getSessions = async (): Promise<Session[]> => {
    if (!db) return [];
    
    return getDocs(sessionsCollection)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            
            const results: Session[] = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const getFirefighterObjects = (ids: string[]): Firefighter[] => {
                    if (!ids) return [];
                    return ids.map(id => firefighterMap.get(id)).filter(f => f !== undefined) as Firefighter[];
                };
                
                return {
                    id: docSnap.id,
                    ...data,
                    instructors: getFirefighterObjects(data.instructorIds || []),
                    assistants: getFirefighterObjects(data.assistantIds || []),
                    attendees: getFirefighterObjects(data.attendeeIds || []),
                } as Session;
            });

            // Ordenamiento en memoria
            return results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
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

export const getSessionById = async(id: string): Promise<Session | null> => {
    if (!db) return null;
    const docRef = doc(db, 'sessions', id);
    
    return getDoc(docRef)
        .then(async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const firefighters = await getFirefighters();
                const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
                const getFirefighterObjects = (ids: string[]): Firefighter[] => {
                    if (!ids) return [];
                    return ids.map(id => firefighterMap.get(id)).filter(f => f !== undefined) as Firefighter[];
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
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
            return null;
        });
}

export const addSession = async (sessionData: Omit<Session, 'id' | 'attendance'>, actor: LoggedInUser): Promise<string> => {
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
    
    setDoc(docRef, sessionToStore)
        .then(() => {
            if (actor) {
                logAction(actor, 'CREATE_SESSION', { entity: 'session', id: docRef.id }, sessionToStore);
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: sessionToStore,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

    return docRef.id;
};

export const updateSession = async (id: string, sessionData: Partial<Session>, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'sessions', id);
    
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

    // Limpiar undefined
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

    updateDoc(docRef, dataToUpdate)
        .then(() => {
            if (actor) {
                logAction(actor, 'UPDATE_SESSION', { entity: 'session', id }, dataToUpdate);
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};

export const updateSessionAttendance = async (id: string, attendance: Record<string, AttendanceStatus>, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'sessions', id);
    
    updateDoc(docRef, { attendance })
        .then(() => {
            if (actor) {
                logAction(actor, 'UPDATE_ATTENDANCE', { entity: 'session', id }, { count: Object.keys(attendance).length });
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: { attendance },
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};

export const deleteSession = async (id: string, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'sessions', id);
    
    deleteDoc(docRef)
        .then(() => {
            if (actor) {
                logAction(actor, 'DELETE_SESSION', { entity: 'session', id });
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};