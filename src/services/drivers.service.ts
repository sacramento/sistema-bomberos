
'use server';

import { Driver, Firefighter, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, where, getDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { cache } from 'react';
import { logAction } from './audit.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const driversCollection = collection(db, 'drivers');

const getAllFirefightersCached = cache(async () => {
    const firefighters = await getFirefighters();
    return new Map(firefighters.map(f => [f.id, f]));
});

const docToDriver = async (docSnap: any, firefighterMap: Map<string, Firefighter>): Promise<Driver> => {
    const data = docSnap.data();
    const firefighter: Firefighter | undefined = firefighterMap.get(data.firefighterId);
    
    return {
        id: docSnap.id,
        firefighterId: data.firefighterId,
        habilitaciones: data.habilitaciones || [],
        firefighter,
    } as Driver;
}

export const getDrivers = async (): Promise<Driver[]> => {
    const q = query(driversCollection);
    const querySnapshot = await getDocs(q);

    const firefighterMap = await getAllFirefightersCached();
    
    const driversPromises = querySnapshot.docs.map(doc => docToDriver(doc, firefighterMap));
    const drivers = await Promise.all(driversPromises);
    
    // Sort by firefighter's last name
    return drivers.sort((a, b) => {
        const nameA = a.firefighter?.lastName || '';
        const nameB = b.firefighter?.lastName || '';
        return nameA.localeCompare(nameB);
    });
};

export const addDriver = async (driverData: Omit<Driver, 'id' | 'firefighter'>, actor: LoggedInUser): Promise<string> => {
    const docRef = await addDoc(driversCollection, driverData);
    await logAction(actor, 'CREATE_DRIVER', { entity: 'driver', id: docRef.id }, driverData);
    return docRef.id;
};

export const updateDriver = async (id: string, driverData: Partial<Omit<Driver, 'id' | 'firefighter' | 'firefighterId'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'drivers', id);
    await updateDoc(docRef, driverData);
    await logAction(actor, 'UPDATE_DRIVER', { entity: 'driver', id }, driverData);
};

export const deleteDriver = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'drivers', id);
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_DRIVER', { entity: 'driver', id });
};
