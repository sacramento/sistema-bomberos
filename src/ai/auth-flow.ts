
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
      
      // Construir el objeto de respuesta CUMPLIENDO el esquema de salida.
      // Este fue el punto del error anterior.
      const response: LoginOutput = {
          id: user.id,
          name: user.name,
          role: user.role, // 'Master' o 'Usuario'
          roles: user.roles, // El objeto con los roles modulares
      };
      
      return response;
    }

    console.log('Contraseña incorrecta');
    return null;
  }
);

