'use client';

import { Vehicle, Firefighter, MaintenanceItem, LoggedInUser } from '@/lib/types';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, where, setDoc } from 'firebase/firestore';
import { getFirefighters } from './firefighters.service';
import { getMaintenanceItems } from './maintenance-items.service';
import { logAction } from './audit.service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const docToVehicle = async (
    docSnap: any, 
    firefighterMap: Map<string, Firefighter>,
    maintenanceItemMap: Map<string, MaintenanceItem>
): Promise<Vehicle> => {
    const data = docSnap.data();
    const encargados = (data.encargadoIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
    const materialEncargados = (data.materialEncargadoIds || []).map((id: string) => firefighterMap.get(id)).filter(Boolean) as Firefighter[];
    const maintenanceItems = (data.maintenanceItemIds || []).map((id: string) => maintenanceItemMap.get(id)).filter(Boolean) as MaintenanceItem[];

    return {
        id: docSnap.id,
        numeroMovil: data.numeroMovil,
        dominio: data.dominio || '',
        marca: data.marca,
        modelo: data.modelo,
        ano: data.ano,
        kilometraje: data.kilometraje,
        cuartel: data.cuartel,
        especialidad: data.especialidad,
        capacidadAgua: data.capacidadAgua,
        tipoVehiculo: data.tipoVehiculo,
        traccion: data.traccion,
        encargadoIds: data.encargadoIds || [],
        materialEncargadoIds: data.materialEncargadoIds || [],
        observaciones: data.observaciones,
        maintenanceItemIds: data.maintenanceItemIds || [],
        encargados,
        materialEncargados,
        maintenanceItems,
    };
}

export const getVehicles = async (): Promise<Vehicle[]> => {
    if (!db) return [];
    const colRef = collection(db, 'vehicles');
    const q = query(colRef, orderBy('numeroMovil', 'asc'));
    
    return getDocs(q)
        .then(async (querySnapshot) => {
            const firefighters = await getFirefighters();
            const firefighterMap = new Map(firefighters.map(f => [f.id, f]));
            const maintenanceItems = await getMaintenanceItems();
            const maintenanceItemMap = new Map(maintenanceItems.map(i => [i.id, i]));
            
            const vehiclesPromises = querySnapshot.docs.map(doc => docToVehicle(doc, firefighterMap, maintenanceItemMap));
            return await Promise.all(vehiclesPromises);
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
    if (!db) throw new Error("Database not initialized");
    const colRef = collection(db, 'vehicles');
    
    const docRef = doc(colRef);
    setDoc(docRef, vehicleData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'create',
            requestResourceData: vehicleData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'CREATE_VEHICLE', { entity: 'vehicle', id: docRef.id }, vehicleData);
    }
    return docRef.id;
};

export const updateVehicle = async (id: string, vehicleData: Partial<Omit<Vehicle, 'id' | 'encargados' | 'materialEncargados' | 'maintenanceItems'>>, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'vehicles', id);
    
    updateDoc(docRef, vehicleData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: vehicleData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'UPDATE_VEHICLE', { entity: 'vehicle', id }, vehicleData);
    }
};

export const deleteVehicle = async (id: string, actor: LoggedInUser): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, 'vehicles', id);
    
    deleteDoc(docRef).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    if (actor) {
        logAction(actor, 'DELETE_VEHICLE', { entity: 'vehicle', id });
    }
};
