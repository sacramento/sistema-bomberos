
'use server';

import { Leave } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where, Timestamp, getDoc } from 'firebase/firestore';
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
    const id = `L-${Date.now()}`;
    const leaveDocRef = doc(db, 'leaves', id);
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
            const attendeeIds = sessionData.attendeeIds || [];
            const instructorIds = sessionData.instructorIds || [];
            const assistantIds = sessionData.assistantIds || [];
            
            // If the firefighter is an attendee, instructor, or assistant in this session, update their attendance to 'excused'
            if (attendeeIds.includes(leaveData.firefighterId) || instructorIds.includes(leaveData.firefighterId) || assistantIds.includes(leaveData.firefighterId)) {
                const attendancePath = `attendance.${leaveData.firefighterId}`;
                batch.update(sessionDoc.ref, { [attendancePath]: 'excused' });
            }
        }
    });

    // 3. Commit all batched writes
    await batch.commit();

    return id;
};

export const deleteLeave = async (id: string): Promise<void> => {
    // Note: This does not revert excused attendances. 
    // This would require a more complex logic to know if the absence was excused by this leave specifically.
    const docRef = doc(db, 'leaves', id);
    await deleteDoc(docRef);
};
