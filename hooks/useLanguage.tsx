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
    "form.back": "Back",
    "form.next": "Next",
    
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
    "filter.all": "All",
    "search.noResults": "No equipment found matching your criteria.",
    
    // Toast Messages
    "toast.error": "Error",
    "toast.fillRequired": "Please fill in all required fields",
    "toast.success": "Success", 
    "toast.equipmentAdded": "Equipment added successfully",
    "toast.maintenanceScheduled": "Maintenance Scheduled",
    "toast.maintenanceScheduledDesc": "Maintenance for {name} has been scheduled.",
    "toast.serviceRequestCreated": "Service request created",
    "toast.serviceRequestUpdated": "Service request updated",
    "toast.updated": "Updated successfully",
    
    // Language
    "language.switch": "العربية",
    "language.current": "English"
  ,
    // Maintenance Schedule Dialog
    "maintenanceDialog.title": "Schedule Maintenance - {name}",
    "maintenanceDialog.scheduleDetails": "Schedule Details",
    "maintenanceDialog.scheduledDate": "Scheduled Date",
    "maintenanceDialog.scheduledTime": "Scheduled Time",
    "maintenanceDialog.estimatedDuration": "Estimated Duration (hours)",
    "maintenanceDialog.selectDuration": "Select duration",
    "maintenanceDialog.duration.30m": "30 minutes",
    "maintenanceDialog.duration.1h": "1 hour",
    "maintenanceDialog.duration.2h": "2 hours",
    "maintenanceDialog.duration.4h": "4 hours",
    "maintenanceDialog.duration.8h": "8 hours (Full day)",
    "maintenanceDialog.duration.custom": "Custom",
    "maintenanceDialog.priority": "Priority Level",
    "maintenanceDialog.selectPriority": "Select priority",
    "priority.low": "Low",
    "priority.medium": "Medium",
    "priority.high": "High",
    "priority.urgent": "Urgent",
    "maintenanceDialog.problemAssessment": "Problem Assessment",
    "maintenanceDialog.problemDescription": "Problem Description",
    "maintenanceDialog.problemPlaceholder": "Describe the current problem or maintenance requirement...",
    "maintenanceDialog.technicalAssessment": "Technical Assessment",
    "maintenanceDialog.technicalAssessmentPlaceholder": "Provide technical assessment of the equipment condition...",
    "maintenanceDialog.recommendation": "Maintenance Recommendation",
    "maintenanceDialog.recommendationPlaceholder": "Recommend specific maintenance actions or procedures...",
    "maintenanceDialog.sparePartsSection": "Spare Parts Requirements",
    "maintenanceDialog.requiresSpareParts": "This maintenance requires new spare parts",
    "maintenanceDialog.sparePartsInfo": "If you need to request new spare parts for this maintenance, click the button below to submit a spare part request.",
    "maintenanceDialog.requestSpareParts": "Request New Spare Parts",
    "maintenanceDialog.existingSpareParts": "Existing Spare Parts to Use",
    "maintenanceDialog.existingSparePartsPlaceholder": "List any existing spare parts that will be used in this maintenance...",
    "maintenanceDialog.technicianAssignment": "Technician Assignment",
    "maintenanceDialog.assignedTechnician": "Assigned Technician",
    "maintenanceDialog.selectTechnician": "Select technician",
    "maintenanceDialog.additionalNotes": "Additional Notes",
    "maintenanceDialog.additionalNotesPlaceholder": "Any additional notes or special instructions for the technician...",
    "maintenanceDialog.scheduleButton": "Schedule Maintenance",

    // Service Request
    "serviceRequest.manageRequests": "Manage Service Requests",
    "serviceRequest.newRequest": "Raise Service Request",
    "serviceRequest.createTitle": "Create Service Request",
    "serviceRequest.editTitle": "Edit Service Request",
    "serviceRequest.description": "Fill in the details below to raise a service request.",
    "serviceRequest.requestType": "Request Type",
    "serviceRequest.selectType": "Select type",
    "serviceRequest.types.preventive": "Preventive maintenance",
    "serviceRequest.types.corrective": "Corrective maintenance",
    "serviceRequest.types.install": "Install",
    "serviceRequest.types.assess": "Assess",
    "serviceRequest.types.other": "Other",
    "serviceRequest.priority": "Priority",
    "serviceRequest.selectPriority": "Select priority",
    "serviceRequest.priorities.low": "Low",
    "serviceRequest.priorities.medium": "Medium",
    "serviceRequest.priorities.high": "High",
    "serviceRequest.scheduledAt": "Scheduled At",
    "serviceRequest.problemDescription": "Problem Description",
    "serviceRequest.problemPlaceholder": "Describe the problem...",
    "serviceRequest.technicalAssessment": "Technical Assessment",
    "serviceRequest.assessmentPlaceholder": "Enter technical assessment...",
    "serviceRequest.recommendation": "Recommendation",
    "serviceRequest.recommendationPlaceholder": "Enter recommendation...",
    "serviceRequest.viewEquipment": "View equipment",
    "serviceRequest.status": "Status",
    "serviceRequest.approvalStatus": "Approval Status",
    "serviceRequest.workStatus": "Work Status",
    "serviceRequest.statuses.pending": "Pending",
    "serviceRequest.statuses.approved": "Approved",
    "serviceRequest.statuses.rejected": "Rejected",
    "serviceRequest.statuses.completed": "Completed",
    "serviceRequest.statuses.cancelled": "Cancelled",
    "serviceRequest.create": "Create Request",
    "serviceRequest.openRequest": "Open request",

    // Spare parts in Service Request
    "serviceRequest.spareParts.title": "Spare Parts",
    "serviceRequest.spareParts.part": "Part name",
    "serviceRequest.spareParts.description": "Description (optional)",
    "serviceRequest.spareParts.quantity": "Qty",
    "serviceRequest.spareParts.cost": "Cost",
    "serviceRequest.spareParts.source": "Source/Supplier",
    "serviceRequest.spareParts.add": "Add",
    "serviceRequest.spareParts.remove": "Remove",
    "serviceRequest.spareParts.empty": "No spare parts added.",
    "serviceRequest.spareParts.total": "Total: {amount}",
    "serviceRequest.spareParts.validation": "Please enter part name and quantity",

    // Spare Part Request Dialog
    "spareDialog.title": "Request Spare Parts - {name}",
    "spareDialog.addTitle": "Add Spare Part Request",
    "spareDialog.partName": "Part Name",
    "spareDialog.partNamePlaceholder": "Enter part name",
    "spareDialog.partNumber": "Part Number",
    "spareDialog.partNumberPlaceholder": "Enter part number",
    "spareDialog.description": "Description",
    "spareDialog.descriptionPlaceholder": "Detailed description of the spare part and its use",
    "spareDialog.quantity": "Quantity",
    "spareDialog.estimatedPriceSar": "Est. Price (SAR)",
    "spareDialog.supplierLabel": "Preferred Supplier/Source",
    "spareDialog.supplierPlaceholder": "Enter supplier name or source",
    "spareDialog.urgencyLabel": "Urgency Level",
    "spareDialog.selectUrgency": "Select urgency",
    "spareDialog.urgency.low": "Low - Can wait",
    "spareDialog.urgency.medium": "Medium - Normal timeline",
    "spareDialog.urgency.high": "High - Needed soon",
    "spareDialog.urgency.urgent": "Urgent - Critical",
    "spareDialog.addToList": "Add to Request List",
    "spareDialog.requestedParts": "Requested Parts",
    "spareDialog.totalSar": "Total: {amount} SAR",
    "spareDialog.empty.title": "No spare parts requested yet",
    "spareDialog.empty.subtitle": "Add spare parts using the form on the left",
    "spareDialog.remove": "Remove",
    "spareDialog.partNumberShort": "Part #:",
    "spareDialog.qtyShort": "Qty:",
    "spareDialog.priceShort": "Price:",
    "spareDialog.urgencyShort": "Urgency:",
    "spareDialog.supplierShort": "Supplier:",
    "spareDialog.totalEstimatedSar": "Total Estimated Cost: {amount} SAR",
    "spareDialog.submitAll": "Submit All Requests for Approval",
    "spareDialog.fillNameQty": "Please fill in part name and quantity.",
    "spareDialog.addedTitle": "Spare Part Added",
    "spareDialog.addedDesc": "Spare part request has been added to the list.",
    "spareDialog.noRequestsTitle": "No Requests",
    "spareDialog.noRequestsDesc": "Please add at least one spare part request.",
    "spareDialog.submittedTitle": "Spare Part Requests Submitted",
    "spareDialog.submittedDesc": "{count} request submitted for approval for {name}.|{count} requests submitted for approval for {name}."
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
    "form.back": "رجوع",
    "form.next": "التالي",

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
    "filter.all": "الجميع",
    "search.noResults": "لم يتم العثور على معدات تطابق معاييرك.",
    
    // Toast Messages
    "toast.error": "خطأ",
    "toast.fillRequired": "يرجى ملء جميع الحقول المطلوبة",
    "toast.success": "نجح",
    "toast.equipmentAdded": "تم إضافة المعدة بنجاح",
    "toast.maintenanceScheduled": "تم جدولة الصيانة",
    "toast.maintenanceScheduledDesc": "تم جدولة الصيانة لـ {name}.",
    "toast.serviceRequestCreated": "تم إنشاء طلب الخدمة",
    "toast.serviceRequestUpdated": "تم تحديث طلب الخدمة",
    "toast.updated": "تم التحديث بنجاح",
    
    // Language
    "language.switch": "English",
    "language.current": "العربية"
  ,
    // Maintenance Schedule Dialog
    "maintenanceDialog.title": "جدولة الصيانة - {name}",
    "maintenanceDialog.scheduleDetails": "تفاصيل الجدولة",
    "maintenanceDialog.scheduledDate": "التاريخ المجدول",
    "maintenanceDialog.scheduledTime": "الوقت المجدول",
    "maintenanceDialog.estimatedDuration": "المدة المتوقعة (ساعات)",
    "maintenanceDialog.selectDuration": "اختر المدة",
    "maintenanceDialog.duration.30m": "30 دقيقة",
    "maintenanceDialog.duration.1h": "ساعة واحدة",
    "maintenanceDialog.duration.2h": "ساعتان",
    "maintenanceDialog.duration.4h": "4 ساعات",
    "maintenanceDialog.duration.8h": "8 ساعات (يوم كامل)",
    "maintenanceDialog.duration.custom": "مخصص",
    "maintenanceDialog.priority": "مستوى الأولوية",
    "maintenanceDialog.selectPriority": "اختر الأولوية",
    "priority.low": "منخفضة",
    "priority.medium": "متوسطة",
    "priority.high": "عالية",
    "priority.urgent": "عاجلة",
    "maintenanceDialog.problemAssessment": "تقييم المشكلة",
    "maintenanceDialog.problemDescription": "وصف المشكلة",
    "maintenanceDialog.problemPlaceholder": "صف المشكلة الحالية أو متطلب الصيانة...",
    "maintenanceDialog.technicalAssessment": "التقييم الفني",
    "maintenanceDialog.technicalAssessmentPlaceholder": "قدّم تقييماً فنياً لحالة المعدة...",
    "maintenanceDialog.recommendation": "توصية الصيانة",
    "maintenanceDialog.recommendationPlaceholder": "أوصِ بإجراءات أو أعمال صيانة محددة...",
    "maintenanceDialog.sparePartsSection": "متطلبات قطع الغيار",
    "maintenanceDialog.requiresSpareParts": "تتطلب هذه الصيانة قطع غيار جديدة",
    "maintenanceDialog.sparePartsInfo": "إذا كنت بحاجة لطلب قطع غيار جديدة لهذه الصيانة، انقر الزر أدناه لتقديم طلب قطع غيار.",
    "maintenanceDialog.requestSpareParts": "طلب قطع غيار جديدة",
    "maintenanceDialog.existingSpareParts": "قطع الغيار المتوفرة للاستخدام",
    "maintenanceDialog.existingSparePartsPlaceholder": "اذكر أي قطع غيار متوفرة ستُستخدم في هذه الصيانة...",
    "maintenanceDialog.technicianAssignment": "تعيين الفني",
    "maintenanceDialog.assignedTechnician": "الفني المعيّن",
    "maintenanceDialog.selectTechnician": "اختر الفني",
    "maintenanceDialog.additionalNotes": "ملاحظات إضافية",
    "maintenanceDialog.additionalNotesPlaceholder": "أي ملاحظات إضافية أو تعليمات خاصة للفني...",
    "maintenanceDialog.scheduleButton": "جدولة الصيانة",

    // Service Request
    "serviceRequest.manageRequests": "إدارة طلبات الخدمة",
    "serviceRequest.newRequest": "إنشاء طلب خدمة",
    "serviceRequest.createTitle": "إنشاء طلب خدمة",
    "serviceRequest.editTitle": "تعديل طلب الخدمة",
    "serviceRequest.description": "املأ التفاصيل أدناه لإنشاء طلب خدمة.",
    "serviceRequest.requestType": "نوع الطلب",
    "serviceRequest.selectType": "اختر النوع",
    "serviceRequest.types.preventive": "صيانة وقائية",
    "serviceRequest.types.corrective": "صيانة علاجية",
    "serviceRequest.types.install": "تركيب",
    "serviceRequest.types.assess": "تقييم",
    "serviceRequest.types.other": "أخرى",
    "serviceRequest.priority": "الأولوية",
    "serviceRequest.selectPriority": "اختر الأولوية",
    "serviceRequest.priorities.low": "منخفضة",
    "serviceRequest.priorities.medium": "متوسطة",
    "serviceRequest.priorities.high": "عالية",
    "serviceRequest.scheduledAt": "التاريخ/الوقت المجدول",
    "serviceRequest.problemDescription": "وصف المشكلة",
    "serviceRequest.problemPlaceholder": "صف المشكلة...",
    "serviceRequest.technicalAssessment": "التقييم الفني",
    "serviceRequest.assessmentPlaceholder": "أدخل التقييم الفني...",
    "serviceRequest.recommendation": "التوصية",
    "serviceRequest.recommendationPlaceholder": "أدخل التوصية...",
    "serviceRequest.viewEquipment": "عرض المعدة",
    "serviceRequest.status": "الحالة",
    "serviceRequest.approvalStatus": "حالة الموافقة",
    "serviceRequest.workStatus": "حالة العمل",
    "serviceRequest.statuses.pending": "بانتظار",
    "serviceRequest.statuses.approved": "معتمد",
    "serviceRequest.statuses.rejected": "مرفوض",
    "serviceRequest.statuses.completed": "مكتمل",
    "serviceRequest.statuses.cancelled": "ملغي",
    "serviceRequest.create": "إنشاء الطلب",
    "serviceRequest.openRequest": "طلب مفتوح",

    // Spare parts in Service Request
    "serviceRequest.spareParts.title": "قطع الغيار",
    "serviceRequest.spareParts.part": "اسم القطعة",
    "serviceRequest.spareParts.description": "الوصف (اختياري)",
    "serviceRequest.spareParts.quantity": "الكمية",
    "serviceRequest.spareParts.cost": "التكلفة",
    "serviceRequest.spareParts.source": "المصدر/المورّد",
    "serviceRequest.spareParts.add": "إضافة",
    "serviceRequest.spareParts.remove": "إزالة",
    "serviceRequest.spareParts.empty": "لم تتم إضافة قطع غيار.",
    "serviceRequest.spareParts.total": "الإجمالي: {amount}",
    "serviceRequest.spareParts.validation": "يرجى إدخال اسم القطعة والكمية",

    // Spare Part Request Dialog
    "spareDialog.title": "طلب قطع غيار - {name}",
    "spareDialog.addTitle": "إضافة طلب قطع غيار",
    "spareDialog.partName": "اسم القطعة",
    "spareDialog.partNamePlaceholder": "أدخل اسم القطعة",
    "spareDialog.partNumber": "رقم القطعة",
    "spareDialog.partNumberPlaceholder": "أدخل رقم القطعة",
    "spareDialog.description": "الوصف",
    "spareDialog.descriptionPlaceholder": "وصف تفصيلي للقطعة وطريقة الاستخدام",
    "spareDialog.quantity": "الكمية",
    "spareDialog.estimatedPriceSar": "السعر التقديري (ر.س)",
    "spareDialog.supplierLabel": "المورّد/المصدر المفضل",
    "spareDialog.supplierPlaceholder": "أدخل اسم المورّد أو المصدر",
    "spareDialog.urgencyLabel": "مستوى الأهمية",
    "spareDialog.selectUrgency": "اختر الأهمية",
    "spareDialog.urgency.low": "منخفض - يمكن الانتظار",
    "spareDialog.urgency.medium": "متوسط - مدة طبيعية",
    "spareDialog.urgency.high": "عالٍ - مطلوب قريباً",
    "spareDialog.urgency.urgent": "عاجل - حرج",
    "spareDialog.addToList": "إضافة إلى قائمة الطلب",
    "spareDialog.requestedParts": "القطع المطلوبة",
    "spareDialog.totalSar": "الإجمالي: {amount} ر.س",
    "spareDialog.empty.title": "لا توجد طلبات قطع غيار بعد",
    "spareDialog.empty.subtitle": "أضف قطع الغيار باستخدام النموذج على اليسار",
    "spareDialog.remove": "إزالة",
    "spareDialog.partNumberShort": "رقم القطعة:",
    "spareDialog.qtyShort": "الكمية:",
    "spareDialog.priceShort": "السعر:",
    "spareDialog.urgencyShort": "الأهمية:",
    "spareDialog.supplierShort": "المورّد:",
    "spareDialog.totalEstimatedSar": "إجمالي التكلفة التقديرية: {amount} ر.س",
    "spareDialog.submitAll": "إرسال جميع الطلبات للموافقة",
    "spareDialog.fillNameQty": "يرجى إدخال اسم القطعة والكمية.",
    "spareDialog.addedTitle": "تمت إضافة القطعة",
    "spareDialog.addedDesc": "تمت إضافة طلب القطعة إلى القائمة.",
    "spareDialog.noRequestsTitle": "لا توجد طلبات",
    "spareDialog.noRequestsDesc": "يرجى إضافة طلب قطع غيار واحد على الأقل.",
    "spareDialog.submittedTitle": "تم إرسال طلبات قطع الغيار",
    "spareDialog.submittedDesc": "تم إرسال {count} طلباً للموافقة لـ {name}.|تم إرسال {count} طلباً للموافقة لـ {name}."
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