'use client'
import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
  isRTL: boolean;
}

const translations = {
  en: {
    // Header
    "header.title": "University of Ha'il",
    "header.subtitle": "Equipment Maintenance System",
    "header.department": "Maintenance Department",
    "header.facility": "Facility Management",
    
    // Equipment Card
    "equipment.upToDate": "Up to Date",
    "equipment.dueSoon": "Due Soon", 
    "equipment.overdue": "Overdue",
    "equipment.lastMaintenance": "Last Maintenance",
    "equipment.nextMaintenance": "Next Maintenance",
    "equipment.inDays": "In {days} days",
    "equipment.overdueBy": "Overdue by {days} days",
    "equipment.every": "Every",
    "equipment.sparePartsRequired": "Spare Parts Required",
    "equipment.approved": "Approved",
    "equipment.pendingApproval": "Pending Approval",
    "equipment.requestApproval": "Request Approval",
    "equipment.scheduleMaintenance": "Schedule Maintenance",
    "equipment.part": "Part",
    "equipment.edit": "Edit",
    "equipment.inUse": "In Use",
    "equipment.notInUse": "Not In Use",
    "equipment.markMaintenanceCompleted": "Mark Maintenance Completed",
    "equipment.equipmentUpdated": "Equipment Updated",
    
    // Add Equipment Form
    "form.addNewEquipment": "Add New Equipment",
    "form.machineName": "Machine Name",
    "form.partNumber": "Part Number",
    "form.location": "Location",
    "form.maintenanceInterval": "Maintenance Interval",
    "form.lastMaintenanceDate": "Last Maintenance Date",
    "form.sparePartsRequired": "Spare parts required for maintenance",
    "form.selectInterval": "Select interval",
    "form.everyWeek": "Every Week",
    "form.every2Weeks": "Every 2 Weeks", 
    "form.everyMonth": "Every Month",
    "form.every3Months": "Every 3 Months",
    "form.every6Months": "Every 6 Months",
    "form.everyYear": "Every Year",
    "form.addEquipment": "Add Equipment",
    "form.cancel": "Cancel",
    "form.required": "*",
    "form.save": "Save",
    
    // Alerts
    "alert.allCurrent": "All Equipment Current",
    "alert.allCurrentDesc": "All equipment maintenance schedules are up to date.",
    "alert.overdueMaintenance": "Overdue Maintenance",
    "alert.overdueCount": "{count} equipment item overdue for maintenance.|{count} equipment items overdue for maintenance.",
    "alert.dueSoon": "Maintenance Due Soon",
    "alert.dueSoonCount": "{count} equipment item due for maintenance within 7 days.|{count} equipment items due for maintenance within 7 days.",
    "alert.scheduleOverview": "Maintenance Schedule Overview",
    
    // Search and Filter
    "search.placeholder": "Search equipment...",
    "filter.byStatus": "Filter by status",
    "filter.allEquipment": "All Equipment",
    "filter.upToDate": "Up to Date",
    "filter.dueSoon": "Due Soon",
    "filter.overdue": "Overdue",
    "search.noResults": "No equipment found matching your criteria.",
    
    // Toast Messages
    "toast.error": "Error",
    "toast.fillRequired": "Please fill in all required fields",
    "toast.success": "Success", 
    "toast.equipmentAdded": "Equipment added successfully",
    "toast.maintenanceScheduled": "Maintenance Scheduled",
    "toast.maintenanceScheduledDesc": "Maintenance for {name} has been scheduled.",
    "toast.sparePartsApproved": "Spare Parts Approved",
    "toast.sparePartsApprovedDesc": "Spare parts request has been sent for approval.",
    
    // Language
    "language.switch": "العربية",
    "language.current": "English"
  },
  ar: {
    // Header
    "header.title": "نظام صيانة المعدات",
    "header.subtitle": "جامعة حائل",
    "header.department": "قسم الصيانة",
    "header.facility": "إدارة المرافق",
    
    // Equipment Card
    "equipment.upToDate": "محدث",
    "equipment.dueSoon": "مستحق قريباً",
    "equipment.overdue": "متأخر",
    "equipment.lastMaintenance": "آخر صيانة",
    "equipment.nextMaintenance": "الصيانة القادمة",
    "equipment.inDays": "خلال {days} أيام",
    "equipment.overdueBy": "متأخر بـ {days} أيام",
    "equipment.every": "كل",
    "equipment.sparePartsRequired": "قطع غيار مطلوبة",
    "equipment.approved": "معتمد",
    "equipment.pendingApproval": "في انتظار الموافقة",
    "equipment.requestApproval": "طلب موافقة",
    "equipment.scheduleMaintenance": "جدولة الصيانة",
    "equipment.part": "الجزء",
    "equipment.edit": "تعديل",
    "equipment.inUse": "في الاستخدام",
    "equipment.notInUse": "غير في الاستخدام",
    "equipment.markMaintenanceCompleted": "تم إنهاء الصيانة",
    "equipment.equipmentUpdated": "تم تحديث المعدة",

    // Add Equipment Form
    "form.addNewEquipment": "إضافة معدة جديدة",
    "form.machineName": "اسم الماكينة",
    "form.partNumber": "رقم الجزء",
    "form.location": "الموقع",
    "form.maintenanceInterval": "فترة الصيانة",
    "form.lastMaintenanceDate": "تاريخ آخر صيانة",
    "form.sparePartsRequired": "قطع غيار مطلوبة للصيانة",
    "form.selectInterval": "اختر الفترة",
    "form.everyWeek": "كل أسبوع",
    "form.every2Weeks": "كل أسبوعين",
    "form.everyMonth": "كل شهر",
    "form.every3Months": "كل 3 أشهر",
    "form.every6Months": "كل 6 أشهر", 
    "form.everyYear": "كل سنة",
    "form.addEquipment": "إضافة معدة",
    "form.cancel": "إلغاء",
    "form.required": "*",
    "form.save": "حفظ",

    // Alerts
    "alert.allCurrent": "جميع المعدات محدثة",
    "alert.allCurrentDesc": "جميع جداول صيانة المعدات محدثة.",
    "alert.overdueMaintenance": "صيانة متأخرة",
    "alert.overdueCount": "{count} معدة متأخرة في الصيانة.|{count} معدات متأخرة في الصيانة.",
    "alert.dueSoon": "صيانة مستحقة قريباً",
    "alert.dueSoonCount": "{count} معدة مستحقة للصيانة خلال 7 أيام.|{count} معدات مستحقة للصيانة خلال 7 أيام.",
    "alert.scheduleOverview": "نظرة عامة على جدول الصيانة",
    
    // Search and Filter
    "search.placeholder": "البحث في المعدات...",
    "filter.byStatus": "تصفية حسب الحالة",
    "filter.allEquipment": "جميع المعدات",
    "filter.upToDate": "محدث",
    "filter.dueSoon": "مستحق قريباً",
    "filter.overdue": "متأخر",
    "search.noResults": "لم يتم العثور على معدات تطابق معاييرك.",
    
    // Toast Messages
    "toast.error": "خطأ",
    "toast.fillRequired": "يرجى ملء جميع الحقول المطلوبة",
    "toast.success": "نجح",
    "toast.equipmentAdded": "تم إضافة المعدة بنجاح",
    "toast.maintenanceScheduled": "تم جدولة الصيانة",
    "toast.maintenanceScheduledDesc": "تم جدولة الصيانة لـ {name}.",
    "toast.sparePartsApproved": "تم اعتماد قطع الغيار",
    "toast.sparePartsApprovedDesc": "تم إرسال طلب قطع الغيار للموافقة.",
    
    // Language
    "language.switch": "English",
    "language.current": "العربية"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");
  
  const t = (key: string, params?: Record<string, unknown>) => {
    let text = translations[language][key as keyof typeof translations[typeof language]] || key;
    
    // Handle pluralization for count
    if (params?.count !== undefined && text.includes("|")) {
      const [singular, plural] = text.split("|");
      text = params.count === 1 ? singular : plural;
    }
    
    // Replace parameters
    if (params) {
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param] as string);
      });
    }
    
    return text;
  };
  
  const isRTL = language === "ar";
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div className={isRTL ? "rtl" : "ltr"} dir={isRTL ? "rtl" : "ltr"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};