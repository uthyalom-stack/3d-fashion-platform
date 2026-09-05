import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#fbfbfd',
      color: '#1d1d1f',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      {/* Header Navigation */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid #e5e5ea',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
          3D Fashion Platform
        </div>
        <nav>
          <Link
            href="/studio"
            style={{
              fontSize: '0.9rem',
              fontWeight: 500,
              color: '#0071e3',
              textDecoration: 'none'
            }}
          >
            Launch Studio →
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <span style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#6e6e73',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '1rem'
        }}>
          Standalone Phase 0 Prototype
        </span>
        <h1 style={{
          fontSize: '2.75rem',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          marginBottom: '1.25rem',
          color: '#1d1d1f'
        }}>
          Web-Based Real-Time 3D Fashion Foundation
        </h1>
        <p style={{
          fontSize: '1.15rem',
          lineHeight: 1.5,
          color: '#6e6e73',
          marginBottom: '2.5rem',
          maxWidth: '620px'
        }}>
          Lightweight, open-source first 3D scene architecture powered by React Three Fiber, Three.js, and Next.js App Router.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/studio"
            style={{
              padding: '0.85rem 1.75rem',
              fontSize: '1rem',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#0071e3',
              borderRadius: '980px',
              textDecoration: 'none',
              transition: 'background-color 0.2s ease'
            }}
          >
            Open 3D Studio
          </Link>
        </div>

        {/* Modular Architecture Summary */}
        <div style={{
          marginTop: '4rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          width: '100%',
          textAlign: 'left'
        }}>
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e5ea'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Clean 3D Scene
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6e6e73', margin: 0, lineHeight: 1.4 }}>
              Three-point studio lighting, Orbit controls with smooth damping, and camera limits.
            </p>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e5ea'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Procedural Avatar
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6e6e73', margin: 0, lineHeight: 1.4 }}>
              Built dynamically using Three.js geometric primitives without external copyrighted assets.
            </p>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e5ea'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Extensible System
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6e6e73', margin: 0, lineHeight: 1.4 }}>
              Decoupled architecture ready for future garment layer integration.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '1.5rem',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: '#86868b',
        borderTop: '1px solid #e5e5ea',
        backgroundColor: '#ffffff'
      }}>
        3D Fashion Platform — Standalone Phase 0 Foundation
      </footer>
    </div>
  );
}
