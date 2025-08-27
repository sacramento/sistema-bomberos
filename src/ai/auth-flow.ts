'use server';
/**
 * @fileOverview Flujo de autenticación de usuarios.
 *
 * - login - Valida las credenciales del usuario.
 */
import { ai } from '@/ai/genkit';
import { LoginInput, LoginInputSchema, LoginOutput, LoginOutputSchema } from '@/lib/schemas/auth.schema';
import { getUserById, getUsers } from '@/services/users.service';


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
    
    // This will seed the database if it's empty, ensuring collections exist.
    await getUsers();

    // Now, find the user in Firestore by their ID (legajo).
    const user = await getUserById(legajo);

    if (!user) {
      console.log('Usuario no encontrado');
      return null;
    }

    // Password verification.
    if (user.password === password) { 
      console.log(`Usuario encontrado: ${user.name}`);
      // Do not return password to the client.
      const { password: _, ...userData } = user;
      return userData;
    }

    console.log('Contraseña incorrecta');
    return null;
  }
);
