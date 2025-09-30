import { User } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const usersCollection = collection(db, 'users');

// Función corregida para mapear siempre el rol global correctamente.
const docToUser = (docSnap: any): User => {
    const data = docSnap.data();
    // Se asegura que el objeto `roles` exista para evitar errores.
    const roles = data.roles || {
        asistencia: 'Ninguno',
        semanas: 'Ninguno',
        movilidad: 'Ninguno'
    };
    return {
        id: docSnap.id, 
        name: data.name,
        password: data.password,
        role: data.role, // <-- CLAVE: Esto asegura que el rol global ('Master', 'Oficial', 'Usuario') se asigne correctamente.
        roles 
    } as User;
}

export const getUsers = async (): Promise<User[]> => {
    const querySnapshot = await getDocs(usersCollection);
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
        users.push(docToUser(doc));
    });
    return users;
};

export const getUserById = async (id: string): Promise<User | null> => {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docToUser(docSnap);
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
};
