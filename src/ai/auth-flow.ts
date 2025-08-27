'use server';
/**
 * @fileOverview Flujo de autenticación de usuarios.
 *
 * - login - Valida las credenciales del usuario.
 */
import { ai } from '@/ai/genkit';
import { LoginInput, LoginInputSchema, LoginOutput, LoginOutputSchema } from '@/lib/schemas/auth.schema';
import { getUserById, seedUsers } from '@/services/users.service';
import { User } from '@/lib/types';


// Seed data - only for initial setup
const initialUsers: User[] = [
    { id: 'U-001', name: 'Usuario Admin', password: 'password', role: 'Administrador' },
    { id: 'U-002', name: 'Usuario Operador', password: 'password', role: 'Operador' },
    { id: 'U-003', name: 'Usuario Asistente', password: 'password', role: 'Asistente' },
];

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
    
    // Asegurarse que los datos iniciales existan por si es la primera ejecución
    await seedUsers(initialUsers);
    
    // Busca el usuario en Firestore por su ID (legajo).
    const user = await getUserById(legajo);

    if (!user) {
      console.log('Usuario no encontrado');
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
