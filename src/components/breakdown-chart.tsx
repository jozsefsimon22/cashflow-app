
"use client";

import * as React from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { SettingsContext } from '@/context/settings-context';


interface BreakdownChartProps {
  title: string;
  type: 'receivables' | 'payables';
  data: {
    Standard: number;
    Intercompany: number;
    Manual: number;
  };
  onSliceClick: (category: 'Standard' | 'Intercompany' | 'Manual') => void;
}

const COLORS = {
  receivables: ['hsl(var(--primary))', 'hsl(var(--primary)/0.7)', 'hsl(var(--primary)/0.4)'],
  payables: ['hsl(var(--destructive))', 'hsl(var(--destructive)/0.7)', 'hsl(var(--destructive)/0.4)'],
};

export function BreakdownChart({ title, type, data, onSliceClick }: BreakdownChartProps) {
  const { columnConfig } = React.useContext(SettingsContext);

  const formatCurrency = (amount: number) => {
    if (amount === 0) return new Intl.NumberFormat('en-US', { style: 'currency', currency: columnConfig.currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(0);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: columnConfig.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const chartData = [
    { name: 'Standard', value: data.Standard },
    { name: 'Intercompany', value: data.Intercompany },
    { name: 'Manual', value: data.Manual },
  ].filter(d => d.value > 0);

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  const chartConfig = {
    value: { label: 'Value' },
    Standard: { label: 'Standard', color: COLORS[type][0] },
    Intercompany: { label: 'Intercompany', color: COLORS[type][1] },
    Manual: { label: 'Manual', color: COLORS[type][2] },
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : 0;
      return (
        <div className="p-2 bg-card border rounded-md shadow-lg text-sm">
          <p className="font-bold">{data.name}</p>
          <p className="font-mono">{formatCurrency(data.value)} ({percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          {type === 'receivables' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          {title}
        </CardTitle>
        <CardDescription>
          A breakdown of all open {type} in the forecast period. Click a slice for details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalValue > 0 ? (
          <div className="w-full h-[250px] flex items-center">
            <div className="w-1/2 h-full">
              <ChartContainer config={chartConfig} className="h-full w-full p-0 m-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      paddingAngle={5}
                      labelLine={false}
                      onClick={(data) => onSliceClick(data.name as 'Standard' | 'Intercompany' | 'Manual')}
                      className="cursor-pointer"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[type][index % COLORS[type].length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="w-1/2 pl-4 space-y-2 text-sm">
                <div className="font-bold mb-4">Total: {formatCurrency(totalValue)}</div>
              {chartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 cursor-pointer" onClick={() => onSliceClick(entry.name as 'Standard' | 'Intercompany' | 'Manual')}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[type][index] }} />
                  <div className="flex-1 flex justify-between">
                    <span>{entry.name}</span>
                    <span className="font-mono font-semibold">{formatCurrency(entry.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No {type} data to display.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
