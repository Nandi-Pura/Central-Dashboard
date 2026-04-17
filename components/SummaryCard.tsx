type Props = {
  title: string;
  value: string;
  subtitle: string;
};

export default function SummaryCard({ title, value, subtitle }: Props) {
  return (
    <div className="panel">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}
