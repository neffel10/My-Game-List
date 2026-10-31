import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { getLocale } from '@/lib/i18n-server';
import { translate } from '@/lib/i18n';

export default async function ContactPage() {
  const locale = await getLocale();
  const t = (phrase: string) => translate(locale, phrase);
  const email = 'aletl10@hotmail.com';
  const paypalUrl = process.env.NEXT_PUBLIC_DONATION_URL
    ?? 'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=aletl10%40hotmail.com&currency_code=USD';

  return (
    <div className="flex min-h-screen flex-col bg-[#07090e] text-zinc-100">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <section className="rounded-3xl border border-white/10 bg-zinc-900/60 p-8 shadow-2xl sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">My Game List</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('Contact My Game List')}</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-zinc-400">{t('Questions, feedback, or ideas to help the site grow?')}</p>
          <p className="mt-5 max-w-2xl leading-relaxed text-zinc-300">
            {t('For support, suggestions, complaints, partnerships, or sponsorships, email us at')}{' '}
            <a href={`mailto:${email}`} className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">{email}</a>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`mailto:${email}`} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200">
              {t('Contact by email')}
            </a>
            <Link href="/faq" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              {t('FAQ')}
            </Link>
          </div>
          <div className="mt-12 border-t border-white/10 pt-8">
            <h2 className="text-xl font-semibold text-white">{t('Support the project')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t('Donations help cover hosting and improve the site.')}</p>
            <a href={paypalUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
              {t('Donate with PayPal')}
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
