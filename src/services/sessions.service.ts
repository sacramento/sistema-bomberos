
import { Session, Firefighter, AttendanceStatus } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, writeBatch, query, orderBy, updateDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const sessionsCollection = collection(db, 'sessions');

// Helper to convert Firestore doc data to Session object
// It fetches full Firefighter objects for instructors, assistants, and attendees
const docToSession = async (docSnap: any): Promise<Session> => {
    const data = docSnap.data();
    
    // Firestore stores references as IDs, we need to fetch the full objects
    const allFirefighters = await getFirefighters();
    const firefighterMap = new Map(allFirefighters.map(f => [f.id, f]));
    
    const getFirefighterObjects = (ids: string[]): Firefighter[] => {
        if (!ids) return [];
        return ids.map(id => firefighterMap.get(id)).filter(f => f !== undefined) as Firefighter[];
    };
    
    return {
        id: docSnap.id,
        ...data,
        instructors: getFirefighterObjects(data.instructorIds),
        assistants: getFirefighterObjects(data.assistantIds),
        attendees: getFirefighterObjects(data.attendeeIds),
    } as Session;
}


export const getSessions = async (): Promise<Session[]> => {
    // Order sessions by date descending
    const q = query(sessionsCollection, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    // Since docToSession is async, we need to handle the promises
    const sessionsPromises = querySnapshot.docs.map(doc => docToSession(doc));
    const sessions = await Promise.all(sessionsPromises);

    return sessions;
};

export const getSessionById = async(id: string): Promise<Session | null> => {
    const docRef = doc(db, 'sessions', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return await docToSession(docSnap);
    }
    return null;
}

export const addSession = async (sessionData: Omit<Session, 'id' | 'attendance'>): Promise<string> => {
    // We only store the IDs in Firestore, not the full firefighter objects
    const sessionToStore = {
        title: sessionData.title,
        description: sessionData.description,
        specialization: sessionData.specialization,
        date: sessionData.date,
        startTime: sessionData.startTime,
        instructorIds: sessionData.instructors.map(f => f.id),
        assistantIds: sessionData.assistants.map(f => f.id),
        attendeeIds: sessionData.attendees.map(f => f.id),
        attendance: {}, // Initialize attendance as an empty object
    };
    
    const id = `S-${Date.now()}`;
    const docRef = doc(db, 'sessions', id);

    await setDoc(docRef, sessionToStore);
    return id;
};

export const updateSession = async (id: string, sessionData: Partial<Session>): Promise<void> => {
    const docRef = doc(db, 'sessions', id);
    
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

    // Remove undefined fields so they don't overwrite existing data
    Object.keys(sessionToUpdate).forEach(key => sessionToUpdate[key] === undefined && delete sessionToUpdate[key]);

    await updateDoc(docRef, sessionToUpdate);
};


export const deleteSession = async (id: string): Promise<void> => {
    const docRef = doc(db, 'sessions', id);
    await deleteDoc(docRef);
};

export const updateSessionAttendance = async (id: string, attendance: Record<string, AttendanceStatus>): Promise<void> => {
    const docRef = doc(db, 'sessions', id);
    await updateDoc(docRef, {
        attendance: attendance
    });
};
