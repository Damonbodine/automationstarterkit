'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="p-8 border rounded-md shadow-sm bg-white">
        <h1 className="text-xl font-semibold mb-4">Sign in</h1>
        <p className="mb-4 text-gray-600 max-w-md">
          Connect your Google account so the app can read emails (read/modify), and access Drive/Docs/Sheets for agents.
        </p>
        <button
          onClick={() => signIn('google')}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}

