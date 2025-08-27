import type { Firefighter, Session, User } from '@/lib/types';

export const firefighters: Firefighter[] = [
  { id: 'FG-001', name: 'John Doe', rank: 'Captain', firehouse: 'Station 1', status: 'Active' },
  { id: 'FG-002', name: 'Jane Smith', rank: 'Lieutenant', firehouse: 'Station 1', status: 'Active' },
  { id: 'FG-003', name: 'Mike Johnson', rank: 'Firefighter', firehouse: 'Station 2', status: 'Active' },
  { id: 'FG-004', name: 'Emily Davis', rank: 'Firefighter', firehouse: 'Station 2', status: 'Inactive' },
  { id: 'FG-005', name: 'Chris Lee', rank: 'Battalion Chief', firehouse: 'Headquarters', status: 'Active' },
  { id: 'FG-006', name: 'Patricia Brown', rank: 'Firefighter', firehouse: 'Station 3', status: 'Active' },
  { id: 'FG-007', name: 'Robert Wilson', rank: 'Lieutenant', firehouse: 'Station 3', status: 'Active' },
];

export const sessions: Session[] = [
  {
    id: 'S-001',
    title: 'Advanced Rescue Techniques',
    description: 'A session on advanced techniques for vehicle and structural rescue.',
    specialization: 'Rescue',
    date: '2024-08-15',
    startTime: '09:00',
    instructors: [firefighters[0]],
    assistants: [firefighters[1]],
    attendees: firefighters.slice(2),
  },
  {
    id: 'S-002',
    title: 'Hazardous Materials Handling',
    description: 'Protocol for identifying and handling common hazardous materials.',
    specialization: 'HazMat',
    date: '2024-08-20',
    startTime: '10:00',
    instructors: [firefighters[4]],
    assistants: [],
    attendees: firefighters.slice(0, 4),
  },
  {
    id: 'S-003',
    title: 'Emergency Medical Response',
    description: 'CPR and advanced first aid training.',
    specialization: 'Medical',
    date: '2024-09-01',
    startTime: '13:00',
    instructors: [firefighters[6]],
    assistants: [firefighters[1]],
    attendees: firefighters,
  },
];

export const users: User[] = [
    { id: 'U-001', name: 'Admin User', email: 'admin@fuego.com', role: 'Administrator' },
    { id: 'U-002', name: 'Operator User', email: 'operator@fuego.com', role: 'Operator' },
    { id: 'U-003', name: 'Assistant User', email: 'assistant@fuego.com', role: 'Assistant' },
];
