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
    await new Promise(resolve => setTimeout(resolve, 100));
    const user = users.find(u => u.id === id);
    return user || null;
}

export const addUser = async (id: string, userData: Omit<User, 'id'>): Promise<void> => {
    // Simula una llamada asíncrona
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const existing = users.find(u => u.id === id);
    if (existing) {
        // En un escenario real, podríamos decidir actualizar o lanzar un error.
        // Aquí lo actualizaremos para evitar el error de "ya existe".
        users = users.map(u => u.id === id ? { id, ...userData } : u);
    } else {
        const newUser: User = { id, ...userData };
        users.push(newUser);
    }
};
