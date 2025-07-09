# Page snapshot

```yaml
- alert
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
```