'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
interface LayoutTemplateProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

const LayoutTemplate: React.FC<LayoutTemplateProps> = ({
  children,
}) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
};

export default LayoutTemplate;
