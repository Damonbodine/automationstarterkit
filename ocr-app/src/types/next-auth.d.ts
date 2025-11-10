import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      planTier?: 'free' | 'pro' | 'team' | 'enterprise';
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    planTier?: 'free' | 'pro' | 'team' | 'enterprise';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    accessToken?: string;
    refreshToken?: string;
  }
}
