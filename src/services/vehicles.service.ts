
'use client';

import { Vehicle, Firefighter, MaintenanceItem, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { getMaintenanceItems } from './maintenance-items.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const cleanData = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, v === Object(v) && !Array.isArray(v) ? cleanData(v) : v])
    );
};

const docToVehicle = async (
    docSnap: any, 
    firefighterMap: Map<string, Firefighter>,
    maintenanceItemMap: Map<string, MaintenanceItem>
): Promise<Vehicle> => {
    const data = docSnap.data();
    const getPersonnel = (ids: string[]) => ids.map(id => firefighterMap.get(id)).filter((f): f is Firefighter => !!f);
    const getItems = (ids: string[]) => ids.map(id => maintenanceItemMap.get(id)).filter((i): i is MaintenanceItem => !!i);

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

export const getVehicles = async (): Promise<Vehicle[]> => {
    if (!db) return [];
    const colRef = collection(db, 'vehicles');
    
    return getDocs(colRef)
        .then(async (querySnapshot) => {
            const [firefighters, maintenanceItems] = await Promise.all([getFirefighters(), getMaintenanceItems()]);
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            const maintenanceItemMap = new Map(maintenanceItems.map(i => [i.id, i]));
            
            const vehiclesPromises = querySnapshot.docs.map(docSnap => docToVehicle(docSnap, firefighterMap, maintenanceItemMap));
            const results = await Promise.all(vehiclesPromises);
            
            return results.sort((a, b) => {
                const numA = a.numeroMovil || '999';
                const numB = b.numeroMovil || '999';
                return numA.localeCompare(numB, undefined, { numeric: true });
            });
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: colRef.path,
                operation: 'list',
            }));
            return [];
        });
}

export const getVehicleById = async (id: string): Promise<Vehicle | null> => {
    if (!db) return null;
    const docRef = doc(db, 'vehicles', id);
    
    return getDoc(docRef)
        .then(async (docSnap) => {
            if (docSnap.exists()) {
                const [firefighters, maintenanceItems] = await Promise.all([getFirefighters(), getMaintenanceItems()]);
                const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
                const maintenanceItemMap = new Map(maintenanceItems.map(i => [i.id, i]));
                return await docToVehicle(docSnap, firefighterMap, maintenanceItemMap);
            }
            return null;
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            }));
            return null;
        });
}

export const addVehicle = (vehicleData: Omit<Vehicle, 'id' | 'encargados' | 'materialEncargados' | 'maintenanceItems'>, actor: LoggedInUser) => {
    if (!db) return;
    const colRef = collection(db, 'vehicles');
    const docRef = doc(colRef);
    const cleaned = cleanData(vehicleData);
    
    setDoc(docRef, cleaned).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: cleaned,
        }));
    });

    if (actor) {
        logAction(actor, 'CREATE_VEHICLE', { entity: 'vehicle', id: docRef.id }, cleaned);
    }
};

export const updateVehicle = (id: string, vehicleData: Partial<Omit<Vehicle, 'id' | 'encargados' | 'materialEncargados' | 'maintenanceItems'>>, actor: LoggedInUser = null) => {
    if (!db) return;
    const docRef = doc(db, 'vehicles', id);
    const cleaned = cleanData(vehicleData);
    
    updateDoc(docRef, cleaned).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: cleaned,
        }));
    });

    if (actor) {
        logAction(actor, 'UPDATE_VEHICLE', { entity: 'vehicle', id }, cleaned);
    }
};

export const deleteVehicle = (id: string, actor: LoggedInUser = null) => {
    if (!db) return;
    const docRef = doc(db, 'vehicles', id);
    
    deleteDoc(docRef).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        }));
    });

    if (actor) {
        logAction(actor, 'DELETE_VEHICLE', { entity: 'vehicle', id });
    }
};
