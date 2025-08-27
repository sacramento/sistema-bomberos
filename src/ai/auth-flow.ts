'use server';
/**
 * @fileOverview Flujo de autenticación de usuarios.
 *
 * - login - Valida las credenciales del usuario.
 */
import { ai } from '@/ai/genkit';
import { users } from '@/lib/data';
import { LoginInput, LoginInputSchema, LoginOutput, LoginOutputSchema } from '@/lib/schemas/auth.schema';


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
    
    // Simulación de búsqueda en base de datos.
    // En una aplicación real, aquí consultarías tu base de datos y verificarías la contraseña (hasheada).
    // Por ahora, solo buscamos por legajo (id) y aceptamos cualquier contraseña.
    const user = users.find((u) => u.id === legajo);

    if (!user) {
      console.log('Usuario no encontrado');
      return null;
    }

    // Simulación de verificación de contraseña.
    // ¡NUNCA hagas esto en producción!
    if (password) { // Aceptamos cualquier contraseña por ahora.
      console.log(`Usuario encontrado: ${user.name}`);
      const { ...userData } = user;
      return userData;
    }

    console.log('Contraseña incorrecta');
    return null;
  }
);
