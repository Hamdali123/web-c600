import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';
export const metadata: Metadata = {
  title: 'SmartOLT Clone',
  description: 'Manage physical OLTs locally',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>SmartOLT</title>

        {/* Bootstrap Core CSS */}
        <link href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" type="text/css" />

        {/* MetisMenu CSS */}
        <link href="https://cdnjs.cloudflare.com/ajax/libs/metisMenu/2.7.0/metisMenu.min.css" rel="stylesheet" />

        {/* Custom CSS (SB Admin 2) */}
        <link href="https://cdnjs.cloudflare.com/ajax/libs/startbootstrap-sb-admin-2/3.3.7+1/css/sb-admin-2.min.css" rel="stylesheet" />

        {/* Custom Fonts */}
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet" type="text/css" />
      </head>
      <body className="smartolt-site" style={{ fontFamily: "'Inter', sans-serif", fontSize: '15px', color: '#2c3e50', backgroundColor: '#ffffff', margin: '0 0 25px' }} suppressHydrationWarning>
        <ClientLayout>
          {children}
        </ClientLayout>

        {/* jQuery */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>

        {/* Bootstrap Core JavaScript */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js"></script>

        {/* Metis Menu Plugin JavaScript */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/metisMenu/2.7.0/metisMenu.min.js"></script>

        {/* Custom Theme JavaScript */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/startbootstrap-sb-admin-2/3.3.7+1/js/sb-admin-2.min.js"></script>
      </body>
    </html>
  );
}
