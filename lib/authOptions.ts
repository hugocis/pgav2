// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import prisma from "@/lib/prisma";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

// Configuración de NextAuth
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (
          !credentials?.username ||
          !credentials?.password ||
          typeof credentials.username !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const { username, password } = credentials;

        try {
          const user = await prisma.user.findUnique({
            where: { username },
            include: {
              userRoles: {
                include: {
                  role: true,
                },
              },
            },
          });

          if (!user || typeof user.password !== "string") {
            return null;
          }

          const isPasswordValid = await compare(password, user.password);
          if (!isPasswordValid) {
            return null;
          }

          const roles = user.userRoles?.map((ur) => ur.role.name) || [];

          return {
            id: user.id,
            name: user.name,
            surname1: user.surname1,
            surname2: user.surname2,
            email: user.email,
            username: user.username,
            roles,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.roles = user.roles;
        token.surname1 = user.surname1;
        token.surname2 = user.surname2;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.roles = token.roles as string[];
        session.user.surname1 = token.surname1 as string | null;
        session.user.surname2 = token.surname2 as string | null;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
