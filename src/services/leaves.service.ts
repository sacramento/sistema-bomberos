
'use server';

import { Leave } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where, Timestamp, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { isWithinInterval, parseISO } from 'date-fns';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const leavesCollection = collection(db, 'leaves');
const sessionsCollection = collection(db, 'sessions');

export const getLeaves = async (): Promise<Leave[]> => {
    // We get all leaves, and filter/sort on the client if needed.
    // This simplifies the query and makes it more robust.
    const querySnapshot = await getDocs(query(leavesCollection));
    const leaves: Leave[] = [];
    querySnapshot.forEach((doc) => {
        leaves.push({ id: doc.id, ...doc.data() } as Leave);
    });
    // Sort by most recent start date
    return leaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
};

export const addLeave = async (leaveData: Omit<Leave, 'id'>): Promise<string> => {
    const batch = writeBatch(db);
    
    // 1. Create a new leave document
    const leaveDocRef = doc(collection(db, 'leaves'));
    batch.set(leaveDocRef, leaveData);

    // 2. Find sessions within the leave date range
    const leaveStartDate = parseISO(leaveData.startDate);
    const leaveEndDate = parseISO(leaveData.endDate);

    const sessionsQuery = query(sessionsCollection, where('date', '>=', leaveData.startDate), where('date', '<=', leaveData.endDate));
    const sessionsSnapshot = await getDocs(sessionsQuery);

    sessionsSnapshot.forEach(sessionDoc => {
        const sessionData = sessionDoc.data();
        const sessionDate = parseISO(sessionData.date);
        
        // Final check to be sure the session is in the interval. Firestore date queries can be tricky.
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

    // 3. Commit all batched writes
    await batch.commit();

    return leaveDocRef.id;
};

export const updateLeave = async (id: string, leaveData: Partial<Omit<Leave, 'id' | 'firefighterId' | 'firefighterName'>>): Promise<void> => {
    const docRef = doc(db, 'leaves', id);
    await updateDoc(docRef, leaveData);
    // Note: This does not automatically re-evaluate attendance for the new date range.
    // That would require a more complex logic to find previous dates, revert excused status, and apply new ones.
    // For now, the user should manually adjust attendance if date ranges change significantly.
};


export const deleteLeave = async (id: string): Promise<void> => {
    // Note: This does not revert excused attendances. 
    // This would require a more complex logic to know if the absence was excused by this leave specifically.
    const docRef = doc(db, 'leaves', id);
    await deleteDoc(docRef);
};
