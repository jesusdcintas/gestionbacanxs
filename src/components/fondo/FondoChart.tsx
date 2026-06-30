import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SaldoMes {
  mes: string;
  saldo: number;
}

interface Props {
  data: SaldoMes[];
}

export default function FondoChart({ data }: Props) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-75 text-text-secondary">
        No hay movimientos para representar.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
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
          cursor={{ stroke: '#3a3a3a' }}
          formatter={(value: number) => [formatCurrency(value), 'Saldo']}
        />
        <Line
          type="monotone"
          dataKey="saldo"
          stroke="#d4ff3f"
          strokeWidth={2}
          dot={{ fill: '#d4ff3f', r: 3 }}
          activeDot={{ r: 5, fill: '#d4ff3f' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
