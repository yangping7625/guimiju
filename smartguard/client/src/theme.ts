// 配色系统：严格还原 prototype.html（新能源绿 / 汽车蓝 / 深蓝黑仪表盘）
export const THEME = {
  newenergy: { primary: '#00e396', primaryDim: '#1a3a2a', label: '新能源电站', icon: '☀️' },
  auto: { primary: '#57c7ff', primaryDim: '#1a2a40', label: '汽车产线', icon: '🏭' },
  bg: '#0a0e1a',
  sidebar: '#0d1125',
  panel: '#111836',
  border: '#1a2040',
  text: '#e6f1ff',
  text2: '#d0d5e0',
  text3: '#8892b0',
  text4: '#495670',
  green: '#00e396',
  yellow: '#ffb86c',
  red: '#ff5555',
  blue: '#57c7ff',
  gray: '#495670',
} as const;

export type SceneKey = 'newenergy' | 'auto';
