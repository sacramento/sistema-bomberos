
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
    
    // El flujo ahora es mucho más simple.
    // Solo valida las credenciales y devuelve el objeto de usuario completo.
    // La lógica de "qué rol usar y dónde" se traslada al cliente (AuthContext).
    // Esto evita los problemas de validación de esquema en Genkit.
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      roles: user.roles,
    };
  }
);
