# Page snapshot

```yaml
- alert
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
```