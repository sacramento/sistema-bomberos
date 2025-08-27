import type { Firefighter, Session, User } from '@/lib/types';

export const firefighters: Firefighter[] = [
  { id: 'FG-001', name: 'Juan Pérez', rank: 'Capitán', firehouse: 'Estación 1', status: 'Active' },
  { id: 'FG-002', name: 'Ana Gómez', rank: 'Teniente', firehouse: 'Estación 1', status: 'Active' },
  { id: 'FG-003', name: 'Carlos Sánchez', rank: 'Bombero', firehouse: 'Estación 2', status: 'Active' },
  { id: 'FG-004', name: 'Laura Fernández', rank: 'Bombero', firehouse: 'Estación 2', status: 'Inactive' },
  { id: 'FG-005', name: 'Miguel Torres', rank: 'Jefe de Batallón', firehouse: 'Cuartel Central', status: 'Active' },
  { id: 'FG-006', name: 'Patricia Ramírez', rank: 'Bombero', firehouse: 'Estación 3', status: 'Active' },
  { id: 'FG-007', name: 'Roberto Díaz', rank: 'Teniente', firehouse: 'Estación 3', status: 'Active' },
];

export const sessions: Session[] = [
  {
    id: 'S-001',
    title: 'Técnicas de Rescate Avanzadas',
    description: 'Una sesión sobre técnicas avanzadas para rescate vehicular y estructural.',
    specialization: 'Rescate',
    date: '2024-08-15',
    startTime: '09:00',
    instructors: [firefighters[0]],
    assistants: [firefighters[1]],
    attendees: firefighters.slice(2),
  },
  {
    id: 'S-002',
    title: 'Manejo de Materiales Peligrosos',
    description: 'Protocolo para la identificación y manejo de materiales peligrosos comunes.',
    specialization: 'MatPel',
    date: '2024-08-20',
    startTime: '10:00',
    instructors: [firefighters[4]],
    assistants: [],
    attendees: firefighters.slice(0, 4),
  },
  {
    id: 'S-003',
    title: 'Respuesta Médica de Emergencia',
    description: 'Capacitación en RCP y primeros auxilios avanzados.',
    specialization: 'Médica',
    date: '2024-09-01',
    startTime: '13:00',
    instructors: [firefighters[6]],
    assistants: [firefighters[1]],
    attendees: firefighters,
  },
];

export const users: User[] = [
    { id: 'U-001', name: 'Usuario Admin', email: 'admin@fuego.com', role: 'Administrador' },
    { id: 'U-002', name: 'Usuario Operador', email: 'operator@fuego.com', role: 'Operador' },
    { id: 'U-003', name: 'Usuario Asistente', email: 'assistant@fuego.com', role: 'Asistente' },
];
