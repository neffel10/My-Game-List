import Navbar from '@/components/layout/Navbar';
import { getLocale } from '@/lib/i18n-server';
import { translate } from '@/lib/i18n';

const faqItems = [
  {
    question: 'How do I earn points?',
    answer: 'Mark a game complete and upload evidence. Points are added after approval, or automatically after 72 hours if the evidence has not been reviewed.',
  },
  {
    question: 'How many proofs can I upload?',
    answer: 'Each account can submit up to 3 game-completion proofs per day.',
  },
  {
    question: 'What should my evidence show?',
    answer: 'Upload a clear screenshot or photo that shows the completed game and a visible connection to your account, such as your in-game username.',
  },
  {
    question: 'Can I submit a 100% completion proof later?',
    answer: 'Yes. If standard completion was already approved, approval of the 100% proof awards only the additional mastery points.',
  },
  {
    question: 'What happens if my proof is rejected?',
    answer: 'You can read the reviewer’s reason and upload a new proof for that game.',
  },
  {
    question: 'How does the Fan Art Contest work?',
    answer: 'One franchise is selected for each monthly contest. Approved entries can be voted on once per account; the winner is featured after voting closes.',
  },
  {
    question: 'Are physical prizes available now?',
    answer: 'The current catalog is for digital downloads and digital codes only. Physical rewards and shipping will be added later.',
  },
];

export default async function FAQPage() {
  const locale = await getLocale();
  const t = (phrase: string) => translate(locale, phrase);

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">My Game List</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('Frequently Asked Questions')}</h1>
        <div className="mt-8 space-y-3">
          {faqItems.map(({ question, answer }) => (
            <details key={question} className="group rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
              <summary className="cursor-pointer list-none pr-6 font-semibold text-white marker:hidden">
                {t(question)}
              </summary>
              <p className="mt-3 leading-relaxed text-zinc-400">{t(answer)}</p>
            </details>
          ))}
        </div>
      </main>
    </div>
  );
}
