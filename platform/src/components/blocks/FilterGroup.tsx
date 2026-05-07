/**
 * FilterGroup — small wrapper that renders an uppercase eyebrow label
 * above a filter section's controls. The eyebrow + serif H2 rhythm
 * elsewhere on the platform applies the same vocabulary in the filter
 * rail: each group reads as a section, scannable at a glance.
 *
 * Pure server component, no state. Composition:
 *
 *   <FilterGroup label="Стадия">
 *     <PillRow ... />
 *   </FilterGroup>
 *
 * Used by both /novostroyki and /kvartiry filter rails.
 */
export function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
        {label}
      </span>
      {children}
    </div>
  );
}
