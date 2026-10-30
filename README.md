This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Evidence rewards and moderation

- Users can submit up to 3 successful evidence uploads per UTC day.
- Approved completion evidence grants 100 points immediately. A separate 100% mastery proof must be manually approved for the additional 50 points.
- Vercel Hobby runs `/api/cron/auto-approve-evidence` daily at 00:00 UTC. Pending evidence older than 72 hours is automatically approved for the 100 completion points at the next run (up to about 25 hours after the 72-hour mark due to Hobby scheduling precision); the 100% bonus remains manual.
- Configure a strong `CRON_SECRET` in the Vercel project environment variables. Vercel uses it to authorize scheduled requests. The scheduled job will not run successfully if the secret is missing.
- Apply the updated Prisma schema to the intended database before deployment, for example with `npx prisma db push` after verifying `DATABASE_URL` points to the correct environment.

## Digital reward redemptions

- The public rewards catalog only lists active digital downloads and digital codes. Physical rewards remain unavailable until checkout and shipping are implemented.
- Downloads and one-time codes are automatically redeemed using the user's available points. Each account can redeem a reward once; codes are assigned from a private inventory.
- Users can retrieve their codes and downloads from `/rewards/my`. Download routes verify the signed-in user owns the redemption before streaming the asset.
- Reward previews are watermarked and include basic right-click prevention. This deters casual copying but cannot prevent screenshots or browser developer-tools access; the downloadable original is never rendered in the public catalog.
