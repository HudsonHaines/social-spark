# Supabase Authentication Setup

To enable all authentication methods in your Social Spark app, follow these steps in your Supabase dashboard:

## 1. Enable Email Authentication

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Email** in the list and enable it
4. Configure the following settings:
   - **Enable Email Signup**: ON
   - **Enable Email Login**: ON
   - **Enable Magic Link Login**: ON (this enables OTP/magic links)
   - **Confirm Email**: ON (recommended for security)
   - **Secure Email Change**: ON
   - **Secure Password Change**: ON

## 2. Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize the templates for:
   - **Confirm Signup** - Email sent to verify new accounts
   - **Magic Link** - Email sent for passwordless login
   - **Reset Password** - Email for password recovery
   - **Change Email** - Email for email address changes

## 3. Set Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add your app URL to **Site URL**: `http://localhost:5173` (for development)
3. Add to **Redirect URLs**:
   - `http://localhost:5173` (development)
   - `https://yourdomain.com` (production)
   - Any other URLs where your app is hosted

## 4. Configure Google OAuth (Already Set Up)

Your Google OAuth is already configured, but ensure:
1. **Google** provider is enabled in **Authentication** → **Providers**
2. Your Google OAuth credentials are properly set

## 5. Password Requirements

1. Go to **Authentication** → **Policies**
2. Set minimum password requirements:
   - Minimum length: 6 characters (default)
   - You can add additional requirements if needed

## 6. Rate Limiting (Important)

1. Go to **Authentication** → **Rate Limits**
2. Configure appropriate limits for:
   - **Sign up attempts**: 5 per hour (default)
   - **Magic link requests**: 5 per hour
   - **Password reset requests**: 5 per hour

## Testing Your Setup

After configuration, test each authentication method:

### Magic Link:
1. Enter an email address
2. Click "Send Magic Link"
3. Check your email for the link
4. Click the link to sign in

### Email/Password:
1. Create a new account with email and password
2. Verify your email (if confirmation is enabled)
3. Sign in with your credentials

### Google OAuth:
1. Click "Continue with Google"
2. Select your Google account
3. Authorize the app

## Troubleshooting

### Magic Links Not Arriving:
- Check your Supabase email settings
- Verify SMTP configuration if using custom SMTP
- Check spam folder
- Ensure email provider is not blocking Supabase emails

### Password Sign In Not Working:
- Ensure email provider is enabled
- Check that the user's email is confirmed (if required)
- Verify password meets minimum requirements

### OAuth Redirect Issues:
- Ensure redirect URLs match exactly (including trailing slashes)
- Check that the Site URL is correctly set
- Verify OAuth credentials are properly configured

## Security Best Practices

1. **Enable Email Confirmation**: Prevents fake account creation
2. **Use Strong Password Requirements**: Minimum 8 characters recommended
3. **Enable Rate Limiting**: Prevents brute force attacks
4. **Regular Security Audits**: Review authentication logs regularly
5. **Enable 2FA** (if available in your Supabase plan)

## Environment Variables

Ensure your `.env` file has:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

These are already configured in your app, just make sure they're correct.