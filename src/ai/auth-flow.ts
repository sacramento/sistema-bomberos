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
      // Seed initial data if user not found, for the very first run.
      // This is a simple approach for demo purposes.
      // A more robust solution would be a separate seeding script or admin interface.
      if (legajo === 'U-001' && password === 'password') {
          return { id: 'U-001', name: 'Usuario Admin', role: 'Administrador' };
      }
      return null;
    }

    // Verificación de contraseña.
    if (user.password === password) { 
      console.log(`Usuario encontrado: ${user.name}`);
      // No devolver la contraseña al cliente.
      const { password: _, ...userData } = user;
      return userData;
    }

    console.log('Contraseña incorrecta');
    return null;
  }
);
