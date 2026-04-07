import React, { ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <header className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold">AntCPU Ads</h1>
      </header>
      <main className="p-6">{children}</main>
      <footer className="p-6 border-t border-gray-700 text-gray-400 text-sm text-center">
        © 2026 AntCPU Ads
      </footer>
    </div>
  );
};

export default Layout;
