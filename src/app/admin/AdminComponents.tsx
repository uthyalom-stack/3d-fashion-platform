'use client';

import React from 'react';
import Link from 'next/link';
import styles from './admin.module.css';

export function AdminHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logoBadge}>3D Platform</span>
        <h1 className={styles.title}>Asset Management Foundation</h1>
      </div>

      <nav className={styles.navLinks}>
        <Link href="/admin/assets" className={styles.navLink}>
          Assets List
        </Link>
        <Link href="/admin/assets/new" className={styles.primaryButton}>
          + Register Asset
        </Link>
        <Link href="/studio" className={styles.navLink} style={{ color: '#0071e3', fontWeight: 600 }}>
          Launch Studio ↗
        </Link>
      </nav>
    </header>
  );
}

export function AdminNotice() {
  return (
    <div className={styles.noticeBanner}>
      <strong>Internal Admin Foundation:</strong> This interface manages internal 3D asset metadata records and AssetLocation contracts. It is strictly decoupled from commerce concerns (prices, inventory, orders, customer accounts). Real authentication/authorization checks should be attached to server endpoints in production.
    </div>
  );
}
