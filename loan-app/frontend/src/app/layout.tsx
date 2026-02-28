import type { Metadata } from "next";
import "../styles/globals.css";
import { UIProvider } from "../context/UIContext";
import { ToastProvider } from "../context/ToastContext";

export const metadata: Metadata = {
  title: "Square Finance - Internal Management",
  description: "Enterprise Loan & EMI Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased text-gray-900 bg-gray-50 flex min-h-screen">
        <ToastProvider>
          <UIProvider>
            <div className="flex-1 animate-fade-in w-full max-w-[800px] mx-auto sm:max-w-none px-4 sm:px-0 pb-24 md:pb-0">
              {children}
            </div>
          </UIProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
