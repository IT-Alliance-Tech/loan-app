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
      <body className="antialiased text-gray-900 bg-gray-50">
        <ToastProvider>
          <UIProvider>{children}</UIProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
