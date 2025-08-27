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
    console.log(`Intentando iniciar sesión para el legajo: ${legajo}`);
    
    // Busca el usuario en Firestore por su ID (legajo).
    const user = await getUserById(legajo);

    if (!user) {
      console.log('Usuario no encontrado');
      return null;
    }

    // Simulación de verificación de contraseña.
    // ¡NUNCA hagas esto en producción! Por ahora, aceptamos cualquier contraseña.
    if (password) { 
      console.log(`Usuario encontrado: ${user.name}`);
      const { ...userData } = user;
      return userData;
    }

    console.log('Contraseña incorrecta');
    return null;
  }
);
