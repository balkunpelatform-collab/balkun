// تمام مسیرهای API اتاقک از یک جا مدیریت می‌شوند تا وقتی مستندات رسمی
// رسید، فقط همین یک فایل آپدیت شود.

export const OTAGHAK_ENDPOINTS = {
  login: "/Login",
  getAllStates: "/GetAllStates()",
  getAllCities: "/GetAllCities()",
  getAllRoomTypes: "/RoomType/GetAll",
  getSearchTags: "/RoomSearch/GetTags",
  searchRooms: "/RoomSearch/SearchRooms",
  
  // اندپوینت جدید فاز ۴
  getRoomDetail: "/Room/GetRoomDetail", 
};