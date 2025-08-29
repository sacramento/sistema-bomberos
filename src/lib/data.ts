
import type { Firefighter, Session, User } from '@/lib/types';

// This file is now deprecated for production use, but kept for reference or testing.
// All data is now fetched from and saved to Firebase Firestore.

export const users: User[] = [
  { id: 'U-001', name: 'Usuario Admin', password: 'password', role: 'Administrador'},
  { id: 'U-002', name: 'Usuario Operador', password: 'password', role: 'Operador'},
  { id: 'U-003', name: 'Usuario Asistente', password: 'password', role: 'Asistente'},
];

export const firefighters: Firefighter[] = [
  { id: 'FG-001', firstName: 'Juan', lastName: 'Perez', rank: 'COMANDANTE', firehouse: 'Cuartel 1', status: 'Active' },
  { id: 'FG-002', firstName: 'Ana', lastName: 'Gomez', rank: 'OFICIAL PRINCIPAL', firehouse: 'Cuartel 1', status: 'Active' },
  { id: 'FG-003', firstName: 'Carlos', lastName: 'Sanchez', rank: 'BOMBERO', firehouse: 'Cuartel 2', status: 'Active' },
  { id: 'FG-004', firstName: 'Laura', lastName: 'Fernandez', rank: 'BOMBERO', firehouse: 'Cuartel 2', status: 'Inactive' },
  { id: 'FG-005', firstName: 'Miguel', lastName: 'Torres', rank: 'COMANDANTE MAYOR', firehouse: 'Cuartel Central', status: 'Active' },
  { id: 'FG-006', firstName: 'Patricia', lastName: 'Ramirez', rank: 'CABO', firehouse: 'Cuartel 3', status: 'Active' },
  { id: 'FG-007', firstName: 'Roberto', lastName: 'Diaz', rank: 'SARGENTO', firehouse: 'Cuartel 3', status: 'Active' },
];

export const sessions: Session[] = [
  {
    id: 'S-001',
    title: 'Técnicas de Rescate Avanzadas',
    description: 'Una sesión sobre técnicas avanzadas para rescate vehicular y estructural.',
    specialization: 'RESCATE',
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
    specialization: 'HAZ-MAT',
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
    specialization: 'APH',
    date: '2024-09-01',
    startTime: '13:00',
    instructors: [firefighters[6]],
    assistants: [firefighters[1]],
    attendees: firefighters,
  },
];
