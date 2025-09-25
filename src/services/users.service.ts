import { User } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { deleteProfileImage } from './storage.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const usersCollection = collection(db, 'users');

export const getUsers = async (): Promise<User[]> => {
    const querySnapshot = await getDocs(usersCollection);
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() } as User);
    });
    return users;
};

export const getUserById = async (id: string): Promise<User | null> => {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
}

export const addUser = async (id: string, userData: Omit<User, 'id'>): Promise<void> => {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        throw new Error(`El usuario con el legajo ${id} ya existe.`);
    }

    await setDoc(docRef, userData);
};

export const updateUser = async (id: string, userData: Partial<Omit<User, 'id'>>): Promise<void> => {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        throw new Error(`No se encontró al usuario con el legajo ${id}.`);
    }

    await updateDoc(docRef, userData);
};

export const deleteUser = async (id: string): Promise<void> => {
    const docRef = doc(db, 'users', id);
    await deleteDoc(docRef);

    // Also delete profile image from storage
    try {
        await deleteProfileImage(id);
    } catch (error) {
        // Log the error but don't block the user deletion if image deletion fails
        console.warn(`Could not delete profile image for user ${id}:`, error);
    }
};
