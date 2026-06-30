import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CategoryData {
  categoria: string;
  total: number;
  porcentaje: number;
}

interface Props {
  data: CategoryData[];
}

const COLORS = [
  '#d4ff3f', // accent lime
  '#f5f5f0', // off-white
  '#8a8a85', // mid grey
  '#3a3a3a', // border strong
  '#e2433f', // danger
  '#c2eb35', // accent hover
  '#262626', // border
];

export default function CategoryChart({ data }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-text-secondary">
        No hay datos de gastos por categoría
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `${entry.categoria}: ${entry.porcentaje.toFixed(1)}%`}
          outerRadius={120}
          fill="#d4ff3f"
          stroke="#0a0a0a"
          dataKey="total"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#141414',
            border: '1px solid #262626',
            borderRadius: '0px',
            color: '#f5f5f0',
            fontFamily: '"JetBrains Mono", monospace',
          }}
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
      </PieChart>
    </ResponsiveContainer>
  );
}
