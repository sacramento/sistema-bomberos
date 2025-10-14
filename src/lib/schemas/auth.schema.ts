

import { z } from 'zod';

export const LoginInputSchema = z.object({
  legajo: z.string().describe('El ID de legajo del usuario.'),
  password: z.string().describe('La contraseña del usuario.'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const LoginOutputSchema = z.nullable(
  z.object({
    id: z.string(),
    name: z.string(),
    role: z.enum(['Master', 'Usuario']),
    roles: z.object({
      asistencia: z.enum(['Administrador', 'Oficial', 'Instructor', 'Ayudantía', 'Bombero', 'Ninguno']),
      semanas: z.enum(['Administrador', 'Oficial', 'Encargado', 'Bombero', 'Ninguno']),
      movilidad: z.enum(['Administrador', 'Oficial', 'Encargado Móvil', 'Ninguno']),
      materiales: z.enum(['Administrador', 'Oficial', 'Encargado', 'Bombero', 'Ninguno']),
    }),
  })
);
export type LoginOutput = z.infer<typeof LoginOutputSchema>;
