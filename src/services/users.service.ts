'use client';
import { db } from '@/lib/firebase/firestore';
import { User } from '@/lib/types';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

export const getUsers = async (): Promise<User[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
        const users: User[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            users.push({ 
                id: doc.id,
                name: data.name,
                role: data.role,
                password: data.password,
             } as User);
        });
        return users;
    } catch (error) {
        console.error("Error fetching users: ", error);
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

export const addUser = async (id: string, user: Omit<User, 'id'>): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, id);
        await setDoc(userRef, user);
    } catch (error) {
        console.error("Error adding user: ", error);
        throw new Error('No se pudo agregar el usuario.');
    }
};

// This function will seed initial data if the collection is empty.
export const seedUsers = async (usersToSeed: User[]) => {
    const usersCollection = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersCollection);
    if (snapshot.empty) {
        console.log('No users found, seeding initial data...');
        const promises = usersToSeed.map(u => {
            const { id, ...data } = u;
            return setDoc(doc(db, USERS_COLLECTION, id), data);
        });
        await Promise.all(promises);
        console.log('Initial user data seeded.');
    }
};
