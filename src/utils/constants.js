export const MAX_SUPLENTES = 10;

export const PHYSICAL_STATES = {
  cansado: { emoji: '😫', label: 'Cansado', factor: 0.6, color: '#ef4444', icon: '/icons/State=Down, Size=Medium.svg' },
  normal: { emoji: '😐', label: 'Normal', factor: 1.0, color: '#f59e0b', icon: '/icons/State=Good, Size=Medium.svg' },
  excelente: { emoji: '💪', label: 'Excelente', factor: 1.3, color: '#10b981', icon: '/icons/State=Fire, Size=Medium.svg' }
};

export const PLAYER_COUNTS = [
  { total: 10, perTeam: 5, format: '5 vs 5' },
  { total: 12, perTeam: 6, format: '6 vs 6' },
  { total: 14, perTeam: 7, format: '7 vs 7' },
  { total: 16, perTeam: 8, format: '8 vs 8' },
  { total: 18, perTeam: 9, format: '9 vs 9' },
  { total: 22, perTeam: 11, format: '11 vs 11' }
];

export const ROLES = {
  ARQUERO: 'arquero',
  DEFENSOR: 'defensor',
  MEDIO: 'medio',
  DELANTERO: 'delantero'
};

export const POSITIONS = {
  ARQUERO: 'Arquero',
  DEFENSOR: 'Defensor',
  MEDIOCAMPISTA: 'Mediocampista',
  DELANTERO: 'Delantero'
};
