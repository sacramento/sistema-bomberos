
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

    // Construcción manual y explícita para garantizar la validez del esquema.
    // Este es el único lugar donde se construye la respuesta.
    const response: LoginOutput = {
      id: user.id,
      name: user.name,
      role: user.role, // Esto asegura que siempre se use el rol global: 'Master', 'Oficial', o 'Usuario'.
      roles: {
        // Si el rol global es de supervisión, se asigna 'Administrador' para dar visibilidad total.
        // De lo contrario, se usan los roles específicos del usuario.
        asistencia: (user.role === 'Master' || user.role === 'Oficial') ? 'Administrador' : user.roles.asistencia,
        semanas: (user.role === 'Master' || user.role === 'Oficial') ? 'Administrador' : user.roles.semanas,
        movilidad: (user.role === 'Master' || user.role === 'Oficial') ? 'Administrador' : user.roles.movilidad,
      },
    };
    
    return response;
  }
);
