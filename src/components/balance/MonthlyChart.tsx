import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyData {
  mes: string;
  ingresos: number;
  gastos: number;
  beneficio: number;
}

interface Props {
  data: MonthlyData[];
}

export default function MonthlyChart({ data }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis
          dataKey="mes"
          stroke="#8a8a85"
          style={{ fontSize: '11px', fontFamily: '"JetBrains Mono", monospace' }}
        />
        <YAxis
          stroke="#8a8a85"
          style={{ fontSize: '11px', fontFamily: '"JetBrains Mono", monospace' }}
          tickFormatter={formatCurrency}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#141414',
            border: '1px solid #262626',
            borderRadius: '0px',
            color: '#f5f5f0',
            fontFamily: '"JetBrains Mono", monospace',
          }}
          cursor={{ fill: '#1a1a1a' }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '20px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#8a8a85',
          }}
        />
        <Bar
          dataKey="ingresos"
          name="Ingresos"
          fill="#d4ff3f"
        />
        <Bar
          dataKey="gastos"
          name="Gastos"
          fill="#e2433f"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
