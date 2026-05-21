'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface LayoutTemplateProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

const LayoutTemplate: React.FC<LayoutTemplateProps> = ({
  children,
  hideFooter = false,
}) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default LayoutTemplate;
