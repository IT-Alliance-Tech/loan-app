import "../styles/globals.css";
import { UIProvider } from "../context/UIContext";
import { ToastProvider } from "../context/ToastContext";

export const metadata = {
  title: "ILMRS - Internal Management",
  description: "Internal Loan & EMI Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased text-gray-900 bg-gray-50 flex min-h-screen">
        <ToastProvider>
          <UIProvider>
            <div className="flex-1 animate-fade-in w-full max-w-[800px] mx-auto sm:max-w-none px-4 sm:px-0">
              {children}
            </div>
          </UIProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
