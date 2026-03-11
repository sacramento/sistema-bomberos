
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
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: workshopsCollection.path,
                operation: 'list',
            }));
            return [];
        });
};

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
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: sessionToStore,
        }));
    });

    if (actor) {
        logAction(actor, 'CREATE_WORKSHOP', { entity: 'aspiranteWorkshop', id: docRef.id }, sessionToStore);
    }
};

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
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        }));
    });

    if (actor) {
        logAction(actor, 'UPDATE_WORKSHOP', { entity: 'aspiranteWorkshop', id }, dataToUpdate);
    }
};

export const deleteAspiranteWorkshop = (id: string, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'aspirantes-workshops', id);
    
    deleteDoc(docRef).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        }));
    });

    if (actor) {
        logAction(actor, 'DELETE_WORKSHOP', { entity: 'aspiranteWorkshop', id });
    }
};

export const updateAspiranteWorkshopAttendance = (id: string, attendance: Record<string, AttendanceStatus>, actor: LoggedInUser) => {
    if (!db) return;
    const docRef = doc(db, 'aspirantes-workshops', id);
    
    updateDoc(docRef, { attendance }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { attendance },
        }));
    });

    if (actor) {
        logAction(actor, 'UPDATE_ATTENDANCE', { entity: 'aspiranteWorkshop', id }, { count: Object.keys(attendance).length });
    }
};
