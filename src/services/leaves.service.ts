
'use server';

import { Leave, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where, Timestamp, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { isWithinInterval, parseISO } from 'date-fns';
import { logAction } from './audit.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const leavesCollection = collection(db, 'leaves');
const sessionsCollection = collection(db, 'sessions');

export const getLeaves = async (): Promise<Leave[]> => {
    const querySnapshot = await getDocs(query(leavesCollection));
    const leaves: Leave[] = [];
    querySnapshot.forEach((doc) => {
        leaves.push({ id: doc.id, ...doc.data() } as Leave);
    });
    return leaves.sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime());
};

export const addLeave = async (leaveData: Omit<Leave, 'id'>, actor: LoggedInUser): Promise<string> => {
    const batch = writeBatch(db);
    
    const leaveDocRef = doc(collection(db, 'leaves'));
    batch.set(leaveDocRef, leaveData);

    const leaveStartDate = parseISO(leaveData.startDate);
    const leaveEndDate = parseISO(leaveData.endDate);

    const sessionsQuery = query(sessionsCollection, where('date', '>=', leaveData.startDate), where('date', '<=', leaveData.endDate));
    const sessionsSnapshot = await getDocs(sessionsQuery);

    sessionsSnapshot.forEach(sessionDoc => {
        const sessionData = sessionDoc.data();
        const sessionDate = parseISO(sessionData.date);
        
        if (isWithinInterval(sessionDate, { start: leaveStartDate, end: leaveEndDate })) {
             const allParticipantIds = [
                ...(sessionData.attendeeIds || []),
                ...(sessionData.instructorIds || []),
                ...(sessionData.assistantIds || [])
            ];
            
            if (allParticipantIds.includes(leaveData.firefighterId)) {
                const attendancePath = `attendance.${leaveData.firefighterId}`;
                batch.update(sessionDoc.ref, { [attendancePath]: 'excused' });
            }
        }
    });

    await batch.commit();
    await logAction(actor, 'CREATE_LEAVE', { entity: 'leave', id: leaveDocRef.id }, leaveData);
    return leaveDocRef.id;
};

export const updateLeave = async (id: string, leaveData: Partial<Omit<Leave, 'id' | 'firefighterId' | 'firefighterName'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'leaves', id);
    await updateDoc(docRef, leaveData);
    await logAction(actor, 'UPDATE_LEAVE', { entity: 'leave', id }, leaveData);
};


export const deleteLeave = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'leaves', id);
    const docSnap = await getDoc(docRef);
    const details = docSnap.exists() ? { firefighterName: docSnap.data().firefighterName } : {};
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_LEAVE', { entity: 'leave', id }, details);
};
