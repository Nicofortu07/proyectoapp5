// ==========================================
// main.js - Módulo Principal con Auth, CRUD y RLS
// ==========================================

import { supabaseClient } from './supabaseClient.js';
import { registrarUsuario, iniciarSesion, cerrarSesion, obtenerUsuarioActual } from './auth.js';

// Elementos del DOM - Auth
const authLoggedOut = document.getElementById('auth-logged-out');
const authLoggedIn = document.getElementById('auth-logged-in');
const inputAuthEmail = document.getElementById('auth-email');
const inputAuthPassword = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const userEmailDisplay = document.getElementById('user-email-display');

// Elementos del DOM - CRUD
const formSerie = document.getElementById('form-serie');
const inputSerieId = document.getElementById('serie-id');
const formTituloHeader = document.getElementById('form-titulo');
const inputTitulo = document.getElementById('titulo');
const selectGenero = document.getElementById('genero');
const inputPuntuacion = document.getElementById('puntuacion');
const inputImagenFile = document.getElementById('imagen_file');
const inputImagenUrl = document.getElementById('imagen_url');
const textareaResena = document.getElementById('resena');
const btnSubmit = document.getElementById('btn-submit');
const gridSeries = document.getElementById('grid-series');

let usuarioActual = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  await verifiqueSesion();
  cargarSeries();
});

// Control del estado de la sesión
async function verifiqueSesion() {
  usuarioActual = await obtenerUsuarioActual();
  
  if (usuarioActual) {
    if (authLoggedOut) authLoggedOut.classList.add('hidden');
    if (authLoggedIn) authLoggedIn.classList.remove('hidden');
    if (userEmailDisplay) userEmailDisplay.textContent = usuarioActual.email;
    if (btnSubmit) btnSubmit.disabled = false;
  } else {
    if (authLoggedOut) authLoggedOut.classList.remove('hidden');
    if (authLoggedIn) authLoggedIn.classList.add('hidden');
    if (userEmailDisplay) userEmailDisplay.textContent = '';
  }
}

// Eventos de Autenticación
if (btnRegister) {
  btnRegister.addEventListener('click', async () => {
    const email = inputAuthEmail.value.trim();
    const password = inputAuthPassword.value.trim();

    if (!email || !password) return alert('Ingresá email y contraseña.');

    try {
      await registrarUsuario(email, password);
      alert('✅ Registro exitoso. ¡Ahora podés iniciar sesión!');
    } catch (err) {
      alert('❌ Error al registrarse: ' + err.message);
    }
  });
}

if (btnLogin) {
  btnLogin.addEventListener('click', async () => {
    const email = inputAuthEmail.value.trim();
    const password = inputAuthPassword.value.trim();

    if (!email || !password) return alert('Ingresá email y contraseña.');

    try {
      await iniciarSesion(email, password);
      alert('🔑 ¡Sesión iniciada correctamente!');
      await verifiqueSesion();
      cargarSeries();
    } catch (err) {
      alert('❌ Error de ingreso: ' + err.message);
    }
  });
}

if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    try {
      await cerrarSesion();
      alert('👋 Sesión cerrada.');
      await verifiqueSesion();
      cargarSeries();
    } catch (err) {
      alert('❌ Error al cerrar sesión: ' + err.message);
    }
  });
}

// Cargar catálogo y verificar propietarios (RLS)
async function cargarSeries() {
  if (!gridSeries) return;

  gridSeries.innerHTML = '<p class="loading">Cargando recomendaciones...</p>';

  try {
    const { data: series, error } = await supabaseClient
      .from('series')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    gridSeries.innerHTML = '';

    if (!series || series.length === 0) {
      gridSeries.innerHTML = '<p class="empty">No hay recomendaciones publicadas aún.</p>';
      return;
    }

    series.forEach(serie => {
      const card = document.createElement('article');
      card.classList.add('card-serie');

      const imgPortada = serie.imagen_url || 'https://via.placeholder.com/300x450?text=Sin+Portada';
      const esPropietario = usuarioActual && usuarioActual.email === serie.user_email;

      card.innerHTML = `
        <img src="${imgPortada}" alt="${serie.titulo}" class="card-img">
        <div class="card-body">
          <span class="badge-genero">${serie.genero}</span>
          <h3 class="card-title">${serie.titulo}</h3>
          <p class="card-puntuacion">⭐ ${serie.puntuacion} / 5</p>
          <p class="card-resena">${serie.resena}</p>
          <p class="card-autor" style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">Publicado por: ${serie.user_email || 'Anónimo'}</p>
          
          ${esPropietario ? `
            <div class="card-actions">
              <button class="btn-action btn-edit">Editar</button>
              <button class="btn-action btn-delete">Eliminar</button>
            </div>
          ` : ''}
        </div>
      `;

      // Asignación segura de eventos para los botones de la tarjeta
      if (esPropietario) {
        card.querySelector('.btn-edit').addEventListener('click', () => prepararEdicion(serie.id));
        card.querySelector('.btn-delete').addEventListener('click', () => eliminarSerie(serie.id));
      }

      gridSeries.appendChild(card);
    });

  } catch (err) {
    console.error('Error al cargar:', err.message);
    gridSeries.innerHTML = '<p class="error">Error al obtener recomendaciones.</p>';
  }
}

// Subida de imagen a Supabase Storage
async function subirImagen(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;

  const { error } = await supabaseClient.storage
    .from('portadas')
    .upload(fileName, file);

  if (error) throw error;

  const { data: publicUrlData } = supabaseClient.storage
    .from('portadas')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

// Preparar Edición
window.prepararEdicion = async (id) => {
  try {
    const { data: serie, error } = await supabaseClient
      .from('series')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    inputSerieId.value = serie.id;
    inputTitulo.value = serie.titulo;
    selectGenero.value = serie.genero;
    inputPuntuacion.value = serie.puntuacion;
    inputImagenUrl.value = serie.imagen_url;
    textareaResena.value = serie.resena;

    formTituloHeader.textContent = 'Editar Recomendación';
    btnSubmit.textContent = 'Guardar Cambios';
    btnSubmit.classList.add('btn-warning');

    formSerie.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error('Error al preparar edición:', err);
    alert('❌ Error al cargar registro para edición.');
  }
};

// Eliminar Serie
window.eliminarSerie = async (id) => {
  if (!confirm('¿Seguro que querés borrar tu recomendación?')) return;

  try {
    const { error } = await supabaseClient
      .from('series')
      .delete()
      .eq('id', id);

    if (error) throw error;

    alert('🗑️ Registro eliminado.');
    cargarSeries();

  } catch (err) {
    alert('❌ Error de permisos o de red: ' + err.message);
  }
};

// Guardar o Actualizar
if (formSerie) {
  formSerie.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!usuarioActual) {
      alert('⚠️ Debés iniciar sesión para publicar una recomendación.');
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Procesando...';

    try {
      let finalImageUrl = inputImagenUrl.value.trim();

      if (inputImagenFile && inputImagenFile.files && inputImagenFile.files[0]) {
        finalImageUrl = await subirImagen(inputImagenFile.files[0]);
      }

      if (!finalImageUrl) {
        alert('Proporcioná una imagen.');
        btnSubmit.disabled = false;
        btnSubmit.textContent = inputSerieId.value ? 'Guardar Cambios' : 'Publicar Recomendación';
        return;
      }

      const datosSerie = {
        titulo: inputTitulo.value.trim(),
        genero: selectGenero.value,
        puntuacion: parseFloat(inputPuntuacion.value),
        imagen_url: finalImageUrl,
        resena: textareaResena.value.trim(),
        user_email: usuarioActual.email // RLS asocia la fila al email del usuario logueado
      };

      const idEditar = inputSerieId.value;

      if (idEditar) {
        const { error } = await supabaseClient
          .from('series')
          .update(datosSerie)
          .eq('id', idEditar);

        if (error) throw error;
        alert('✏️ Recomendación actualizada.');
      } else {
        const { error } = await supabaseClient
          .from('series')
          .insert([datosSerie]);

        if (error) throw error;
        alert('✅ Recomendación publicada.');
      }

      formSerie.reset();
      inputSerieId.value = '';
      formTituloHeader.textContent = 'Recomendar una Serie';
      btnSubmit.textContent = 'Publicar Recomendación';
      btnSubmit.classList.remove('btn-warning');
      cargarSeries();

    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = inputSerieId.value ? 'Guardar Cambios' : 'Publicar Recomendación';
    }
  });
}