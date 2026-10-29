/**
 * Contexto de sesión: el único lugar de la app que habla con Firebase Auth.
 *
 * Las pantallas no importan Firebase directamente; llaman a las funciones de
 * este contexto (iniciarSesion, registrarse, etc.). Así, si mañana se cambia
 * Firebase por otro proveedor, solo se reescribe este archivo.
 */
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, createElement, use, useEffect, useState, type ReactNode } from 'react';
 
import { auth } from '@/config/firebase';
 
type ValorSesion = {
  /** Usuario conectado, o null si nadie ha iniciado sesión. */
  usuario: User | null;
  /** Nombre del perfil (displayName), siempre actualizado tras el registro. */
  nombre: string | null;
  /** true solo cuando la cuenta conectada confirmó su correo. */
  correoVerificado: boolean;
  /** true mientras Firebase revisa si hay una sesión guardada. */
  cargando: boolean;
  iniciarSesion: (correo: string, clave: string) => Promise<void>;
  registrarse: (nombre: string, correo: string, clave: string) => Promise<void>;
  enviarCorreoRecuperacion: (correo: string) => Promise<void>;
  /** Envía (o reenvía) el correo de verificación a la cuenta conectada. */
  enviarCorreoVerificacion: () => Promise<void>;
  /** Pregunta de nuevo a Firebase si el correo ya fue verificado. */
  comprobarVerificacion: () => Promise<boolean>;
  cambiarClave: (claveActual: string, claveNueva: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
};
 
const ContextoSesion = createContext<ValorSesion | null>(null);
 
/** Hook para leer la sesión desde cualquier pantalla. */
export function useSesion(): ValorSesion {
  // `use` es la forma moderna (React 19) de leer un contexto.
  const valor = use(ContextoSesion);
  if (!valor) {
    throw new Error('useSesion debe usarse dentro de <ProveedorSesion>.');
  }
  return valor;
}
 
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(true);
  // Nombre del perfil guardado aparte: updateProfile modifica el mismo objeto
  // `user` sin cambiar su referencia, así que React no detectaría el cambio
  // si las pantallas leyeran usuario.displayName directamente.
  const [nombre, setNombre] = useState<string | null>(null);
  // Igual que `nombre`: emailVerified cambia sobre el mismo objeto `user` sin
  // cambiar su referencia, así que lo guardamos aparte para que React reaccione.
  const [correoVerificado, setCorreoVerificado] = useState(false);

  useEffect(() => {
    // onAuthStateChanged se dispara al arrancar (con la sesión guardada o null)
    // y cada vez que alguien inicia o cierra sesión. Es la fuente de verdad:
    // la navegación (Stack.Protected en _layout.tsx) depende de este estado.
    const cancelarSuscripcion = onAuthStateChanged(auth, (usuarioFirebase) => {
      setUsuario(usuarioFirebase);
      setNombre(usuarioFirebase?.displayName ?? null);
      setCorreoVerificado(usuarioFirebase?.emailVerified ?? false);
      setCargando(false);
    });
    // Al desmontar el proveedor dejamos de escuchar para no fugar memoria.
    return cancelarSuscripcion;
  }, []);
 
  async function iniciarSesion(correo: string, clave: string) {
    await signInWithEmailAndPassword(auth, correo.trim(), clave);
    // No navegamos aquí: onAuthStateChanged actualiza `usuario` y
    // Stack.Protected muestra la bienvenida (correo verificado) o la pantalla
    // de verificación (correo pendiente).
  }
 
  async function registrarse(nombreCompleto: string, correo: string, clave: string) {
    // Crear la cuenta también inicia la sesión.
    const credencial = await createUserWithEmailAndPassword(auth, correo.trim(), clave);
    // Guardamos el nombre en el perfil de Firebase (campo displayName).
    const nombreLimpio = nombreCompleto.trim();
    await updateProfile(credencial.user, { displayName: nombreLimpio });
    // La pantalla de verificación ya se mostró (onAuthStateChanged corre al
    // crear la cuenta, antes de updateProfile), así que actualizamos el nombre
    // en el estado.
    setNombre(nombreLimpio);
    // La cuenta nace sin verificar: enviamos el enlace para confirmar el correo.
    // Si este envío falla, la pantalla de verificación permite reenviarlo.
    await sendEmailVerification(credencial.user);
  }

  async function enviarCorreoVerificacion() {
    const actual = auth.currentUser;
    if (!actual) throw new Error('No hay una sesión activa.');
    // El enlace del correo abre una página de Firebase que marca la cuenta
    // como verificada; no hace falta configurar deep links en la app.
    await sendEmailVerification(actual);
  }

  async function comprobarVerificacion(): Promise<boolean> {
    const actual = auth.currentUser;
    if (!actual) return false;
    // reload trae el estado más reciente de la cuenta (incluido emailVerified).
    // Si el correo se verificó en otro dispositivo o en el navegador, aquí lo vemos.
    await reload(actual);
    const verificado = actual.emailVerified;
    setCorreoVerificado(verificado);
    return verificado;
  }
 
  async function enviarCorreoRecuperacion(correo: string) {
    // Firebase envía un correo con un enlace a su página de restablecimiento.
    // Si el correo no existe, por la protección de enumeración NO lanza error:
    // por eso la pantalla muestra un mensaje neutro.
    await sendPasswordResetEmail(auth, correo.trim());
  }
 
  async function cambiarClave(claveActual: string, claveNueva: string) {
    const actual = auth.currentUser;
    if (!actual?.email) throw new Error('No hay una sesión activa.');
 
    // updatePassword es una operación sensible: Firebase la rechaza con
    // "auth/requires-recent-login" si la sesión no es reciente. Por eso
    // primero confirmamos la identidad con la contraseña actual.
    const credencial = EmailAuthProvider.credential(actual.email, claveActual);
    await reauthenticateWithCredential(actual, credencial);
    await updatePassword(actual, claveNueva);
  }
 
  async function cerrarSesion() {
    await signOut(auth);
  }
  return createElement(
    ContextoSesion.Provider,
    {
      value: {
        usuario,
        nombre,
        correoVerificado,
        cargando,
        iniciarSesion,
        registrarse,
        enviarCorreoRecuperacion,
        enviarCorreoVerificacion,
        comprobarVerificacion,
        cambiarClave,
        cerrarSesion,
      },
    },
    children,
  );

}
