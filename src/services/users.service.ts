

import { User, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { logAction } from './audit.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const usersCollection = collection(db, 'users');

const docToUser = (docSnap: any): User => {
    const data = docSnap.data();
    // Se asegura que el objeto `roles` exista y tenga todas las propiedades.
    const rolesData = data.roles || {};
    const roles = {
        asistencia: rolesData.asistencia || 'Ninguno',
        semanas: rolesData.semanas || 'Ninguno',
        movilidad: rolesData.movilidad || 'Ninguno',
        materiales: rolesData.materiales || 'Ninguno',
        ayudantia: rolesData.ayudantia || 'Ninguno',
        roperia: rolesData.roperia || 'Ninguno',
        servicios: rolesData.servicios || 'Ninguno',
        cascada: rolesData.cascada || 'Ninguno',
    };
    return {
        id: docSnap.id, 
        name: data.name,
        password: data.password,
        role: data.role,
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

export const addUser = async (id: string, userData: Omit<User, 'id'>, actor: LoggedInUser): Promise<void> => {
    // Here, 'id' is the firefighter's legajo.
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        throw new Error(`El usuario con el legajo ${id} ya existe.`);
    }

    await setDoc(docRef, userData);
    
    await logAction(actor, 'CREATE_USER', { entity: 'user', id }, userData);
};

export const updateUser = async (id: string, userData: Partial<Omit<User, 'id'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        throw new Error(`El usuario con el legajo ${id} no fue encontrado.`);
    }

    // Prevent password from being updated if it's an empty string
    if (userData.password === '') {
        delete userData.password;
    }

    await updateDoc(docRef, userData);

    await logAction(actor, 'UPDATE_USER', { entity: 'user', id }, userData);
};

export const deleteUser = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    const details = docSnap.exists() ? { legajo: id, name: docSnap.data().name } : { legajo: id };
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_USER', { entity: 'user', id }, details);
};
