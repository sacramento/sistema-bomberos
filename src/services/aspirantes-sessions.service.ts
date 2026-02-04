

'use server';

import { Session, Firefighter, AttendanceStatus, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, writeBatch, query, orderBy, updateDoc, addDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { cache } from 'react';
import { logAction } from './audit.service';


if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const aspirantesSessionsCollection = collection(db, 'aspirantes-sessions');

// Cache all firefighters for the duration of a single request
const getAllFirefightersCached = cache(async () => {
    const firefighters = await getFirefighters();
    return new Map(firefighters.map(f => [f.id, f]));
});

// Helper to convert Firestore doc data to Session object
const docToSession = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<Session> => {
    const data = docSnap.data();
    
    const getFirefighterObjects = (ids: string[]): Firefighter[] => {
        if (!ids) return [];
        return ids.map(id => firefighterMap.get(id)).filter(f => f !== undefined) as Firefighter[];
    };
    
    const instructorIds = data.instructorIds || [];
    const assistantIds = data.assistantIds || [];
    const attendeeIds = data.attendeeIds || [];
    
    return {
        id: docSnap.id,
        ...data,
        instructors: getFirefighterObjects(instructorIds),
        assistants: getFirefighterObjects(assistantIds),
        attendees: getFirefighterObjects(attendeeIds),
        instructorIds,
        assistantIds,
        attendeeIds,
    } as Session;
}


export const getAspiranteSessions = async (): Promise<Session[]> => {
    const q = query(aspirantesSessionsCollection, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);

    const firefighterMap = await getAllFirefightersCached();
    
    const sessionsPromises = querySnapshot.docs.map(doc => docToSession(doc, firefighterMap));
    const sessions = await Promise.all(sessionsPromises);

    return sessions;
};

export const getAspiranteSessionById = async(id: string): Promise<Session | null> => {
    const docRef = doc(db, 'aspirantes-sessions', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const firefighterMap = await getAllFirefightersCached();
        return await docToSession(docSnap, firefighterMap);
    }
    return null;
}

export const addAspiranteSession = async (sessionData: Omit<Session, 'id' | 'attendance'>, actor: LoggedInUser): Promise<string> => {
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
    
    const docRef = await addDoc(aspirantesSessionsCollection, sessionToStore);
    await logAction(actor, 'CREATE_SESSION', { entity: 'aspiranteSession', id: docRef.id }, sessionToStore);
    return docRef.id;
};

export const updateAspiranteSession = async (id: string, sessionData: Partial<Session>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'aspirantes-sessions', id);
    
    const sessionToUpdate: any = {
        title: sessionData.title,
        description: sessionData.description,
        specialization: sessionData.specialization,
        date: sessionData.date,
        startTime: sessionData.startTime,
        instructorIds: sessionData.instructors?.map(f => f.id),
        assistantIds: sessionData.assistants?.map(f => f.id),
        attendeeIds: sessionData.attendees?.map(f => f.id),
    };

    Object.keys(sessionToUpdate).forEach(key => sessionToUpdate[key] === undefined && delete sessionToUpdate[key]);

    await updateDoc(docRef, sessionToUpdate);
    await logAction(actor, 'UPDATE_SESSION', { entity: 'aspiranteSession', id }, sessionToUpdate);
};


export const deleteAspiranteSession = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'aspirantes-sessions', id);
    const docSnap = await getDoc(docRef);
    const details = docSnap.exists() ? { title: docSnap.data().title } : {};
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_SESSION', { entity: 'aspiranteSession', id }, details);
};

export const updateAspiranteSessionAttendance = async (id: string, attendance: Record<string, AttendanceStatus>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'aspirantes-sessions', id);
    await updateDoc(docRef, {
        attendance: attendance
    });
    await logAction(actor, 'UPDATE_ATTENDANCE', { entity: 'aspiranteSession', id }, { count: Object.keys(attendance).length });
};
