import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hrudai Nirmal — Ideas in Motion',
  description: 'An interactive portfolio motion study. A human perspective, transformed through particles.',
};

/** Provide a semantic, dark-first shell for the particle experience. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
