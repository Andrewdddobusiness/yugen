# Yugi Email Templates

This directory contains custom branded email templates for the Yugi travel planning application.

## Available Templates

### 1. **confirmation.html** - Email Verification
- **Subject**: "Welcome to Yugi - Confirm your email ✈️"
- **Used for**: New user email verification
- **Variables**: `{{ .ConfirmationURL }}`
- **Design**: Blue gradient header, welcoming tone with travel emoji

### 2. **recovery.html** - Password Reset
- **Subject**: "Reset your Yugi password 🔐"
- **Used for**: Password reset requests
- **Variables**: `{{ .ConfirmationURL }}`
- **Design**: Security-focused with warning notices and expiry information

### 3. **invite.html** - User Invitations
- **Subject**: "You're invited to Yugi! 🎉"
- **Used for**: Inviting new users to the platform
- **Variables**: `{{ .ConfirmationURL }}`
- **Design**: Pink/purple gradient, features grid showcasing app benefits

### 4. **magic_link.html** - Passwordless Sign-in
- **Subject**: "Your Yugi magic link ✨"
- **Used for**: Magic link authentication
- **Variables**: `{{ .ConfirmationURL }}`
- **Design**: Teal gradient, emphasizes security and ease of use

## Brand Colors Used

- **Primary Blue**: `#3F5FA3` (main brand color)
- **Dark Blue**: `#2A3B63` (CTAs and buttons)
- **Pink**: `#FF006E` (accent color)
- **Purple**: `#8338EC` (secondary accent)
- **Teal**: `#06d6a0` (magic link theme)
- **Success Green**: `#10b981`
- **Warning Orange**: `#f59e0b`
- **Error Red**: `#ef4444`

## Template Variables

All templates use Supabase's template variables:
- `{{ .ConfirmationURL }}` - The action URL (confirm email, reset password, etc.)
- Template variables are automatically populated by Supabase

## Design Features

- **Mobile Responsive**: All templates work on mobile devices
- **Modern Design**: Clean, professional appearance
- **Brand Consistency**: Uses Yugi brand colors and typography
- **Accessibility**: Good contrast ratios and readable fonts
- **Security Notices**: Appropriate warnings and expiry information
- **Fallback Links**: Copy-paste URLs for button accessibility

## Customization

To modify templates:
1. Edit the HTML files in this directory
2. Restart your Supabase local instance
3. Test emails in development mode

### Color Customization
Update CSS custom properties in the `<style>` section of each template:
```css
:root {
  --primary-color: #3F5FA3;
  --primary-dark: #2A3B63;
  --accent-color: #FF006E;
}
```

### Content Customization
- Update subject lines in `supabase/config.toml`
- Modify email copy directly in the HTML files
- Add or remove sections as needed

## Testing

To test email templates:
1. Run Supabase locally: `supabase start`
2. Check the Inbucket interface at `http://localhost:54324`
3. Trigger auth actions (signup, password reset, etc.)
4. View rendered emails in Inbucket

## Production Deployment

These templates are automatically used when:
1. Files are deployed with your Supabase project
2. Configuration in `config.toml` is applied
3. Email confirmations are enabled

## Support

For email template issues:
- Check Supabase logs for template errors
- Verify file paths in `config.toml`
- Test HTML validity before deployment