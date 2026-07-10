# خطة إعادة هيكلة شاشة السوبر ادمن

## الشاشة 1: الوجهة الرئيسية (`/super-admin`)
استبدال البطاقات الحالية بـ 3 بطاقات فقط:
- **موديول الأغذية / المطاعم** → `/super-admin/sector/food`
- **موديول الطبي / العيادات** → `/super-admin/sector/medical`
- **الخطط** → `/admin/plans`

بدون "لوحة مدير النظام" و"رصدة الافتراضية" (نستغني عنهم – الوصول للشركات صار عبر القطاع).

## الشاشة 2: شركات القطاع (`/super-admin/sector/:type`)
- عنوان القطاع + زر رجوع.
- بطاقة **الشركة التجريبية** (Sandbox) بارزة وملوّنة بشارة "تجريبية".
- شبكة بطاقات لكل شركات هذا القطاع (اسم، شعار، عدد الفروع، الحالة).
- زر "+ إنشاء شركة جديدة" في هذا القطاع.
- الضغط على أي بطاقة → `/super-admin/company/:id`.

## الشاشة 3: لوحة السوبر ادمن للشركة (`/super-admin/company/:id`)
Layout جانبي خاص بالشركة يحتوي التبويبات:
1. **نظرة عامة** – معلومات الشركة، عدد الفروع/المستخدمين، الحالة، شارة القطاع، أزرار (تعديل، تعطيل/تفعيل، حذف).
2. **المستخدمين** – قائمة `company_users` لهذه الشركة + إمكانية إضافة/إزالة/تغيير الدور.
3. **الفروع** – قائمة فروع الشركة (قراءة + تفعيل/تعطيل).
4. **الاشتراك والخطة** – الخطة الحالية + تغييرها + تفاصيل الاشتراك.
5. **سجلات التدقيق** – `audit_logs` مفلترة على `company_id` هذه الشركة.

زر رجوع إلى قائمة شركات القطاع في الهيدر.

## قاعدة البيانات
- إضافة عمود `is_sandbox boolean default false` على `companies`.
- Migration seed: إنشاء شركتين تجريبيتين إن لم تكونا موجودتين:
  - `Rasdah Sandbox — F&B` (workspace_type=food, is_sandbox=true)
  - `Rasdah Sandbox — Clinics` (workspace_type=medical, is_sandbox=true)
- ربط السوبر ادمن `saeedb_itx@hotmail.com` كـ owner فيهما تلقائياً.

## الملفات
**جديد:**
- `src/pages/super-admin/SectorCompaniesPage.tsx` (شاشة 2)
- `src/pages/super-admin/CompanyAdminLayout.tsx` + subpages:
  - `CompanyOverviewTab.tsx`
  - `CompanyUsersTab.tsx`
  - `CompanyBranchesTab.tsx`
  - `CompanySubscriptionTab.tsx`
  - `CompanyAuditLogsTab.tsx`

**معدّل:**
- `src/pages/SuperAdminLanding.tsx` – البطاقات الثلاث الجديدة.
- `src/App.tsx` – إضافة المسارات الجديدة تحت `SuperAdminRoute`.
- `src/pages/admin/AdminLayout.tsx` – تحديث زر "الرجوع لاختيار الوجهة".

## ملاحظة على الصلاحيات
السوبر ادمن يحتفظ بكل صلاحياته الحالية (RLS موجودة عبر `is_super_admin`). الأدمن العادي داخل الشركة يبقى محصور بشركته عبر `is_company_admin`. لا حاجة لتغييرات RLS جوهرية.
