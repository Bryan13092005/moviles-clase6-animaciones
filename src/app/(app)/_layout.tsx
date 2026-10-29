import { Stack } from 'expo-router';

import { colores } from '@/constants/tema';

export default function LayoutApp() {
return (
<Stack
screenOptions={{
headerShown: false,
contentStyle: { backgroundColor: colores. tinta },
animation: 'slide_from_right',
}}>
</Stack>
);
}