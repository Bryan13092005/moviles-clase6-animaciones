/**
 * Sacudida horizontal para señalar un error (por ejemplo, un login fallido).
 *
 * Usa la API de Reanimated 4:
 *   - useSharedValue guarda el desplazamiento actual.
 *   - withSequence encadena varios withTiming (ida y vuelta).
 *   - useAnimatedStyle convierte el shared value en un estilo animado que se
 *     aplica con <Animated.View>.
 *
 * Toda animación de Reanimated respeta por defecto la opción "reducir
 * movimiento" del sistema (ReduceMotion.System): si está activa, el valor
 * salta al final y no se ve la sacudida.
 *
 * Docs: https://docs.swmansion.com/react-native-reanimated/docs/animations/withSequence/
 */
import { useCallback } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Cuántos píxeles se mueve a cada lado en el primer vaivén. */
const AMPLITUD = 12;
/** Duración de cada tramo de la sacudida (ms). */
const TRAMO = 55;

export function useSacudida() {
  const desplazamiento = useSharedValue(0);

  // useCallback: la función es estable, así que las pantallas pueden usarla en
  // dependencias de efectos sin provocar renders extra.
  const sacudir = useCallback(() => {
    // Vaivén decreciente: fuerte al inicio y suave al final, como un "no".
    // Usamos set() en lugar de `.value =` porque es la forma compatible con el
    // React Compiler (ver "React Compiler support" en la doc de useSharedValue).
    desplazamiento.set(
      withSequence(
        withTiming(-AMPLITUD, { duration: TRAMO, easing: Easing.linear }),
        withTiming(AMPLITUD, { duration: TRAMO, easing: Easing.linear }),
        withTiming(-AMPLITUD / 2, { duration: TRAMO, easing: Easing.linear }),
        withTiming(AMPLITUD / 2, { duration: TRAMO, easing: Easing.linear }),
        withTiming(0, { duration: TRAMO, easing: Easing.linear }),
      ),
    );
  }, [desplazamiento]);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: desplazamiento.get() }],
  }));

  return { estilo, sacudir };
}
