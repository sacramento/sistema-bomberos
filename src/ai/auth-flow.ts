
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
    
    // Busca al usuario directamente por su legajo, que es el ID del documento.
    const user = await getUserById(legajo);

    if (!user) {
      console.log('Usuario no encontrado');
      return null;
    }

    // Verificación de contraseña.
    if (user.password === password) { 
      console.log(`Usuario encontrado: ${user.name}`);
      
      // Prepara el objeto de usuario para devolver, asegurando que cumpla el esquema.
      // El objeto 'user' de la base de datos ya tiene la estructura correcta.
      // Solo necesitamos quitar la contraseña.
      const { password: _, ...userData } = user;
      
      // userData ya contiene 'id', 'name', 'role' ('Master' o 'Usuario') y 'roles' (el objeto modular).
      // Esto ahora coincide con LoginOutputSchema.
      return userData;
    }

    console.log('Contraseña incorrecta');
    return null;
  }
);
