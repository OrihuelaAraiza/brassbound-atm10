import type {Metadata} from 'next';
export const metadata: Metadata = {title:'Brassbound · Tu taller de ATM10',description:'El taller compartido de ATM10: guías, progreso y bitácoras de nuestro servidor.'};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body>{children}</body></html>; }
