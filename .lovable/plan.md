

## المشكلة

المستخدم لاحظ أن workspace "Demo Clinics" يعرض نفس هيكل Rasdah الافتراضي (تقييمات/فروع عامة)، بدون التقسيم الهرمي الخاص بالعيادات:

```
العيادة (Company)
└── الفرع (Branch / موقع العيادة)
    ├── الاستقبال (Reception)
    ├── غرف الفحص (Exam Rooms)
    ├── غرف العمليات (Operation Rooms)
    ├── المختبر / الأشعة
    └── الصيدلية
```

حالياً الموجود فقط: `branches` + `patients` + `appointments` + `visits` بدون أي مفهوم "غرفة/قسم" داخل الفرع.

## الاستكشاف المطلوب قبل التنفيذ

أحتاج أتأكد من:
1. ما يوجد فعلياً تحت `/clinic/*` وما الموديولات المفعّلة لـ Demo Clinics
2. هل هناك جدول `rooms` أو `departments` موجود مسبقاً
3. شكل `ClinicDashboard` و `BranchDetail` الحالي

## الخطة المقترحة

### 1. قاعدة البيانات (Migration)

**جدول `clinic_departments`** (الأقسام داخل الفرع):
- `id`, `branch_id`, `company_id`
- `code` (reception/exam/operation/lab/radiology/pharmacy/other)
- `name`, `name_ar`, `is_active`

**جدول `clinic_rooms`** (الغرف داخل القسم):
- `id`, `department_id`, `branch_id`, `company_id`
- `room_number`, `name`, `name_ar`
- `room_type` (consultation/operation/recovery/imaging/triage)
- `capacity`, `status` (available/occupied/maintenance), `is_active`

RLS: نفس نمط `appointments` (`user_belongs_to_company` + `is_company_admin` للحذف).

**ربط الموعد بالغرفة**: إضافة `room_id uuid` (nullable) لجدول `appointments` لجدولة الموعد في غرفة محددة.

**Seed لـ Demo Clinics**: إنشاء فرع نموذجي + 4 أقسام (Reception/Exam/Operations/Lab) + 6 غرف موزعة عليهم.

### 2. واجهة المستخدم

**أ. صفحة جديدة `/clinic/branches`**: قائمة فروع العيادة (نفس بيانات `branches` لكن مصفّاة على الـ company الحالي + ظاهرة فقط للقطاع clinic).

**ب. صفحة جديدة `/clinic/branches/:id`**: تفاصيل فرع العيادة مع:
- Tabs: نظرة عامة | الأقسام والغرف | الأطباء | المواعيد اليوم
- Tab "الأقسام والغرف": عرض الأقسام كـ Accordion، وداخل كل قسم شبكة بطاقات للغرف مع حالتها (متاحة/مشغولة/صيانة) — مع CRUD كامل لـ admin.

**ج. تحديث Sidebar للقطاع clinic**: إضافة عنصر "فروع العيادة" + "الأقسام والغرف" تحت قسم Clinic عندما `sector_type='clinic'`.

**د. تحديث `ClinicDashboard`**: إضافة بطاقات "عدد الغرف المتاحة / المشغولة" + اختصار لإدارة الأقسام.

**هـ. تحديث نموذج الموعد** في `AppointmentsPage`: إضافة حقل اختيار "الغرفة" (مفلتر حسب الفرع المختار).

### 3. Hooks جديدة
- `useClinicDepartments(branchId)`
- `useClinicRooms(branchId | departmentId)`

### 4. الترجمة (AR/EN)
كل المسميات الجديدة: الاستقبال/Reception، غرف الفحص/Exam Rooms، غرف العمليات/Operation Rooms، المختبر/Lab، الأشعة/Radiology، الصيدلية/Pharmacy.

### تفاصيل تقنية
- استخدام `Accordion` و `Card` و `Badge` للحالة
- ألوان الحالة: متاحة (أخضر)، مشغولة (كهرماني)، صيانة (رمادي)
- `ModuleGuard` للتأكد أن الموديول `clinic_rooms` مفعّل (سنضيفه لجدول `modules` كـ non-core متاح فقط لـ sector=clinic)
- التحقق من isolation: Demo Clinics فقط ترى هذه الصفحات؛ Rasdah Default يفترض ترى رسالة "غير مفعّل"

### الملفات المتوقع تعديلها/إنشاؤها
- migration جديد: جداول + seed + موديول جديد
- `src/hooks/useClinicDepartments.ts` (جديد)
- `src/hooks/useClinicRooms.ts` (جديد)
- `src/pages/clinic/ClinicBranchesPage.tsx` (جديد)
- `src/pages/clinic/ClinicBranchDetailPage.tsx` (جديد)
- `src/pages/clinic/ClinicRoomsPage.tsx` (جديد، optional standalone)
- `src/components/AppSidebar.tsx` (تعديل)
- `src/App.tsx` (إضافة routes)
- `src/pages/clinic/ClinicDashboard.tsx` (تعديل بطاقات)
- `src/pages/clinic/AppointmentsPage.tsx` (إضافة حقل الغرفة)
- `src/contexts/LanguageContext.tsx` (مفاتيح ترجمة)

