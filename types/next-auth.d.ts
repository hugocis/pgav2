import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * Extiende el objeto de usuario de la sesión
   */
  interface Session {
    user: {
      id: string
      username: string
      surname1?: string | null
      surname2?: string | null
      roles: string[]
    } & DefaultSession["user"]
  }

  /**
   * Extiende el objeto de usuario para incluir campos adicionales
   */
  interface User {
    id: string
    username: string
    surname1?: string | null
    surname2?: string | null
    roles: string[]
  }
}

declare module "next-auth/jwt" {
  /** Extiende el token JWT */
  interface JWT {
    id: string
    username: string
    surname1?: string | null
    surname2?: string | null
    roles: string[]
  }
}
