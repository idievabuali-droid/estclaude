'use client';

import { useState } from 'react';
import { CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { AppModal } from '@/components/primitives';
import { VerificationBadge } from './VerificationBadge';

export interface VerifiedDeveloperButtonProps {
  developerName: string;
  /** When the developer was platform-verified (ISO string). */
  verifiedAt: string | null;
  /** License number — placeholder until real fields land in `developers`. */
  licenseNumber?: string;
  yearsActive?: number | null;
  projectsCompleted?: number | null;
}

/**
 * Tappable verified-developer badge that opens a dialog showing exactly
 * what was checked. WEDGE-3 — source transparency wins over Cian's opaque
 * "Проверено" badge by linking to the documents themselves.
 *
 * Until real document URLs exist (license PDF, escrow proof, etc.) the
 * dialog renders placeholder rows with a clear "Документ загружается"
 * note rather than fake links.
 */
export function VerifiedDeveloperButton({
  developerName,
  verifiedAt,
  licenseNumber,
  yearsActive,
  projectsCompleted,
}: VerifiedDeveloperButtonProps) {
  const [open, setOpen] = useState(false);
  const verifiedDate = verifiedAt
    ? new Date(verifiedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center"
        aria-label="Подробнее о проверке застройщика"
      >
        <VerificationBadge tier="phone_verified" developerVerified />
      </button>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="Проверенный застройщик"
        description={developerName}
      >
        <div className="flex flex-col gap-4">
          <p className="text-meta text-stone-700">
            Команда платформы лично проверила следующие пункты. Каждый — со ссылкой на источник
            или документ.
          </p>

          <ul className="flex flex-col gap-3">
            <CheckRow
              label="Контакт с офисом застройщика"
              detail={
                verifiedDate
                  ? `Подтверждено по телефону ${verifiedDate}`
                  : 'Дата не указана'
              }
            />
            <CheckRow
              label="Лицензия на строительство"
              detail={licenseNumber ?? 'Документ загружается'}
              docPlaceholder
            />
            <CheckRow
              label="Эскроу-счёт"
              detail="Документ загружается"
              docPlaceholder
            />
            <CheckRow
              label="Разрешение на строительство (РНС)"
              detail="Документ загружается"
              docPlaceholder
            />
            {yearsActive ? (
              <CheckRow
                label="Опыт"
                detail={`${yearsActive} лет на рынке${projectsCompleted ? ` · ${projectsCompleted} сданных проектов` : ''}`}
              />
            ) : null}
          </ul>

          <div className="flex items-start gap-3 rounded-md border border-amber-200/60 bg-amber-50/40 p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--color-badge-tier-developer)]" />
            <p className="text-meta text-stone-700">
              Мы не выдаём гарантий — только проверяем источники. Если что-то здесь окажется
              неточным, напишите нам, и мы пересмотрим статус.
            </p>
          </div>
        </div>
      </AppModal>
    </>
  );
}

function CheckRow({
  label,
  detail,
  docPlaceholder,
}: {
  label: string;
  detail: string;
  docPlaceholder?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2
        className="mt-0.5 size-4 shrink-0 text-[color:var(--color-fairness-great)]"
        aria-hidden
      />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-meta font-medium text-stone-900">{label}</span>
        <span className="inline-flex items-center gap-1 text-meta text-stone-500">
          {detail}
          {docPlaceholder ? (
            <ExternalLink className="size-3 opacity-50" aria-label="Документ" />
          ) : null}
        </span>
      </div>
    </li>
  );
}
