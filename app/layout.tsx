import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Shilo Chat - Personalized AI Assistant',
  description: 'Your personal AI assistant with RAG, code editing, and more',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full overflow-hidden">
      <body className={`${inter.className} h-full overflow-hidden`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

