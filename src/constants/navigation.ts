import { Home, Headphones, Wallet, User } from "lucide-react";

export const HEADER_LINKS = [
  { label: "خانه", href: "/" },
  { label: "بلاگ", href: "/blog" },
  { label: "پشتیبانی", href: "/support" },
  { label: "درباره ما", href: "/about" },
  { label: "خدمات سازمانی", href: "/corporate" },
];

export const BOTTOM_NAV_LINKS = [
  { label: "خانه", icon: Home, href: "/" },
  { label: "پشتیبانی", icon: Headphones, href: "/support" },
  { label: "کیف پول", icon: Wallet, href: "/profile?tab=wallet" },
  { label: "پروفایل", icon: User, href: "/profile" },
];