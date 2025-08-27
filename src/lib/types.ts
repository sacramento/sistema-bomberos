export type Firefighter = {
  id: string;
  name: string;
  rank: 'Bombero' | 'Teniente' | 'Capitán' | 'Jefe de Batallón';
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
