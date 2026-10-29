/**
 * Verificación del correo.
 *
 * Esta pantalla es el único destino posible cuando hay una sesión iniciada
 * pero la cuenta todavía no confirmó su correo. Desde aquí no se puede llegar
 * a la bienvenida: el layout raíz lo impide con Stack.Protected.
 *
 * Flujo:
 *   1. Al registrarse, el contexto envía el correo con sendEmailVerification.
 *   2. El estudiante abre el enlace del correo (una página de Firebase).
 *   3. Al volver a la app, esta pantalla consulta a Firebase (sondeo cada
 *      pocos segundos y al recuperar el foco). Si ya está verificado, el
 *      layout cambia solo a la bienvenida.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Boton } from '@/components/boton';
import { PantallaHoja } from '@/components/pantalla-hoja';
import { colores, espacio, fuentes } from '@/constants/tema';
import { useSesion } from '@/context/sesion';
import { mensajeDeError } from '@/lib/errores-firebase';

/** Evita reenviar el correo en ráfaga (Firebase limita los envíos seguidos). */
const SEGUNDOS_ENTRE_ENVIOS = 30;
/** Cada cuánto se le pregunta a Firebase si el correo ya fue verificado. */
const SEGUNDOS_ENTRE_COMPROBACIONES = 5;

export default function PantallaVerificarCorreo() {
  const { usuario, enviarCorreoVerificacion, comprobarVerificacion, cerrarSesion } = useSesion();

  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [comprobando, setComprobando] = useState(false);
  const [espera, setEspera] = useState(0);

  // El proveedor crea las funciones en cada render. Guardamos la última en un
  // ref para que el sondeo no reinicie su temporizador a cada cambio de estado.
  const comprobarRef = useRef(comprobarVerificacion);
  useEffect(() => {
    comprobarRef.current = comprobarVerificacion;
  });

  // Sondeo automático: si el estudiante verifica el correo desde el teléfono
  // o desde una computadora, la app lo detecta sin tocar ningún botón.
  useEffect(() => {
    let enCurso = false;

    async function revisar() {
      // Evita acumular consultas si una respuesta tarda más que el intervalo.
      if (enCurso) return;
      enCurso = true;
      try {
        await comprobarRef.current();
      } catch {
        // En silencio: el sondeo no debe llenar la pantalla de errores.
        // El botón "Ya verifiqué mi correo" sí muestra el mensaje.
      } finally {
        enCurso = false;
      }
    }

    // Sondeo periódico. (No consultamos de inmediato: justo tras registrarse
    // el perfil se está guardando y una respuesta vieja podría pisar el nombre.)
    const intervalo = setInterval(revisar, SEGUNDOS_ENTRE_COMPROBACIONES * 1000);
    // Al volver del correo, la app pasa de "background" a "active".
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') revisar();
    });

    return () => {
      clearInterval(intervalo);
      suscripcion.remove();
    };
  }, []);

  // Cuenta atrás del botón "Reenviar".
  useEffect(() => {
    if (espera <= 0) return;
    const temporizador = setTimeout(() => setEspera((segundos) => segundos - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [espera]);

  async function manejarReenvio() {
    setError(null);
    setEnviando(true);
    try {
      await enviarCorreoVerificacion();
      setEnviado(true);
      setEspera(SEGUNDOS_ENTRE_ENVIOS);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  async function manejarComprobacion() {
    setError(null);
    setComprobando(true);
    try {
      const verificado = await comprobarVerificacion();
      if (!verificado) {
        setError(
          'Todavía no aparece como verificado. Abre el enlace del correo y vuelve a intentarlo.',
        );
      }
      // Si sí está verificado, el layout cambia solo a la bienvenida.
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setComprobando(false);
    }
  }

  return (
    <PantallaHoja
      antetitulo="Un paso más"
      titulo={'Verifica\ntu correo'}
      bajada={`Confirma que ${usuario?.email ?? 'tu correo'} es tuyo abriendo el enlace que te enviamos. Si no lo encuentras, usa «Reenviar correo».`}>
      {enviado ? (
        <Aviso
          tipo="exito"
          mensaje={`Correo enviado a ${usuario?.email ?? 'tu cuenta'}. Revisa también la carpeta de spam.`}
        />
      ) : null}
      {error ? <Aviso tipo="error" mensaje={error} /> : null}

      <Text style={styles.explicacion}>
        Mientras el correo no esté verificado no podrás entrar a la app. Cuando lo verifiques, esta
        pantalla te llevará sola a la bienvenida.
      </Text>

      <Boton texto="Ya verifiqué mi correo" onPress={manejarComprobacion} cargando={comprobando} />
      <Boton
        variante="secundario"
        texto={espera > 0 ? `Reenviar en ${espera} s` : 'Reenviar correo'}
        onPress={manejarReenvio}
        cargando={enviando}
        deshabilitado={espera > 0}
      />

      <View style={styles.pie}>
        <Boton variante="enlace" texto="Cerrar sesión" onPress={cerrarSesion} />
      </View>
    </PantallaHoja>
  );
}

const styles = StyleSheet.create({
  explicacion: {
    color: colores.lapiz,
    fontFamily: fuentes.texto,
    fontSize: 15,
    lineHeight: 22,
  },
  pie: {
    alignItems: 'center',
    marginTop: espacio.m,
  },
});
