import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { authenticateUser, createUser, getUserByEmail } from "./auth"

export const authOptions: NextAuthOptions = {
  providers: [
    // Credentials Provider (existing username/password)
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const result = await authenticateUser({
            email: credentials.email,
            password: credentials.password
          })

          if (result) {
            return {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: result.user.role,
              image: result.user.avatar,
            }
          }
          return null
        } catch (error) {
          console.error("Credentials auth error:", error)
          return null
        }
      }
    }),

    // Google OAuth Provider - basic scopes for user authentication only
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            scope: [
              "https://www.googleapis.com/auth/userinfo.email",
              "https://www.googleapis.com/auth/userinfo.profile",
              "openid",
              "email",
              "profile"
            ].join(" "),
            access_type: "offline",
            prompt: "consent"
          }
        }
      })
    ] : [])
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("=== SIGNIN CALLBACK DEBUG ===")
      console.log("Provider:", account?.provider)
      console.log("User email:", user.email)
      console.log("User name:", user.name)
      
      try {
        if (account?.provider === "google") {
          console.log("Processing Google OAuth sign-in...")
          
          // Check if user exists in our database
          console.log("Checking if user exists in database...")
          const existingUser = await getUserByEmail(user.email!)
          console.log("Existing user found:", !!existingUser)

          if (!existingUser) {
            console.log("Creating new user for Google OAuth...")
            // Create new user for Google OAuth
            try {
              const newUser = await createUser({
                email: user.email!,
                password: "oauth_user", // Placeholder password for OAuth users
                name: user.name!,
                role: "Employee", // Default role, can be changed by admin
              })

              if (!newUser) {
                console.error("❌ Failed to create user for Google OAuth - allowing sign-in anyway")
                // Allow sign-in even if user creation fails - they can be created manually later
                return true
              }
              console.log("✅ Successfully created new user:", newUser.email)
            } catch (createError) {
              console.error("❌ Error creating user:", createError)
              // Allow sign-in even if user creation fails
              console.log("⚠️ Allowing sign-in despite user creation failure")
              return true
            }
          } else {
            console.log("✅ User already exists, proceeding with sign-in")
          }
        }

        console.log("✅ Sign-in callback returning true")
        return true
      } catch (error) {
        console.error("❌ Sign-in error:", error)
        console.error("Error details:", {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined
        })
        // Allow sign-in even if there are database issues
        console.log("⚠️ Allowing sign-in despite callback error")
        return true
      }
    },

    async jwt({ token, user }) {
      try {
        if (user) {
          // Get user data from our database
          const dbUser = await getUserByEmail(user.email!)
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.clientCompanyId = dbUser.clientCompanyId || undefined
          }
        }
        return token
      } catch (error) {
        console.error("JWT callback error:", error)
        // Return token even if there's an error to prevent auth failure
        return token
      }
    },

    async session({ session, token }) {
      try {
        if (token && session.user) {
          session.user.id = token.id as string
          session.user.role = token.role as string
          session.user.clientCompanyId = token.clientCompanyId as string
        }
        return session
      } catch (error) {
        console.error("Session callback error:", error)
        // Return session even if there's an error to prevent auth failure
        return session
      }
    }
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  debug: process.env.NODE_ENV === "development",

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",

  // Add CORS configuration for production
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
}
