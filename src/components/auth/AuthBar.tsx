'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function AuthBar() {
  const { data: session, status } = useSession();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      borderBottom: '1px solid #eee',
      background: '#fafafa',
    }}>
      <div>
        <Link href="/" style={{ marginRight: 12 }}>Home</Link>
        <Link href="/dev">Dev</Link>
      </div>
      <div>
        {status === 'authenticated' ? (
          <>
            <span style={{ marginRight: 12 }}>{session.user?.email}</span>
            <button onClick={() => signOut()} className="px-2 py-1 bg-gray-200 rounded">Sign out</button>
          </>
        ) : (
          <button onClick={() => signIn('google')} className="px-2 py-1 bg-blue-500 text-white rounded">
            Sign in with Google
          </button>
        )}
      </div>
    </div>
  );
}

