import React from 'react';
import * as LucideIcons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-5 h-5', style }) => {
  // Safe lookup in LucideIcons
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Tag;
  return <IconComponent className={className} style={style} />;
};

export const POPULAR_ICONS = [
  'Utensils',
  'ShoppingBag',
  'Gamepad2',
  'Plane',
  'Car',
  'Receipt',
  'Store',
  'HeartPulse',
  'Briefcase',
  'Laptop',
  'TrendingUp',
  'Gift',
  'Coins',
  'Coffee',
  'Film',
  'Home',
  'BookOpen',
  'Smartphone',
  'PiggyBank',
  'ShieldCheck',
  'Fuel',
  'Sparkles',
];
