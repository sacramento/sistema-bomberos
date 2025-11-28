
'use server';

// This file will handle all the data logic for the Services module.
// We will add functions to get, add, update, and delete services from Firestore.

import { db } from '@/lib/firebase/firestore';
import { Service } from '@/lib/types';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const servicesCollection = collection(db, 'services');

// Example function to get all services
export const getServices = async (): Promise<Service[]> => {
    const q = query(servicesCollection, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const services: Service[] = [];
    querySnapshot.forEach((doc) => {
        services.push({ id: doc.id, ...doc.data() } as Service);
    });
    return services;
}
