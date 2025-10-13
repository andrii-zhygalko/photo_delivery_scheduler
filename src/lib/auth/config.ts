import type { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { neon } from '@neondatabase/serverless';

// Direct SQL connection bypassing Drizzle for auth operations
const sql = neon(process.env.NEON_DATABASE_URL!);

export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        // First, ensure the auth_upsert_user function exists
        await sql`
          CREATE OR REPLACE FUNCTION auth_upsert_user(
            p_email TEXT,
            p_name TEXT,
            p_image TEXT
          ) RETURNS uuid
          LANGUAGE plpgsql
          SECURITY DEFINER
          SET search_path = public
          AS $$
          DECLARE
            v_user_id uuid;
          BEGIN
            INSERT INTO users (email, name, image)
            VALUES (p_email, p_name, p_image)
            ON CONFLICT (email) DO UPDATE SET
              name = EXCLUDED.name,
              image = EXCLUDED.image,
              updated_at = NOW()
            RETURNING id INTO v_user_id;

            INSERT INTO user_settings (user_id, default_deadline_days, timezone)
            VALUES (v_user_id, 30, 'UTC')
            ON CONFLICT (user_id) DO NOTHING;

            RETURN v_user_id;
          END;
          $$;
        `;

        // Use the SECURITY DEFINER function to bypass RLS
        const result = await sql`
          SELECT auth_upsert_user(${user.email}, ${user.name || null}, ${user.image || null}) as user_id;
        `;

        if (result.length > 0 && result[0].user_id) {
          user.id = result[0].user_id;
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
} satisfies NextAuthConfig;
