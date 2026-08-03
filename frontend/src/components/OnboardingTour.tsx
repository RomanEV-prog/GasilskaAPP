import { useEffect, useMemo, useState } from 'react';
import { SUPPORT_EMAIL } from '../types';

/** Ključ za pomnjenje, da je uporabnik vodič že videl (po ID-ju uporabnika). */
export function tourStorageKey(userId: string): string {
  return `gasilapp.tour.v1.${userId}`;
}

interface Step {
  /** Emoji, ali pot do slike (vrednost se začne z '/') — npr. ikona znamke. */
  icon: string;
  title: string;
  /** Kaj funkcija je / čemu služi. */
  kaj: string;
  /** Kako jo uporabiš (konkreten korak). */
  kako: string;
  /** Korak je namenjen samo vodstvu (admin, predsednik ...). */
  leadershipOnly?: boolean;
}

const STEPS: Step[] = [
  {
    icon: '/plamen-icon.png',
    title: 'Dobrodošli v Plamen',
    kaj: 'Plamen je interna organizacijska platforma vašega društva — člani, dogodki, vozila, oprema, usposabljanja, obvestila in intervencije SPIN na enem mestu.',
    kako: 'Ta kratek vodič vas v nekaj korakih popelje skozi glavne funkcije. Kadar koli ga lahko znova odprete z gumbom “❓ Vodič” spodaj levo.',
  },
  {
    icon: '👥',
    title: 'Člani',
    kaj: 'Evidenca vseh članov društva z vlogami (predsednik, poveljnik, tajnik, član ...) in kontaktnimi podatki.',
    kako: 'Odprite “Člani” → “Dodaj člana”. Vsak član dobi uporabniško ime za prijavo v spletno in mobilno aplikacijo. E-pošta ni obvezna.',
    leadershipOnly: true,
  },
  {
    icon: '📅',
    title: 'Dogodki in koledar',
    kaj: 'Vaje, sestanki, intervencije in druge aktivnosti s prijavo udeležbe (RSVP) ter beleženjem dejanske prisotnosti.',
    kako: 'Ustvarite dogodek pod “Dogodki”, člani potrdijo udeležbo, po dogodku pa zabeležite prisotnost. Pregled po datumih najdete v “Koledar”.',
  },
  {
    icon: '🚒',
    title: 'Vozila in oprema',
    kaj: 'Evidenca vozil in opreme društva z zadolžitvami, zgodovino in opomniki na roke pregledov. Kos opreme označite s QR kodo ali NFC nalepko.',
    kako: 'Vnesite vozila pod “Vozila” in opremo pod “Oprema”. Z mobilno aplikacijo admin ali strojnik nalepko NFC prisloni, nanjo zapiše podatke kosa (vrsto, zadolžitev, roke) in jo poveže z evidenco — nov kos lahko vnese kar prek še prazne nalepke.',
    leadershipOnly: true,
  },
  {
    icon: '📲',
    title: 'Skeniranje opreme',
    kaj: 'Vsak član v mobilni aplikaciji najde podatke kosa opreme tako, da prisloni telefon na NFC nalepko ali skenira QR kodo — vidi naziv, zadolžitev in roke pregledov. Svojo zadolženo opremo ima vedno pri roki pod “Moja oprema”.',
    kako: 'V mobilni aplikaciji tapnite ikono skeniranja zgoraj desno in izberite NFC ali QR. Ob poteku pregleda ali veljavnosti vaše zadolžene opreme dobite osebno obvestilo.',
  },
  {
    icon: '🎓',
    title: 'Usposabljanja',
    kaj: 'Evidenca opravljenih usposabljanj članov z opomniki pred potekom veljavnosti.',
    kako: 'Pod “Usposabljanja” dodajte usposabljanje in datum veljavnosti — sistem pravočasno opozori na obnovo.',
    leadershipOnly: true,
  },
  {
    icon: '🔔',
    title: 'Obvestila',
    kaj: 'Sporočila članom, ki jih prejmejo v aplikaciji in kot potisno (push) obvestilo na telefon.',
    kako: 'Pod “Obvestila” sestavite obvestilo in izberite prejemnike. Člani ga vidijo takoj, tudi na mobilni napravi.',
  },
  {
    icon: '🚨',
    title: 'Intervencije (SPIN)',
    kaj: 'Samodejno obveščanje o intervencijah iz javnega portala SPIN za občine, ki jih spremlja vaše društvo.',
    kako: 'V “Nastavitve → Društvo” izberite svojo občino in po želji sosednje. Operativni člani nato prejmejo obvestilo ob vsaki novi intervenciji.',
    leadershipOnly: true,
  },
  {
    icon: '✅',
    title: 'Pripravljeni ste',
    kaj: 'To je osnovni pregled. Vsi podatki, ki jih vnesete, ostanejo shranjeni.',
    kako: `Vodič lahko kadar koli znova odprete z gumbom “❓ Vodič” spodaj levo. Za pomoč smo dosegljivi na ${SUPPORT_EMAIL}.`,
  },
];

interface OnboardingTourProps {
  open: boolean;
  isLeadership: boolean;
  firstName?: string;
  onClose: () => void;
}

export function OnboardingTour({
  open,
  isLeadership,
  firstName,
  onClose,
}: OnboardingTourProps) {
  const steps = useMemo(
    () => STEPS.filter((s) => !s.leadershipOnly || isLeadership),
    [isLeadership],
  );
  const [index, setIndex] = useState(0);

  // Ob vsakem odprtju začni na prvem koraku.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Zapri z Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glava */}
        <div className="flex items-start justify-between bg-primary px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            {step.icon.startsWith('/') ? (
              <img src={step.icon} alt="" className="h-10 w-10 rounded-lg" />
            ) : (
              <span className="text-4xl leading-none">{step.icon}</span>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">
                Korak {index + 1} / {steps.length}
              </p>
              <h2 id="tour-title" className="text-xl font-bold">
                {isFirst && firstName ? `${step.title}, ${firstName}` : step.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Zapri vodič"
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Vsebina */}
        <div className="space-y-4 px-6 py-6">
          <p className="text-gray-700">{step.kaj}</p>
          <div className="rounded-lg bg-orange-50 px-4 py-3 text-sm text-gray-700">
            <span className="font-semibold text-primary">Kako: </span>
            {step.kako}
          </div>
        </div>

        {/* Napredek (pike) */}
        <div className="flex justify-center gap-1.5 pb-4">
          {steps.map((_, i) => (
            <button
              key={i}
              aria-label={`Korak ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-5 bg-primary' : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Krmarjenje */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 underline hover:text-gray-600"
          >
            Preskoči vodič
          </button>
          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={() => setIndex((i) => i - 1)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Nazaj
              </button>
            )}
            <button
              onClick={() => (isLast ? onClose() : setIndex((i) => i + 1))}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              {isLast ? 'Začni uporabljati' : 'Naprej'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
