import {
  Home,
  Zap,
  ShoppingCart,
  Car,
  Utensils,
  HeartPulse,
  Gamepad2,
  Shirt,
  GraduationCap,
  Ellipsis,
  Tag,
  type LucideIcon,
} from "lucide-react"

export const categoryIconMap: Record<string, LucideIcon> = {
  home: Home,
  zap: Zap,
  "shopping-cart": ShoppingCart,
  car: Car,
  utensils: Utensils,
  "heart-pulse": HeartPulse,
  "gamepad-2": Gamepad2,
  shirt: Shirt,
  "graduation-cap": GraduationCap,
  ellipsis: Ellipsis,
  tag: Tag,
}

export function getCategoryIcon(iconName: string | null): LucideIcon {
  if (!iconName) return Tag
  return categoryIconMap[iconName] || Tag
}
