import { Card } from '../../components/ui';
import { ChangePasswordCard } from './ChangePasswordCard';
import { useUi, type NavStyle } from '../../stores/ui.store';
import { OrganizationSettings } from './OrganizationSettings';

/** Miniaturni predogled izgleda navigacije. */
function LayoutPreview({ style }: { style: NavStyle }) {
  if (style === 'list') {
    return (
      <div className="flex h-28 w-20 flex-col gap-1 rounded-lg bg-[#2D2D2D] p-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`h-2 w-2 rounded-sm ${i === 0 ? 'bg-primary' : 'bg-gray-500'}`}
            />
            <div
              className={`h-1.5 flex-1 rounded ${i === 0 ? 'bg-primary' : 'bg-gray-500'}`}
            />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid h-28 w-20 grid-cols-2 content-start gap-1 rounded-lg bg-[#2D2D2D] p-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`flex aspect-square items-center justify-center rounded ${
            i === 0 ? 'bg-primary' : 'bg-gray-600'
          }`}
        >
          <div className="h-3 w-3 rounded-sm bg-white/60" />
        </div>
      ))}
    </div>
  );
}

const OPTIONS: { value: NavStyle; title: string; description: string }[] = [
  {
    value: 'list',
    title: 'Seznam',
    description: 'Klasičen levi seznam modulov z ikono in nazivom.',
  },
  {
    value: 'icons',
    title: 'Velike ikone',
    description: 'Mreža velikih ikon — hitrejši dostop na dotik.',
  },
];

export function SettingsPage() {
  const { navStyle, setNavStyle } = useUi();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Nastavitve</h1>

      <Card title="Izgled navigacije">
        <div className="grid gap-4 sm:grid-cols-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setNavStyle(opt.value)}
              className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
                navStyle === opt.value
                  ? 'border-primary bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <LayoutPreview style={opt.value} />
              <div>
                <p className="font-semibold">
                  {opt.title}
                  {navStyle === opt.value && (
                    <span className="ml-2 text-xs font-medium text-primary">
                      ✓ izbrano
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-gray-500">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Nastavitev se shrani v brskalnik in velja takoj.
        </p>
      </Card>

      <div className="mt-6">
        <ChangePasswordCard />
      </div>

      <div className="mt-6">
        <OrganizationSettings />
      </div>
    </div>
  );
}
