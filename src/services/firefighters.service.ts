import { Firefighter } from '@/lib/types';
import { firefighters as localFirefighters } from '@/lib/data';

// Usaremos una variable en memoria para simular la base de datos
let firefighters: Firefighter[] = [...localFirefighters];


export const getFirefighters = async (): Promise<Firefighter[]> => {
    // Simula una llamada asíncrona
    await new Promise(resolve => setTimeout(resolve, 100));
    return firefighters;
};

export const addFirefighter = async (firefighterData: Omit<Firefighter, 'id' | 'status'>, id: string): Promise<void> => {
    // Simula una llamada asíncrona
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newFirefighter: Firefighter = { 
        id, 
        ...firefighterData, 
        status: 'Active' 
    };

    const existingIndex = firefighters.findIndex(f => f.id === id);
    if (existingIndex !== -1) {
        // Actualiza si ya existe
        firefighters[existingIndex] = newFirefighter;
    } else {
        // Agrega si es nuevo
        firefighters.push(newFirefighter);
    }
};
