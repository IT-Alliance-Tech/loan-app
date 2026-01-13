import '../styles/globals.css';
import { UIProvider } from '../context/UIContext';

export const metadata = {
  title: 'ILMRS - Internal Management',
  description: 'Internal Loan & EMI Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900 bg-gray-50">
        <UIProvider>
          {children}
        </UIProvider>
      </body>
    </html>
  );
}
