
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  GraduationCap,
  BarChart3,
  UserSquare,
  CalendarCheck,
  ListTodo,
  Truck,
  UserCircle,
  Wrench,
  Package,
  ScanLine,
  ClipboardMinus,
  Gavel,
  Archive,
  Shirt,
  Siren,
  Users,
  Settings,
  BookCopy,
  Droplets,
} from 'lucide-react';
import type { ActiveRole } from '@/lib/types';

export type NavItem = {
  href: string;
  icon: any;
  label: string;
  roles: ActiveRole[];
  module: 'asistencia' | 'semanas' | 'movilidad' | 'materiales' | 'general' | 'ayudantia' | 'roperia' | 'servicios' | 'cascada' | 'aspirantes';
};

export const navItems: NavItem[] = [
  // Asistencia
  { href: '/sessions', icon: LayoutDashboard, label: 'Dashboard Asistencia', roles: ['Master', 'Administrador', 'Oficial', 'Instructor'], module: 'asistencia' },
  { href: '/schedule', icon: CalendarDays, label: 'Cronograma', roles: ['Master', 'Administrador', 'Oficial', 'Instructor', 'Ayudantía', 'Bombero'], module: 'asistencia' },
  { href: '/classes', icon: CalendarClock, label: 'Clases', roles: ['Master', 'Administrador', 'Instructor', 'Oficial'], module: 'asistencia' },
  { href: '/talleres', icon: CalendarClock, label: 'Talleres', roles: ['Master', 'Administrador', 'Instructor', 'Oficial'], module: 'asistencia' },
  { href: '/courses', icon: GraduationCap, label: 'Cursos', roles: ['Master', 'Administrador', 'Oficial'], module: 'asistencia' },
  { href: '/reports', icon: BarChart3, label: 'Reportes', roles: ['Master', 'Administrador', 'Oficial', 'Instructor', 'Bombero'], module: 'asistencia' },
  
  // Aspirantes
  { href: '/aspirantes', icon: GraduationCap, label: 'Dashboard Aspirantes', roles: ['Master', 'Administrador', 'Oficial', 'Instructor'], module: 'aspirantes' },
  { href: '/aspirantes/clases', icon: CalendarClock, label: 'Clases', roles: ['Master', 'Administrador', 'Instructor', 'Oficial'], module: 'aspirantes' },
  { href: '/aspirantes/talleres', icon: CalendarClock, label: 'Talleres', roles: ['Master', 'Administrador', 'Instructor', 'Oficial'], module: 'aspirantes' },
  { href: '/aspirantes/cursos', icon: GraduationCap, label: 'Cursos', roles: ['Master', 'Administrador', 'Oficial'], module: 'aspirantes' },
  { href: '/aspirantes-reports', icon: BarChart3, label: 'Reportes', roles: ['Master', 'Administrador', 'Oficial', 'Instructor', 'Bombero'], module: 'aspirantes' },
  
  // Semanas
  { href: '/weeks/my-week', icon: UserSquare, label: 'Mi Semana', roles: ['Master', 'Administrador', 'Oficial', 'Encargado', 'Bombero'], module: 'semanas'},
  { href: '/weeks', icon: CalendarCheck, label: 'Semanas', roles: ['Master', 'Administrador', 'Oficial', 'Encargado', 'Bombero'], module: 'semanas'},
  { href: '/weeks/tasks', icon: ListTodo, label: 'Tareas', roles: ['Master', 'Administrador', 'Oficial'], module: 'semanas'},
  
  // Movilidad
  { href: '/vehicles', icon: Truck, label: 'Móviles', roles: ['Master', 'Administrador', 'Oficial', 'Encargado Móvil'], module: 'movilidad'},
  { href: '/drivers', icon: UserCircle, label: 'Choferes', roles: ['Master', 'Administrador', 'Oficial', 'Encargado Móvil'], module: 'movilidad'},
  { href: '/maintenance', icon: Wrench, label: 'Items', roles: ['Master', 'Administrador', 'Oficial', 'Encargado Móvil'], module: 'movilidad'},
  { href: '/mobility-reports', icon: BarChart3, label: 'Reportes', roles: ['Master', 'Administrador', 'Oficial', 'Encargado Móvil'], module: 'movilidad' },

  // Materiales
  { href: '/materials', icon: Package, label: 'Inventario', roles: ['Master', 'Administrador', 'Encargado', 'Oficial', 'Bombero'], module: 'materiales' },
  { href: '/materials-reports', icon: BarChart3, label: 'Reportes', roles: ['Master', 'Administrador', 'Encargado', 'Oficial', 'Bombero'], module: 'materiales'},
  { href: '/materials/vehicles', icon: ScanLine, label: 'Móviles (Vista)', roles: ['Master', 'Administrador', 'Encargado', 'Oficial', 'Bombero'], module: 'materiales' },

  // Ayudantia
  { href: '/leaves', icon: ClipboardMinus, label: 'Licencias', roles: ['Master', 'Administrador', 'Oficial'], module: 'ayudantia' },
  { href: '/sanctions', icon: Gavel, label: 'Sanciones', roles: ['Master', 'Administrador', 'Oficial'], module: 'ayudantia' },
  { href: '/inventory', icon: Archive, label: 'Inventario', roles: ['Master', 'Administrador', 'Oficial'], module: 'ayudantia' },

  // Roperia
  { href: '/clothing', icon: Shirt, label: 'Inventario Ropa', roles: ['Master', 'Administrador', 'Encargado', 'Oficial'], module: 'roperia' },
  { href: '/clothing-reports', icon: BarChart3, label: 'Reportes Ropa', roles: ['Master', 'Administrador', 'Encargado', 'Oficial', 'Bombero'], module: 'roperia' },

  // Servicios
  { href: '/services', icon: Siren, label: 'Servicios', roles: ['Master', 'Administrador', 'Oficial', 'Bombero'], module: 'servicios' },
  { href: '/services-reports', icon: BarChart3, label: 'Reportes', roles: ['Master', 'Administrador', 'Oficial', 'Bombero'], module: 'servicios' },

  // Cascada
  { href: '/cascade', icon: Droplets, label: 'Carga Cascada', roles: ['Master', 'Administrador', 'Encargado', 'Bombero'], module: 'cascada' },
  { href: '/cascade-reports', icon: BarChart3, label: 'Reportes Cascada', roles: ['Master', 'Administrador', 'Oficial', 'Instructor', 'Encargado', 'Bombero', 'Ayudantía', 'Encargado Móvil'], module: 'cascada' },

  // General
  { href: '/firefighters', icon: Users, label: 'Bomberos', roles: ['Master'], module: 'general' },
  { href: '/admin/users', icon: Settings, label: 'Admin Usuarios', roles: ['Master'], module: 'general' },
  { href: '/admin/logs', icon: BookCopy, label: 'Bitácora', roles: ['Master'], module: 'general' },
];
