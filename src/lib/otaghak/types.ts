// مسیر: src/lib/otaghak/types.ts

// ==========================================
// احراز هویت اتاقک
// ==========================================
export interface OtaghakLoginResponse {
  accessToken: string;
  expiresIn?: number; // ثانیه
  tokenType?: string;
}

// ==========================================
// اطلاعات پایه (Base Data)
// ==========================================
export interface OtaghakState {
  stateCode: string;
  stateName: string;
}

export interface OtaghakCity {
  cityCode: string;
  cityName: string;
  stateCode: string;
}

export interface OtaghakRoomType {
  roomTypeId: string;
  roomTypeName: string;
}

export interface OtaghakTag {
  tagId: string;
  tagName: string;
}

export interface OtaghakBaseData {
  states: OtaghakState[];
  cities: OtaghakCity[];
  roomTypes: OtaghakRoomType[];
  tags: OtaghakTag[];
}

// ==========================================
// موتور جستجو (SearchRooms)
// ==========================================
export interface OtaghakSearchParams {
  checkin: string;
  checkout: string;
  person: number;
  cities?: string[];
  stateCodes?: string[];
  category?: string; // 🆕 فاز ۱۱ بخش ۲: فیلتر بر اساس دسته‌بندی (id از src/constants/categories.ts)
}

export interface OtaghakRawSearchItem {
  roomId: string;
  roomName: string;
  roomType: string;
  cityName: string;
  stateName: string;
  basePrice: number;
  afterDiscount: number;
  rating: number | null;
  coverImageUrl: string;
  topAttributes: string[];
}

export interface BalkunSearchItem extends Omit<OtaghakRawSearchItem, "basePrice" | "afterDiscount"> {
  basePrice: number;
  afterDiscount: number;
}

export interface OtaghakSearchResponse {
  items: OtaghakRawSearchItem[];
  totalCount: number;
}

export interface BalkunSearchResponse {
  items: BalkunSearchItem[];
  totalCount: number;
}

// ==========================================
// فاز ۴: جزئیات اقامتگاه (Room Details PDP)
// ==========================================
export interface OtaghakRoomMedia {
  url: string;
  type: "IMAGE" | "VIDEO";
}

// ساختار خامی که مستقیماً از اتاقک می‌آید (بدون اعمال ۵٪)
export interface OtaghakRawRoomDetails {
  roomId: string;
  roomName: string;
  roomType: string;
  stateName: string;
  cityName: string;
  personCapacity: number;
  extraPersonCapacity: number;
  hostName: string;
  hostAvatar?: string;
  rating: number | null;
  cancelRuleTypeTitle: string;
  cancelRuleTypeDescription: string;
  roomRules: string[];
  authenticationDocuments: string[];
  topAttributes: string[];
  allAttributes: string[];
  roomMedia: OtaghakRoomMedia[];
  basePrice: number;
  extraPersonPrice: number;
  afterDiscount: number;
}

// ساختار نهایی که به فرانت‌اند بالکن می‌رسد (شامل ۵٪ افزایش قیمت)
export interface BalkunRoomDetails extends Omit<OtaghakRawRoomDetails, "basePrice" | "extraPersonPrice" | "afterDiscount"> {
  basePrice: number;
  extraPersonPrice: number;
  afterDiscount: number;
}