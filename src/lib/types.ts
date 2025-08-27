export type Firefighter = {
  id: string;
  name: string;
  rank: 'Firefighter' | 'Lieutenant' | 'Captain' | 'Battalion Chief';
  firehouse: string;
  status: 'Active' | 'Inactive';
};

export type Session = {
  id: string;
  title: string;
  description: string;
  specialization: 'HazMat' | 'Medical' | 'Rescue' | 'General';
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
  type: 'Ordinary' | 'Extraordinary' | 'Sanction' | 'Illness' | 'Study';
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Operator' | 'Assistant';
};
