# Page snapshot

```yaml
- alert
<<<<<<< HEAD
- button "Open Next.js Dev Tools":
  - img
- button "Open issues overlay": 1 Issue
- navigation:
  - button "previous" [disabled]:
    - img "previous"
  - text: 1/1
  - button "next" [disabled]:
    - img "next"
- img
- img
- text: Next.js 15.4.0 Webpack
- img
- dialog "Build Error":
  - text: Build Error
  - button "Copy Stack Trace":
    - img
  - button "No related documentation found" [disabled]:
    - img
  - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools":
    - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
    - img
  - paragraph: × Expected ',', got 'callbacks'
  - img
  - text: ./src/lib/auth-config.ts
  - button "Open in editor":
    - img
  - text: "Error: × Expected ',', got 'callbacks' ╭─[C:\\Users\\ryley\\Music\\holitime\\holitime\\src\\lib\\auth-config.ts:62:1] 59 │ }) 60 │ ] : []) 61 │ 62 │ callbacks: { · ───────── 63 │ async signIn({ user, account, profile }) { 64 │ try { 65 │ if (account?.provider === 'google') { ╰──── Caused by: Syntax Error"
- contentinfo:
  - paragraph: This error occurred during the build process and can only be dismissed by fixing the error.
=======
- button "Close Next.js Dev Tools" [expanded]:
  - img
- menu "Next.js Dev Tools Items":
  - menuitem "Route Static"
  - menuitem "Try Turbopack":
    - text: Try Turbopack
    - img
  - menuitem "Preferences":
    - text: Preferences
    - img
- paragraph: Hands On Labor
- paragraph: Sign in to your Scheduling Portal
- text: Email Address
- textbox "Email Address"
- text: Password
- textbox "Password"
- button "Sign In"
- separator: Or
- button "Sign In with Google":
  - img
  - text: Sign In with Google
- link "Don't have an account? Sign up":
  - /url: /signup
- paragraph:
  - text: Don't have an account?
  - link "Sign up":
    - /url: /signup
>>>>>>> 2f8e1e5b6390304607fcd44d81da069e7d051ca2
```