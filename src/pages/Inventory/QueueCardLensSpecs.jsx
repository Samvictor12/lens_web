import { Badge } from '@/components/ui/badge';

function hasSpecValue(value) {
  return value !== null && value !== undefined && value !== '';
}

const SPEC_FIELDS = [
  ['SPH', 'Spherical'],
  ['CYL', 'Cylindrical'],
  ['AXIS', 'Axis'],
  ['ADD', 'Add'],
  ['DIA', 'Dia'],
];

function EyeSpecTable({ label, badgeClass, order, prefix }) {
  const rows = SPEC_FIELDS.map(([fieldLabel, suffix]) => {
    const value = order?.[`${prefix}${suffix}`];
    if (!hasSpecValue(value)) return null;
    return { fieldLabel, value };
  }).filter(Boolean);

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b">
        <Badge className={`${badgeClass} text-[10px] py-0 px-1.5`}>{label[0]}</Badge>
        <span className="font-semibold text-[11px]">{label} Eye</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">—</p>
      ) : (
        <table className="w-full text-[11px]">
          <tbody>
            {rows.map(({ fieldLabel, value }) => (
              <tr key={fieldLabel} className="border-b border-border/40 last:border-0">
                <td className="py-0.5 pr-2 text-muted-foreground whitespace-nowrap">{fieldLabel}</td>
                <td className="py-0.5 text-right font-semibold text-foreground font-mono">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function QueueCardLensSpecs({ order }) {
  if (!order?.rightEye && !order?.leftEye) {
    return <p className="text-xs text-muted-foreground italic">No eye specifications</p>;
  }

  const showRight = Boolean(order.rightEye);
  const showLeft = Boolean(order.leftEye);
  const bothEyes = showRight && showLeft;

  return (
    <div className="rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
      <div className={bothEyes ? 'grid grid-cols-2 divide-x divide-border' : 'p-2.5'}>
        {showRight && (
          <div className={bothEyes ? 'p-2.5' : ''}>
            <EyeSpecTable
              label="Right"
              badgeClass="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200"
              order={order}
              prefix="right"
            />
          </div>
        )}
        {showLeft && (
          <div className={bothEyes ? 'p-2.5' : ''}>
            <EyeSpecTable
              label="Left"
              badgeClass="bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
              order={order}
              prefix="left"
            />
          </div>
        )}
      </div>
    </div>
  );
}
