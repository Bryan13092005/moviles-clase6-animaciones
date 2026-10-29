export const colores = {
tinta: '#14213D', // azul politécnico: fondo del encabezado
tintaProfunda: '#0C1529', // sombra del encabezado y texto sobre amarillo
curva: '#2C3D68', // curvas de nivel dibujadas sobre la tinta
papel: '#EEF1F5', // fondo de la hoja (gris frio, no crema)
hoja: '#FFFFFF', // superficie de los campos y tarjetas
senal: '#F5B700', // amarillo de seguridad: botón principal
grafito: '#1F232B', // texto principal sobre la hoja
lapiz: '#5A6274', // texto secundario y etiquetas
borde: '#CBD2DD', // bordes de campos en reposo
error: '#B3361F',
errorFondo: '#FBE9E5',
exito: '#22704F',
exitoFondo: '#E3F3EA',
} as const;


export const fuentes = {
titular: 'BigShoulders_800ExtraBold',
texto: 'SpaceGrotesk_400Regular',
textoMedio: 'SpaceGrotesk_500Medium',
textoFuerte: 'SpaceGrotesk_700Bold',
} as const;

/** Escala de espacios basada en múltiplos de 4 px. */
export const espacio = {
xs: 4,
s: 8,
m: 16,
l: 24,
xl: 32,
xxl: 48,
} as const;

export const radio = {
control: 12,
hoja: 28,
} as const;