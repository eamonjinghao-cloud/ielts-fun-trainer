'use client';

import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts';

interface ScoreRadarProps {
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
}

export default function ScoreRadar({ reading, listening, writing, speaking }: ScoreRadarProps) {
  const data = [
    { subject: 'Reading', score: reading, fullMark: 9 },
    { subject: 'Listening', score: listening, fullMark: 9 },
    { subject: 'Writing', score: writing, fullMark: 9 },
    { subject: 'Speaking', score: speaking, fullMark: 9 },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 9]}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickCount={4}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#7c3aed"
          fill="#7c3aed"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}`, 'Band Score']}
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
