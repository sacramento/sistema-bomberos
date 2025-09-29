
'use server';

import { Week } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc } from 'firebase/firestore';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const weeksCollection = collection(db, 'weeks');

export const addWeek = async (weekData: Omit<Week, 'id'>): Promise<string> => {
    // Ensure all members are included in the memberIds list for consistency
    const allMemberIds = Array.from(new Set([weekData.leadId, weekData.driverId, ...weekData.memberIds]));
    
    const dataToSave = {
        ...weekData,
        memberIds: allMemberIds
    };

    const docRef = await addDoc(weeksCollection, dataToSave);
    return docRef.id;
};
