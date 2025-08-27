export type Firefighter = {
  id: string;
  name: string;
  rank:
    | 'ASPIRANTE'
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
  status: 'Active' | 'Inactive';
};

export type Session = {
  id: string;
  title: string;
  description: string;
  specialization: 'APH' | 'BUCEO' | 'FORESTAL' | 'FUEGO' | 'GORA' | 'HAZ-MAT' | 'KAIZEN' | 'PAE' | 'RESCATE' | 'VARIOS';
  date: string;
  startTime: string;
  instructors: Firefighter[];
  assistants: Firefighter[];
  attendees: Firefighter[];
};

export type Leave = {
  id: string;
  firefighter: Firefighter;
  startDate: string;
  endDate: string;
  type: 'Ordinaria' | 'Extraordinaria' | 'Sanción' | 'Enfermedad' | 'Estudio';
};

export type UserRole = 'Administrador' | 'Operador' | 'Asistente';

export type User = {
  id: string;
  name: string;
  password: string;
  role: UserRole;
};

// Tipo para el usuario logueado, puede ser nulo si no está autenticado
export type LoggedInUser = Omit<User, 'password'> | null;
