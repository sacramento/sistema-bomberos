import { z } from 'zod';

export const LoginInputSchema = z.object({
  legajo: z.string().describe('El ID de legajo del usuario.'),
  password: z.string().describe('La contraseña del usuario.'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

// Se simplifica el esquema. El flujo de login ahora solo valida el usuario y contraseña.
// La lógica de roles modulares se manejará en el cliente (AuthContext).
export const LoginOutputSchema = z.nullable(
  z.object({
    id: z.string(),
    name: z.string(),
    role: z.enum(['Master', 'Oficial', 'Usuario']),
    roles: z.object({
      asistencia: z.enum(['Administrador', 'Operador', 'Ayudantía', 'Bombero', 'Ninguno']),
      semanas: z.enum(['Administrador', 'Encargado', 'Bombero', 'Ninguno']),
      movilidad: z.enum(['Administrador', 'Operador', 'Bombero', 'Ninguno']),
    }),
  })
);
export type LoginOutput = z.infer<typeof LoginOutputSchema>;
