import React from 'react';

export default function Page() {
  return (
    <main style={{ 
      fontFamily: 'system-ui, sans-serif', 
      lineHeight: '1.5', 
      padding: '2rem', 
      maxWidth: '800px', 
      margin: '0 auto' 
    }}>
      <header style={{ marginBottom: '3rem', borderBottom: '1px solid #eaeaea', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0070f3' }}>
          Ads Project
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>
          Global Marketing Technology Platform
        </p>
      </header>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Welcome to the Arena</h2>
        <p>
          This is the central hub for our automated marketing systems. 
          Deployment status: <span style={{ color: '#0070f3', fontWeight: 'bold' }}>Active</span>
        </p>
      </section>

      <footer style={{ marginTop: '5rem', fontSize: '0.8rem', color: '#999' }}>
        &copy; {new Date().getFullYear()} ANTCPU. All rights reserved.
      </footer>
    </main>
  );
}
