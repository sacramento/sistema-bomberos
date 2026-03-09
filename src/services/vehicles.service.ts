'use client';

import { Vehicle, Firefighter, MaintenanceItem, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { getMaintenanceItems } from './maintenance-items.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Convierte un documento de Firestore a un objeto de tipo Vehicle con sus relaciones enriquecidas.
 */
const docToVehicle = async (
    docSnap: any, 
    firefighterMap: Map<string, Firefighter>,
    maintenanceItemMap: Map<string, MaintenanceItem>
): Promise<Vehicle> => {
    const data = docSnap.data();
    const getPersonnel = (ids: string[]) => ids.map(id => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
    const getItems = (ids: string[]) => ids.map(id => maintenanceItemMap.get(id)).filter(Boolean) as MaintenanceItem[];

    return {
        id: docSnap.id,
        numeroMovil: data.numeroMovil || '',
        dominio: data.dominio || '',
        marca: data.marca || '',
        modelo: data.modelo || '',
        ano: data.ano || 0,
        kilometraje: data.kilometraje || 0,
        cuartel: data.cuartel || 'Cuartel 1',
        especialidad: data.especialidad || 'GENERAL',
        capacidadAgua: data.capacidadAgua || 0,
        tipoVehiculo: data.tipoVehiculo || 'Liviana',
        traccion: data.traccion || 'Trasera',
        encargadoIds: data.encargadoIds || [],
        materialEncargadoIds: data.materialEncargadoIds || [],
        observaciones: data.observaciones || '',
        maintenanceItemIds: data.maintenanceItemIds || [],
        encargados: getPersonnel(data.encargadoIds || []),
        materialEncargados: getPersonnel(data.materialEncargadoIds || []),
        maintenanceItems: getItems(data.maintenanceItemIds || []),
    };
}

/**
 * Obtiene todos los vehículos de la flota.
 * Se eliminó el orderBy del servidor para asegurar que ningún móvil quede oculto por falta de datos.
 */
export const getVehicles = async (): Promise<Vehicle[]> => {
    if (!db) return [];
    const colRef = collection(db, 'vehicles');
    
    return getDocs(colRef)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            const maintenanceItems = await getMaintenanceItems();
            const maintenanceItemMap = new Map(maintenanceItems.map(i => [i.id, i]));
            
            const vehiclesPromises = querySnapshot.docs.map(doc => docToVehicle(doc, firefighterMap, maintenanceItemMap));
            const results = await Promise.all(vehiclesPromises);
            
            // Ordenamos en memoria para mayor seguridad
            return results.sort((a, b) => a.numeroMovil.localeCompare(b.numeroMovil, undefined, { numeric: true }));
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: colRef.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
        });
}

export const getVehicleById = async (id: string): Promise<Vehicle | null> => {
    if (!db) return null;
    const docRef = doc(db, 'vehicles', id);
    
    return getDoc(docRef)
        .then(async (docSnap) => {
            if (docSnap.exists()) {
                const firefighters = await getFirefighters();
                const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
                const maintenanceItems = await getMaintenanceItems();
                const maintenanceItemMap = new Map(maintenanceItems.map(i => [i.id, i]));
                return await docToVehicle(docSnap, firefighterMap, maintenanceItemMap);
            }
            return null;
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
            return null;
        });
}

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'encargados' | 'materialEncargados' | 'maintenanceItems'>, actor: LoggedInUser): Promise<string> => {
    if (!db) throw new Error("Base de datos no inicializada");
    const colRef = collection(db, 'vehicles');
    const docRef = doc(colRef);
    
    setDoc(docRef, vehicleData)
        .then(() => {
            if (actor) {
                logAction(actor, 'CREATE_VEHICLE', { entity: 'vehicle', id: docRef.id }, vehicleData);
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: vehicleData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

    return docRef.id;
};

export const updateVehicle = async (id: string, vehicleData: Partial<Omit<Vehicle, 'id' | 'encargados' | 'materialEncargados' | 'maintenanceItems'>>, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'vehicles', id);
    
    updateDoc(docRef, vehicleData)
        .then(() => {
            if (actor) {
                logAction(actor, 'UPDATE_VEHICLE', { entity: 'vehicle', id }, vehicleData);
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: vehicleData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};

export const deleteVehicle = async (id: string, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'vehicles', id);
    
    deleteDoc(docRef)
        .then(() => {
            if (actor) {
                logAction(actor, 'DELETE_VEHICLE', { entity: 'vehicle', id });
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};
