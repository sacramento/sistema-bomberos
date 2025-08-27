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
  status: 'Activo' | 'Inactivo';
};

export type Session = {
  id: string;
  title: string;
  description: string;
  specialization: 'MatPel' | 'Médica' | 'Rescate' | 'General';
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

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Operador' | 'Asistente';
};

// Tipo para el usuario logueado, puede ser nulo si no está autenticado
export type LoggedInUser = User | null;
