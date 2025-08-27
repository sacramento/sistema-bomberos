'use client';
import { db } from '@/lib/firebase/firestore';
import { User } from '@/lib/types';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

export const getUsers = async (): Promise<User[]> => {
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        const querySnapshot = await getDocs(usersRef);

        const users: User[] = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() } as User);
        });
        return users;
    } catch (error) {
        console.error("Error fetching users: ", error);
        // Devuelve un array vacío si la colección no existe o hay un error.
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
        // Usa el 'id' (legajo) proporcionado para crear o sobrescribir el documento.
        const userRef = doc(db, USERS_COLLECTION, id);
        await setDoc(userRef, userData);
    } catch (error) {
        console.error("Error adding user: ", error);
        throw new Error('No se pudo agregar el usuario.');
    }
};