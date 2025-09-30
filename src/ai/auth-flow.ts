
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
    
    // Construcción manual y explícita del objeto de respuesta para CUMPLIR con el schema.
    const response: LoginOutput = {
      id: user.id,
      name: user.name,
      role: user.role, // <-- Se usa SIEMPRE el rol global del usuario
      roles: { // Se usan los roles modulares que tiene el usuario en la DB
        asistencia: user.roles.asistencia,
        semanas: user.roles.semanas,
        movilidad: user.roles.movilidad,
      },
    };
    
    return response;
  }
);
