import { supabaseClient } from './supabaseClient.js';

// 1. Registrar un nuevo usuario
export async function registrarUsuario(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password
  });

  if (error) throw error;
  return data;
}

// 2. Iniciar sesión con email y contraseña
export async function iniciarSesion(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) throw error;
  return data;
}

// 3. Cerrar sesión
export async function cerrarSesion() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) throw error;
}

// 4. Obtener el usuario autenticado actualmente
export async function obtenerUsuarioActual() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  return session ? session.user : null;
}