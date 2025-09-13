
'use server';

import { Leave } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where, Timestamp, getDoc, addDoc } from 'firebase/firestore';
import { isWithinInterval, parseISO } from 'date-fns';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const leavesCollection = collection(db, 'leaves');
const sessionsCollection = collection(db, 'sessions');

export const getLeaves = async (): Promise<Leave[]> => {
    const querySnapshot = await getDocs(query(leavesCollection, where("endDate", ">=", new Date().toISOString().split('T')[0])));
    const leaves: Leave[] = [];
    querySnapshot.forEach((doc) => {
        leaves.push({ id: doc.id, ...doc.data() } as Leave);
    });
    return leaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
};

export const addLeave = async (leaveData: Omit<Leave, 'id'>): Promise<string> => {
    const batch = writeBatch(db);
    
    // 1. Create a new leave document
    const leaveDocRef = doc(leavesCollection); // Let firestore create ID
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
            const isParticipant = 
                sessionData.attendeeIds?.includes(leaveData.firefighterId) ||
                sessionData.instructorIds?.includes(leaveData.firefighterId) ||
                sessionData.assistantIds?.includes(leaveData.firefighterId);

            if (isParticipant) {
                const attendancePath = `attendance.${leaveData.firefighterId}`;
                batch.update(sessionDoc.ref, { [attendancePath]: 'excused' });
            }
        }
    });

    // 3. Commit all batched writes
    await batch.commit();

    return leaveDocRef.id;
};

export const deleteLeave = async (id: string): Promise<void> => {
    // Note: This does not revert excused attendances. 
    // This would require a more complex logic to know if the absence was excused by this leave specifically.
    const docRef = doc(db, 'leaves', id);
    await deleteDoc(docRef);
};
