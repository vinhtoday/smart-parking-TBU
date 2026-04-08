import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import NextAuthProvider from "@/components/NextAuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bãi đỗ xe thông minh - Trường đại học Thái Bình",
  description:
    "Hệ thống quản lý bãi đỗ xe thông minh - Trường đại học Thái Bình. Theo dõi xe ra vào bằng RFID, quản lý sinh viên và giảng viên, thống kê báo cáo tự động.",
  keywords: [
    "bãi đỗ xe",
    "thông minh",
    "trường học",
    "RFID",
    "quản lý",
    "parking",
    "smart parking",
  ],
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <NextAuthProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster position="top-right" richColors closeButton />
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
