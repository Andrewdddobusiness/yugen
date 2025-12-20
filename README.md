# Yugi — Soft Navigator Travel Planner

This is the Yugi web app, a Next.js experience built around calm, glassy navigation and tactile buttons for confident trip planning.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Typography
- Logo / Title: Londrina Solid
- Accent Titles: Londrina Sketch (use sparingly for landing highlights)
- Body / UI: Nunito

## Colors (Yugi Palette)

- Brand Slate: `#2A3B63`, `#334A7A`, `#3F5FA3`, `#5C7BCB`, `#8FA8E6`
- Neutrals: `#FFFFFF`, `#F7F8FB`, `#EEF1F7`
- Ink: `#0D1321`, `#2A3245`, `#55607A`
- Stroke: `#DDE3F0`
- Accents: teal `#22B8B2`, coral `#FF5A6B`, lime `#40D57C`, amber `#FFB020`

## Supabase

Requires Docker Desktop to be open.

### Cleanup Deleted Accounts

**Available Commands:**

- delete: Delete a Function from Supabase
- deploy: Deploy a Function to Supabase
- download: Download a Function from Supabase
- list: List all Functions in Supabase
- new: Create a new Function locally
- serve: Serve all Functions locally

```bash
supabase projects list # List projects
supabase start --debug # Start the database
supabase functions serve cleanup-deleted-accounts --debug # Test locally first
supabase login
supabase functions deploy cleanup-deleted-accounts --no-verify-jwt # Deploy the Function
supabase functions list
```

```bash
curl -i --request POST \
  'https://<project-ref>.functions.supabase.co/cleanup-deleted-accounts' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{}'
```
