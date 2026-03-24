# Forgot Password — Design Spec

## Overview

Add a "forgot password" flow to the existing LoginPage using Supabase Auth's built-in `resetPasswordForEmail`. The flow stays on the same page (no new routes for the request step), with a new `/reset-password` route for the callback when the user clicks the email link.

## LoginPage Changes

### New State

Replace individual states with a `mode` state:

```
mode: 'login' | 'forgotPassword' | 'resetSent'
```

### Mode: login (current + link)

- Current form unchanged
- Add "Esqueceu sua senha?" link between password field and submit button
- Link style: `text-sm text-green-600 hover:text-green-700 dark:text-green-400`
- Clicking sets `mode` to `'forgotPassword'`

### Mode: forgotPassword

- Same card layout, same logo
- Title changes to "Recuperar senha"
- Only email field shown
- Button: "Enviar link de recuperacao" (green, same style as login button)
- Below button: "Voltar ao login" link → sets `mode` back to `'login'`
- On submit: calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '${window.location.origin}/reset-password' })`
- On success: sets `mode` to `'resetSent'`
- On error: shows error in same error banner pattern

### Mode: resetSent

- Same card layout, same logo
- Success message: "Enviamos um link de recuperacao para seu email. Verifique sua caixa de entrada."
- Style: green background banner (similar to error banner but green)
- "Voltar ao login" link → sets `mode` back to `'login'`

## ResetPasswordPage (new)

### Route

- Path: `/reset-password`
- Public route (no auth required)
- Added to the router alongside LoginPage

### Component

- Same visual layout as LoginPage (centered card, MdO logo, dark mode support)
- Two password fields: "Nova senha" and "Confirmar nova senha"
- Submit button: "Redefinir senha"
- Validation: passwords must match, minimum 8 characters
- On submit: `supabase.auth.updateUser({ password })`
- On success: show success message, then redirect to `/app` after 2 seconds
- On error: show error banner

### Auth Flow

The Supabase magic link includes tokens in the URL fragment. When the page loads, Supabase's `onAuthStateChange` fires a `PASSWORD_RECOVERY` event, establishing a session. The `updateUser` call uses this session to set the new password.

**Critical: PASSWORD_RECOVERY event handling.** The existing `AuthContext.onAuthStateChange` listener will see `isAuthenticated = true` and the catch-all route (`path: '*'`) would redirect to `/app` before the user sees the reset form. To fix this:
- In `AuthContext.tsx`, detect `_event === 'PASSWORD_RECOVERY'` and set a flag (e.g., `isPasswordRecovery`) exposed via context.
- The catch-all route and any auth guards must NOT redirect when `isPasswordRecovery` is true.
- `ResetPasswordPage` clears this flag after successful password update.

### Expired/Invalid Links

If the reset link is expired or invalid, the `PASSWORD_RECOVERY` event won't fire and no session will be established. The `ResetPasswordPage` must detect this (no session after a short timeout) and show: "Link expirado ou invalido. Solicite um novo link." with a link back to `/login`.

## Email Template (manual config)

Configure in Supabase Dashboard > Authentication > Email Templates > Reset Password.

HTML template with MdO branding:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="400" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.07);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 32px 0;">
              <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:inline-flex;align-items:center;justify-content:center;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;line-height:56px;">MdO</span>
              </div>
              <h1 style="margin:16px 0 4px;font-size:20px;font-weight:700;color:#1f2937;">Mundo dos Oleos</h1>
              <p style="margin:0;font-size:13px;color:#6b7280;">Painel Estrategico de Consultoria</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
                Recebemos uma solicitacao para redefinir sua senha. Clique no botao abaixo para criar uma nova senha:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="{{ .ConfirmationURL }}"
                       style="display:inline-block;padding:12px 32px;background-color:#16a34a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Redefinir minha senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Se voce nao solicitou esta alteracao, ignore este email. O link expira em 1 hora.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:11px;color:#d1d5db;text-align:center;">
                Mundo dos Oleos &mdash; Painel Estrategico
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Files to Create/Modify

- **Modify:** `src/pages/LoginPage.tsx` — add mode state and forgot password / reset sent views
- **Create:** `src/pages/ResetPasswordPage.tsx` — new password reset page
- **Modify:** `src/app/routes.tsx` — add `/reset-password` route BEFORE the catch-all `*` route (line 69)
- **Modify:** `src/contexts/AuthContext.tsx` — add `PASSWORD_RECOVERY` event detection and `isPasswordRecovery` flag
- **Modify:** `src/services/api/auth.ts` — add `resetPasswordForEmail` and `updateUserPassword` functions
- **Note:** Components must call these service functions, not raw Supabase calls
- **Manual:** Configure email template in Supabase Dashboard
