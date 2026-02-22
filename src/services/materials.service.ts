
'use server';

import { Material, Vehicle, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { getVehicles } from './vehicles.service';
import { cache } from 'react';
import { logAction } from './audit.service';

if (!db) {
    throw new Error("Firestore is not initialized. Check your Firebase configuration.");
}

const materialsCollection = collection(db, 'materials');

// Cache data for the duration of a single request
const getAllVehiclesCached = cache(async () => {
    const vehicles = await getVehicles();
    return new Map(vehicles.map(v => [v.id, v]));
});

// Helper to calculate the prefix from type and specialization
const calculatePrefix = (tipo: string, especialidad: string) => {
    const cleanType = tipo.replace(/[\s.]/g, '').substring(0, 2).toUpperCase();
    const cleanSpec = especialidad.replace(/[\s.]/g, '').substring(0, 2).toUpperCase();
    return `${cleanType}${cleanSpec}`;
};

// Helper to enrich material data with vehicle details
const docToMaterial = async (
    docSnap: any, 
    vehicleMap: Map<string, Vehicle>
): Promise<Material> => {
    const data = docSnap.data();
    
    let vehiculo: Vehicle | undefined = undefined;
    if (data.ubicacion?.type === 'vehiculo' && data.ubicacion?.vehiculoId) {
        vehiculo = vehicleMap.get(data.ubicacion.vehiculoId);
    }
    
    const material: Material = {
        id: docSnap.id,
        codigo: data.codigo,
        nombre: data.nombre,
        tipo: data.tipo,
        especialidad: data.especialidad,
        caracteristicas: data.caracteristicas,
        medida: data.medida,
        ubicacion: data.ubicacion,
        estado: data.estado,
        condicion: data.condicion || 'Bueno',
        cuartel: data.cuartel,
        vehiculo: vehiculo,
    };
    return material;
}

export const getMaterials = async (): Promise<Material[]> => {
    const q = query(materialsCollection, orderBy('nombre', 'asc'));
    const querySnapshot = await getDocs(q);

    const vehicleMap = await getAllVehiclesCached();
    
    const materialsPromises = querySnapshot.docs.map(doc => docToMaterial(doc, vehicleMap));
    const materials = await Promise.all(materialsPromises);

    return materials;
}

/**
 * Generates the next sequential number for a given code prefix.
 * Returns the number (integer).
 */
export const getNextMaterialSequence = async (prefix: string): Promise<number> => {
    const q = query(materialsCollection, where("codigo", ">=", prefix), where("codigo", "<=", prefix + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    
    let maxNum = 0;
    querySnapshot.forEach(doc => {
        const code = doc.data().codigo as string;
        const numPart = code.substring(prefix.length);
        const num = parseInt(numPart);
        if (!isNaN(num) && num > maxNum) {
            maxNum = num;
        }
    });
    
    return maxNum + 1;
};

export const addMaterial = async (materialData: Omit<Material, 'id' | 'vehiculo'>, actor: LoggedInUser): Promise<string> => {
    const q = query(materialsCollection, where("codigo", "==", materialData.codigo));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error(`El material con el código ${materialData.codigo} ya existe.`);
    }

    const docRef = await addDoc(materialsCollection, materialData);
    await logAction(actor, 'CREATE_MATERIAL', { entity: 'material', id: docRef.id }, materialData);
    return docRef.id;
};

export const batchAddMaterials = async (materials: (Omit<Material, 'id' | 'vehiculo'> & { numero_movil?: string })[], actor: LoggedInUser): Promise<void> => {
    if (!materials || materials.length === 0) {
        return;
    }

    const batch = writeBatch(db);
    const allVehicles = await getVehicles();
    const vehicleMapByNumber = new Map(allVehicles.map(v => [v.numeroMovil, v]));
    
    const prefixCounters = new Map<string, number>();
    const existingMaterials = await getMaterials();
    const existingCodes = existingMaterials.map(m => m.codigo);

    for (const material of materials) {
        const materialToSave: any = { ...material };
        
        // Normalizar medida en importación masiva (puntos en lugar de comas)
        if (materialToSave.medida) {
            materialToSave.medida = materialToSave.medida.replace(',', '.');
        }

        if (!materialToSave.codigo) {
            const prefix = calculatePrefix(materialToSave.tipo, materialToSave.especialidad);
            if (!prefixCounters.has(prefix)) {
                let maxNum = 0;
                existingCodes.filter(c => c.startsWith(prefix)).forEach(code => {
                    const numPart = code.substring(prefix.length);
                    const num = parseInt(numPart);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                });
                prefixCounters.set(prefix, maxNum + 1);
            }
            
            const nextSeq = prefixCounters.get(prefix)!;
            materialToSave.codigo = `${prefix}${nextSeq.toString().padStart(3, '0')}`;
            prefixCounters.set(prefix, nextSeq + 1);
        }

        if (material.ubicacion.type === 'vehiculo' && material.numero_movil) {
            const vehicle = vehicleMapByNumber.get(material.numero_movil);
            if (vehicle) {
                materialToSave.ubicacion.vehiculoId = vehicle.id;
                materialToSave.cuartel = vehicle.cuartel;
            } else {
                materialToSave.ubicacion.type = 'deposito';
                materialToSave.ubicacion.deposito = materialToSave.cuartel;
            }
        }
        delete materialToSave.numero_movil;

        const newDocRef = doc(collection(db, 'materials')); 
        batch.set(newDocRef, materialToSave);
    }

    await batch.commit();
    await logAction(actor, 'BATCH_IMPORT_MATERIALS', { entity: 'material', id: 'batch' }, { count: materials.length });
}


export const updateMaterial = async (id: string, materialData: Partial<Omit<Material, 'id' | 'vehiculo'>>, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'materials', id);

    if (materialData.codigo) {
        const q = query(materialsCollection, where("codigo", "==", materialData.codigo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
            throw new Error(`El código de material ${materialData.codigo} ya está en uso.`);
        }
    }
    
    const dataToUpdate = { ...materialData };
    await updateDoc(docRef, dataToUpdate);
    await logAction(actor, 'UPDATE_MATERIAL', { entity: 'material', id }, dataToUpdate);
};

export const deleteMaterial = async (id: string, actor: LoggedInUser): Promise<void> => {
    const docRef = doc(db, 'materials', id);
    const docSnap = await getDoc(docRef);
    const details = docSnap.exists() ? { nombre: docSnap.data().nombre } : {};
    await deleteDoc(docRef);
    await logAction(actor, 'DELETE_MATERIAL', { entity: 'material', id }, details);
};

export const deleteAllMaterials = async (actor: LoggedInUser, vehicleId?: string): Promise<number> => {
    let q;
    if (vehicleId) {
        q = query(materialsCollection, 
            where('ubicacion.type', '==', 'vehiculo'), 
            where('ubicacion.vehiculoId', '==', vehicleId)
        );
    } else {
        q = query(materialsCollection);
    }

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return 0;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    const details = vehicleId ? { vehicleId, count: querySnapshot.size } : { count: querySnapshot.size };
    await logAction(actor, 'DELETE_MATERIAL', { entity: 'material', id: 'batch' }, details);
    return querySnapshot.size;
}
