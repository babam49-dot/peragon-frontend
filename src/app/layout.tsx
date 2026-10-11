import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@mantine/core/styles.css';

import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Peragon — Employee Hierarchy Management",
  description: "Interactive Organization Employee Hierarchy & Role Structure Management System",
  icons: {
    icon: "/icon.svg",
  },
};

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: inter.style.fontFamily,
  defaultRadius: 'md',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900`}>
        <MantineProvider theme={theme} defaultColorScheme="light">
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
