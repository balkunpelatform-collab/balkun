import { Home, Tent, Building, Leaf, Globe, TreePine, Umbrella, Building2 } from "lucide-react";

export const CATEGORIES = [
  { id: "villa", label: "ویلا", icon: Home },
  { id: "cabin", label: "کلبه", icon: Tent },
  { id: "suite", label: "سوییت", icon: Building },
  { id: "eco", label: "بوم‌گردی", icon: Leaf },
  { id: "abroad", label: "خارج کشور", icon: Globe },
  { id: "forest", label: "جنگلی", icon: TreePine },
  { id: "beach", label: "ساحلی", icon: Umbrella },
  { id: "corporate", label: "سازمانی", icon: Building2, isSpecial: true },
];