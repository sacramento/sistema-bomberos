'use client';
import { db } from '@/lib/firebase/firestore';
import { User } from '@/lib/types';
import { collection, getDocs, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

// Seed data - only for initial setup
const initialUsers: User[] = [
    { id: 'U-001', name: 'Usuario Admin', password: 'password', role: 'Administrador' },
    { id: 'U-002', name: 'Usuario Operador', password: 'password', role: 'Operador' },
    { id: 'U-003', name: 'Usuario Asistente', password: 'password', role: 'Asistente' },
];

/**
 * Ensures the users collection is seeded with initial data if it's empty.
 */
const seedUsers = async () => {
    try {
        console.log('Seeding initial user data...');
        const batch = writeBatch(db);
        initialUsers.forEach((user) => {
            const { id, ...userData } = user;
            const userRef = doc(db, USERS_COLLECTION, id);
            batch.set(userRef, userData);
        });
        await batch.commit();
        console.log('Initial user data seeded successfully.');
    } catch (error) {
        console.error("Error seeding users: ", error);
        throw new Error('Failed to seed users.');
    }
};

export const getUsers = async (): Promise<User[]> => {
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        const querySnapshot = await getDocs(usersRef);
        
        if (querySnapshot.empty) {
            console.log('Users collection is empty. Seeding...');
            await seedUsers();
            // After seeding, get the data again
            const seededSnapshot = await getDocs(usersRef);
            const users: User[] = [];
            seededSnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() } as User);
            });
            return users;
        }

        const users: User[] = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() } as User);
        });
        return users;
    } catch (error) {
        console.error("Error fetching users: ", error);
        // Return an empty array in case of error, but seeding should handle creation.
        return [];
    }
};

export const getUserById = async (id: string): Promise<User | null> => {
     try {
        const docRef = doc(db, USERS_COLLECTION, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as User;
        } else {
            console.log("No such user!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching user by ID: ", error);
        return null;
    }
}

export const addUser = async (id: string, userData: Omit<User, 'id'>): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, id);
        // The setDoc will create the document if it doesn't exist, or overwrite it if it does.
        // This is safe because legajo should be unique.
        await setDoc(userRef, userData);
    } catch (error) {
        console.error("Error adding user: ", error);
        throw new Error('No se pudo agregar el usuario.');
    }
};
