import type {Metadata} from 'next';
import { Playfair_Display, Cinzel, Cinzel_Decorative } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-cinzel',
});

const cinzelDeco = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cinzel-deco',
});

export const metadata: Metadata = {
  title: 'DungeonFlow Live: Real-Time AI DM',
  description: 'A live voice-first AI Dungeon Master experience powered by Google Gemini.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${playfair.variable} ${cinzel.variable} ${cinzelDeco.variable}`}>
      <body suppressHydrationWarning className="antialiased dnd-bg text-parchment-200 font-serif min-h-screen">
        {children}
      </body>
    </html>
  );
}
