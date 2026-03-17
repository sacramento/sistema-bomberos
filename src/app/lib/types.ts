
export type Firefighter = {
  id: string; 
  legajo: string;
  firstName: string;
  lastName: string;
  rank:
    | 'ASPIRANTE'
    | 'ADAPTACION'
    | 'BOMBERO'
    | 'CABO'
    | 'CABO PRIMERO'
    | 'SARGENTO'
    | 'SARGENTO PRIMERO'
    | 'SUBOFICIAL PRINCIPAL'
    | 'SUBOFICIAL MAYOR'
    | 'OFICIAL AYUDANTE'
    | 'OFICIAL INSPECTOR'
    | 'OFICIAL PRINCIPAL'
    | 'SUBCOMANDANTE'
    | 'COMANDANTE'
    | 'COMANDANTE MAYOR'
    | 'COMANDANTE GENERAL';
  firehouse: string;
  status: 'Active' | 'Inactive' | 'Auxiliar';
};

export type AttendanceStatus = "present" | "absent" | "tardy" | "excused" | "recupero";

export type Specialization = 'APH' | 'BUCEO' | 'FORESTAL' | 'FUEGO' | 'GORA' | 'HAZ-MAT' | 'KAIZEN' | 'PAE' | 'RESCATE VEHICULAR' | 'RESCATE URBANO' | 'GENERAL';

export type Session = {
  id: string;
  title: string;
  description: string;
  specialization: Specialization;
  date: string;
  startTime: string;
  instructors: Firefighter[];
  assistants: Firefighter[];
  attendees: Firefighter[];
  instructorIds?: string[];
  assistantIds?: string[];
  attendeeIds?: string[];
  attendance?: Record<string, AttendanceStatus>; 
};

export type LeaveType = 'Ordinaria' | 'Extraordinaria' | 'Enfermedad' | 'Estudio' | 'Maternidad';

export type Leave = {
  id: string;
  firefighterId: string; 
  firefighterName: string; 
  startDate: string;
  endDate: string;
  type: LeaveType;
};

export type Sanction = {
  id: string;
  firefighterId: string;
  firefighterName: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export type Course = {
  id: string;
  firefighterId: string;
  firefighterName: string;
  firefighterLegajo: string;
  specialization: Specialization;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
}

export type VehicleStatus = 'Operativo' | 'No operativo' | 'Fuera de Dotación';

export type Vehicle = {
  id: string;
  numeroMovil: string;
  dominio: string;
  marca: string;
  modelo: string;
  ano: number;
  kilometraje: number;
  cuartel: 'Cuartel 1' | 'Cuartel 2' | 'Cuartel 3';
  especialidad: Specialization;
  capacidadAgua: number;
  tipoVehiculo: 'Liviana' | 'Mediana' | 'Pesada' | 'Cisterna';
  traccion: 'Trasera' | 'Delantera' | '4x4';
  status: VehicleStatus;
  encargadoIds: string[]; 
  materialEncargadoIds: string[]; 
  observaciones: string;
  maintenanceItemIds?: string[]; 
  encargados?: Firefighter[];
  materialEncargados?: Firefighter[];
  maintenanceItems?: MaintenanceItem[];
}

export type SparePart = {
  id: string;
  vehicleId: string;
  name: string;
  brand?: string;
  code?: string;
  observations?: string;
};

export type MaintenanceChecklistItem = {
  name: string;
  checked: boolean;
};

export type MaintenanceRecord = {
  id: string;
  vehicleId: string;
  date: string; 
  mileage: number; 
  nextServiceDate?: string;
  nextServiceMileage?: number;
  checklist: MaintenanceChecklistItem[];
  observations: string;
  assistantIds?: string[];
  assistants?: Firefighter[];
};

export type RepairType = 'Mecanica' | 'Electrica' | 'Neumatica' | 'Hidraulica' | 'Carrocería';

export type RepairRecord = {
  id: string;
  vehicleId: string;
  date: string; 
  mileage: number; 
  repairType: RepairType;
  details: string;
  externalPersonnel?: string;
  personnelIds: string[];
  personnel?: Firefighter[];
};

export type MaintenanceItem = {
    id: string;
    name: string;
};

export type Material = {
  id: string;
  codigo: string;
  nombre: string;
  categoryId: string; 
  subCategoryId: string; 
  itemTypeId: string; 
  marca?: string;
  modelo?: string;
  acople?: 'Storz' | 'NH' | 'QC' | 'DSP' | 'Withworth' | 'Otro';
  composicion?: 'Tela' | 'Goma';
  caracteristicas?: string;
  medida?: string; 
  ubicacion: {
    type: 'vehiculo' | 'deposito';
    vehiculoId?: string; 
    baulera?: string; 
    deposito?: 'Cuartel 1' | 'Cuartel 2' | 'Cuartel 3';
  };
  estado: 'En Servicio' | 'Fuera de Servicio';
  condicion: 'Bueno' | 'Regular' | 'Malo';
  cuartel: 'Cuartel 1' | 'Cuartel 2' | 'Cuartel 3';
  vehiculo?: Vehicle;
}

export type MaterialRequest = {
    id: string;
    type: 'UPDATE' | 'DELETE';
    materialId: string;
    materialNombre: string;
    materialCodigo: string;
    requestedById: string;
    requestedByName: string;
    requestedAt: string; 
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    data: any; 
    originalData?: any; 
}

export type GeneralInventoryItem = {
  id: string;
  codigo: string;
  nombre: string;
  categoryId: string;
  subCategoryId: string;
  itemTypeId: string;
  marca?: string;
  modelo?: string;
  cuartel: 'Cuartel 1' | 'Cuartel 2' | 'Cuartel 3' | 'Comision';
  ubicacion: 'Baño' | 'Matera' | 'Cocina' | 'Roperia' | 'Cadetes' | 'Deposito' | 'Jefatura' | 'Cambiaderos' | 'Patio' | 'Playón' | 'Guardia' | 'Ayudantia';
  estado: 'En Servicio' | 'Fuera de Servicio';
  condicion: 'Bueno' | 'Regular' | 'Malo';
  caracteristicas?: string;
}

export type CascadeCharge = {
    id: string;
    materialId: string;
    materialCode: string;
    chargeTimestamp: string | null; 
    cuartel: 'Cuartel 1' | 'Cuartel 2' | 'Cuartel 3';
    actorId: string;
    actorName: string;
};

export type CascadeSystemCharge = {
  id: string;
  tubes: ('Tubo 1' | 'Tubo 2' | 'Tubo 3' | 'Tubo 4')[];
  startTime: string | null; 
  endTime: string | null; 
  actorId: string;
  actorName: string;
};


export type AttendanceModuleRole = 'Administrador' | 'Oficial' | 'Instructor' | 'Bombero' | 'Ninguno';
export type WeekModuleRole = 'Administrador' | 'Oficial' | 'Encargado' | 'Bombero' | 'Ninguno';
export type MobilityModuleRole = 'Administrador' | 'Oficial' | 'Encargado Móvil' | 'Ninguno';
export type MaterialesModuleRole = 'Administrador' | 'Oficial' | 'Encargado' | 'Bombero' | 'Ninguno';
export type AyudantiaModuleRole = 'Administrador' | 'Oficial' | 'Ninguno';
export type RoperiaModuleRole = 'Administrador' | 'Encargado' | 'Oficial' | 'Bombero' | 'Ninguno';
export type ServiciosModuleRole = 'Administrador' | 'Oficial' | 'Bombero' | 'Ninguno';
export type CascadaModuleRole = 'Administrador' | 'Encargado' | 'Bombero' | 'Ninguno';
export type AspirantesModuleRole = 'Administrador' | 'Oficial' | 'Instructor' | 'Bombero' | 'Ninguno';


export type GlobalRole = 'Master' | 'Usuario';

export type User = {
  id: string; 
  name: string;
  password?: string;
  role: GlobalRole; 
  roles: {
    asistencia: AttendanceModuleRole;
    semanas: WeekModuleRole;
    movilidad: MobilityModuleRole;
    materiales: MaterialesModuleRole;
    ayudantia: AyudantiaModuleRole;
    roperia: RoperiaModuleRole;
    servicios: ServiciosModuleRole;
    cascada: CascadaModuleRole;
    aspirantes: AspirantesModuleRole;
  };
};

export type LoggedInUser = Omit<User, 'password'> | null;


export type Week = {
    id: string;
    name: string;
    firehouse: 'Cuartel 1' | 'Cuartel 2' | 'Cuartel 3';
    periodStartDate: string;
    periodEndDate: string;
    leadId: string; 
    driverId: string; 
    memberIds: string[]; 
    allMemberIds: string[]; 
    observations: string; 
    lead: Firefighter | null;
    driver: Firefighter | null;
    members?: Firefighter[];
    allMembers?: Firefighter[]; 
}

export type Task = {
    id: string;
    weekId: string;
    title: string;
    description: string;
    assignedToIds: string[];
    status: 'Pendiente' | 'Completada';
    createdAt: string | null;
    startDate?: string;
    endDate?: string;
    assignedTo?: Firefighter[];
}

export type Habilitacion = 'Practica' | 'Liviana' | 'Pesada' | 'Timonel';

export type Driver = {
    id: string;
    firefighterId: string;
    habilitaciones: Habilitacion[];
    firefighter?: Firefighter;
}

export type AuditLogAction = 
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE'
  | 'CREATE_USER' | 'UPDATE_USER' | 'DELETE_USER'
  | 'CREATE_FIREFIGHTER' | 'UPDATE_FIREFIGHTER' | 'DELETE_FIREFIGHTER' | 'BATCH_IMPORT_FIREFIGHTERS'
  | 'CREATE_SESSION' | 'UPDATE_SESSION' | 'DELETE_SESSION' | 'UPDATE_ATTENDANCE'
  | 'CREATE_WORKSHOP' | 'UPDATE_WORKSHOP' | 'DELETE_WORKSHOP'
  | 'CREATE_LEAVE' | 'UPDATE_LEAVE' | 'DELETE_LEAVE'
  | 'CREATE_SANCTION' | 'UPDATE_SANCTION' | 'DELETE_SANCTION'
  | 'CREATE_COURSE' | 'UPDATE_COURSE' | 'DELETE_COURSE' | 'BATCH_CREATE_COURSES'
  | 'CREATE_WEEK' | 'UPDATE_WEEK' | 'DELETE_WEEK'
  | 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK'
  | 'CREATE_VEHICLE' | 'UPDATE_VEHICLE' | 'DELETE_VEHICLE'
  | 'CREATE_MAINTENANCE_ITEM' | 'UPDATE_MAINTENANCE_ITEM' | 'DELETE_MAINTENANCE_ITEM'
  | 'CREATE_MAINTENANCE_RECORD' | 'UPDATE_MAINTENANCE_RECORD' | 'DELETE_MAINTENANCE_RECORD'
  | 'CREATE_REPAIR_RECORD' | 'UPDATE_REPAIR_RECORD' | 'DELETE_REPAIR_RECORD'
  | 'CREATE_SPARE_PART' | 'UPDATE_SPARE_PART' | 'DELETE_SPARE_PART'
  | 'CREATE_MATERIAL' | 'UPDATE_MATERIAL' | 'DELETE_MATERIAL' | 'BATCH_IMPORT_MATERIALS'
  | 'CREATE_CLOTHING_ITEM' | 'UPDATE_CLOTHING_ITEM' | 'DELETE_CLOTHING_ITEM' | 'BATCH_IMPORT_CLOTHING'
  | 'CREATE_GENERAL_INVENTORY_ITEM' | 'UPDATE_GENERAL_INVENTORY_ITEM' | 'DELETE_GENERAL_INVENTORY_ITEM'
  | 'CREATE_DRIVER' | 'UPDATE_DRIVER' | 'DELETE_DRIVER'
  | 'CREATE_SERVICE' | 'UPDATE_SERVICE' | 'DELETE_SERVICE'
  | 'CREATE_CASCADE_CHARGE'
  | 'CREATE_CASCADE_SYSTEM_CHARGE'
  | 'CREATE_DUTY_CHECK' | 'UPDATE_DUTY_CHECK' | 'DELETE_DUTY_CHECK';

export type AuditLog = {
    id: string;
    timestamp: any; 
    userId: string;
    userName: string;
    action: AuditLogAction;
    targetEntity: string;
    targetId: string;
    details?: Record<string, any>;
};

export type DutyCheckStatus = 'OK' | 'FALLA';

export type DutyCheckItem = {
    id: string;
    name: string;
    status: DutyCheckStatus;
    observations?: string;
};

export type DutyCheck = {
    id: string;
    weekId: string;
    vehicleId: string;
    inspectorId: string;
    inspectorName: string;
    cuartel: 'Cuartel 1' | 'Cuartel 2' | 'Cuartel 3';
    date: string;
    vehicleChecks: DutyCheckItem[];
    equipmentChecks: (DutyCheckItem & { materialId: string, materialCode?: string })[];
}
