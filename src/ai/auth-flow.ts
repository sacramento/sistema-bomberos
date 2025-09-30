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

    // Explicitly build the response object to match the output schema.
    // This is the only way to guarantee the structure is correct.
    const response: LoginOutput = {
      id: user.id,
      name: user.name,
      role: user.role, // This is guaranteed to be 'Master', 'Oficial', or 'Usuario' from the service.
      roles: {
        // If the global role is Master or Oficial, they get full admin visibility in all modules.
        // Otherwise, use their specific modular roles.
        asistencia: (user.role === 'Master' || user.role === 'Oficial') ? 'Administrador' : user.roles.asistencia,
        semanas: (user.role === 'Master' || user.role === 'Oficial') ? 'Administrador' : user.roles.semanas,
        movilidad: (user.role === 'Master' || user.role === 'Oficial') ? 'Administrador' : user.roles.movilidad,
      },
    };
    
    return response;
  }
);
