# Page snapshot

```yaml
- paragraph: Hands On Labor
- paragraph: Sign in to your Scheduling Portal
- text: Email Address
- textbox "Email Address": test-manager@example.com
- text: Password
- textbox "Password": password123
- alert "Login Error": Login Error Invalid email or password
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
- alert
- button "Open Next.js Dev Tools":
  - img
```