
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
      
      // Construimos el objeto de respuesta CUMPLIENDO el esquema de salida.
      // Esta es la única fuente de verdad para la respuesta.
      const response: LoginOutput = {
          id: user.id,
          name: user.name,
          role: user.role, // Este es el rol global: 'Master' o 'Usuario'
          roles: { // Este es el objeto de roles modulares
              asistencia: user.roles.asistencia || 'Ninguno',
              semanas: user.roles.semanas || 'Ninguno',
              movilidad: user.roles.movilidad || 'Ninguno',
          }
      };
      
      return response;
    }

    console.log('Contraseña incorrecta');
    return null;
  }
);
