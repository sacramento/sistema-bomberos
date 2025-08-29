import { User } from '@/lib/types';
import { users as localUsers } from '@/lib/data';

// Usaremos una variable en memoria para simular la base de datos
let users: User[] = [...localUsers];

export const getUsers = async (): Promise<User[]> => {
    // Simula una llamada asíncrona
    await new Promise(resolve => setTimeout(resolve, 100));
    return users;
};

export const getUserById = async (id: string): Promise<User | null> => {
    // Simula una llamada asíncrona
    await new Promise(resolve => setTimeout(resolve, 50));
    const user = users.find(u => u.id === id);
    return user || null;
}

export const addUser = async (id: string, userData: Omit<User, 'id'>): Promise<void> => {
    // Simula una llamada asíncrona
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const existing = users.find(u => u.id === id);
    if (existing) {
        throw new Error(`El usuario con el legajo ${id} ya existe.`);
    }
    
    const newUser: User = { id, ...userData };
    users.push(newUser);
};

export const updateUser = async (id: string, userData: Partial<Omit<User, 'id'>>): Promise<void> => {
    // Simula una llamada asíncrona
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        throw new Error(`No se encontró al usuario con el legajo ${id}.`);
    }

    // Combina los datos existentes con los nuevos datos
    const updatedUser = { ...users[userIndex], ...userData };
    
    // Si la contraseña viene vacía o nula en la actualización, mantenemos la anterior
    if (!userData.password) {
        updatedUser.password = users[userIndex].password;
    }
    
    users[userIndex] = updatedUser;
};

export const deleteUser = async (id: string): Promise<void> => {
    // Simula una llamada asíncrona
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const initialLength = users.length;
    users = users.filter(u => u.id !== id);
    
    if (users.length === initialLength) {
        throw new Error(`No se encontró al usuario con el legajo ${id} para eliminar.`);
    }
};
