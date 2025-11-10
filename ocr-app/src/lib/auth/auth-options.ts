import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getSupabaseServerClient } from '@/lib/db/client';
import { encryptToken, decryptToken } from '@/lib/encryption/token-encryption';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/calendar',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/error',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !user.email) return false;

      try {
        const supabase = getSupabaseServerClient();

        // Encrypt tokens before storing
        const encryptedAccessToken = account.access_token
          ? encryptToken(account.access_token)
          : null;
        const encryptedRefreshToken = account.refresh_token
          ? encryptToken(account.refresh_token)
          : null;

        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (existingUser) {
          // Update existing user
          await supabase
            .from('users')
            .update({
              name: user.name || null,
              google_user_id: account.providerAccountId,
              google_access_token: encryptedAccessToken,
              google_refresh_token: encryptedRefreshToken,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingUser.id);
        } else {
          // Create new user
          await supabase.from('users').insert({
            email: user.email,
            name: user.name || null,
            google_user_id: account.providerAccountId,
            google_access_token: encryptedAccessToken,
            google_refresh_token: encryptedRefreshToken,
            plan_tier: 'free',
          });

          // Create email sync state for new user
          const { data: newUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .single();

          if (newUser) {
            await supabase.from('email_sync_state').insert({
              user_id: newUser.id,
              sync_status: 'active',
            });
          }
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },

    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.userId = user.id;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // Get user from database to include user_id
        const supabase = getSupabaseServerClient();
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, email, name, plan_tier')
          .eq('email', session.user.email!)
          .single();

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.planTier = dbUser.plan_tier;
        }
      }

      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
