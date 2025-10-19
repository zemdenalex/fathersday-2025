import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  showVignette?: boolean;
}

export default function Layout({ children, showVignette = true }: LayoutProps) {
  return (
    <div className={`min-h-screen w-full ${showVignette ? 'vignette' : ''}`}>
      {children}
    </div>
  );
}
