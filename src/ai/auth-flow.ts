'use server';
/**
 * @fileOverview Flujo de autenticación de usuarios.
 *
 * - login - Valida las credenciales del usuario.
 */
import { ai } from '@/ai/genkit';
import { LoginInput, LoginInputSchema, LoginOutput, LoginOutputSchema } from '@/lib/schemas/auth.schema';
import { getUserById } from '@/services/users.service';

export async function login(input: LoginInput): Promise<LoginOutput> {
  return loginFlow(input);
}

const loginFlow = ai.defineFlow(
  {
    name: 'loginFlow',
    inputSchema: LoginInputSchema,
    outputSchema: LoginOutputSchema,
  },
  async ({ legajo, password }) => {
    const user = await getUserById(legajo);

    if (!user || user.password !== password) {
      return null;
    }

    // Now we can trust that `user` from `getUserById` is correctly structured.
    // We just need to build the final response object that matches the output schema.
    const response: LoginOutput = {
      id: user.id,
      name: user.name,
      role: user.role, // This is now guaranteed to be 'Master', 'Oficial', or 'Usuario'
      roles: {
        // If Master/Oficial, they get full admin visibility. Otherwise, use their specific modular roles.
        asistencia: (user.role === 'Master' || user.role === 'Oficial') ? 'Administrador' : user.roles.asistencia,
        semanas: (user.role === 'Master' || user.role === 'Oficial') ? 'Administrador' : user.roles.semanas,
        movilidad: (user.role === 'Master' || user.role === 'Oficial') ? 'Administrador' : user.roles.movilidad,
      },
    };
    
    return response;
  }
);
