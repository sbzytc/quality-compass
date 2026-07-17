
# خطة: نظام الشركة التجريبية (Sandbox Companies)

## 1) نموذج البيانات والعلاقة بين الشركتين

**التوصية:** إضافة أعمدة على `companies` بدل جدول ربط منفصل — أبسط ويستفيد من كل الـ RLS الحالي المبني حول `company_id`.

أعمدة جديدة على `public.companies`:
- `is_sandbox boolean NOT NULL DEFAULT false`
- `sandbox_of_company_id uuid NULL REFERENCES public.companies(id) ON DELETE CASCADE` — يشير من التجريبية إلى الفعلية. `NULL` للشركات الفعلية.
- `sandbox_created_at timestamptz`
- `sandbox_last_synced_at timestamptz` — آخر مرة صار فيها Promote/Reset (مرجع للـ Diff).
- قيد فريد: `UNIQUE (sandbox_of_company_id)` — كل شركة فعلية لها نسخة تجريبية واحدة فقط.

**ترقيم بصري:** الاسم يُشتق تلقائيًا: `"<name> (Sandbox)"` مع شارة واضحة في `WorkspaceSwitcher` و`PageHeader`.

**سبب رفض `parent_company_id` بدون علم اتجاه:** نحتاج نميّز صراحة "تجريبية تابعة" من "فرع تنظيمي" مستقبلي، فاسم العمود يفصح عن النية.

## 2) إنشاء النسخة التجريبية تلقائيًا

عند `INSERT` على `companies` (شركة فعلية جديدة) → تريجر `AFTER INSERT` يستدعي دالة `SECURITY DEFINER`:

`public.clone_company_as_sandbox(_source_company_id uuid) returns uuid`

الدالة تنسخ بترتيب الاعتماديات (أدنى → أعلى):
1. `companies` (صف جديد `is_sandbox=true`)
2. `regions`, `branches`, `clinic_departments`, `clinic_rooms`
3. `template_domains/frequencies/priorities/categories/criteria`, `evaluation_templates`
4. `customer_feedback_questions`, `company_off_days`, `feature_flags`, `evaluation_schedules`
5. `company_users` — نسخ عضويات الأدمن/الأونر فقط (بدون المستخدمين العاديين افتراضيًا)
6. **لا تُنسخ:** `evaluations`, `non_conformities`, `corrective_actions`, `operations_tasks`, `customer_feedbacks`, `audit_logs`, `notifications`, `system_logs`, `support_tickets`, `subscriptions` — تبدأ فارغة.

كل جدول يحتاج **جدول خرائط** مؤقت داخل الدالة: `map_old_id → new_id` لإعادة كتابة الـ FKs (`branch_id`, `template_id`, `category_id` ...).

**تسمية موحّدة:** كل صف منسوخ يحمل `origin_id uuid NULL` (عمود اختياري نضيفه على الجداول القابلة للـ Promote) يشير للـ ID في الشركة الأصل. هذا هو مفتاح الـ Diff لاحقًا.

## 3) الوصول والـ RLS

**المبدأ الحالي:** كل الجداول مقيّدة بـ `company_id`. لا حاجة لتغيير الـ policies نفسها.

**التعديل الوحيد:** إضافة عضوية `company_users` للمستخدم الأدمن على الشركة التجريبية عند إنشائها (تلقائيًا داخل الدالة). هكذا:
- `CurrentCompanyContext` يجيبها ضمن `loadCompanies` دون أي تعديل منطقي.
- `WorkspaceSwitcher` يعرضها في نفس القائمة، مع قسم فرعي "Sandboxes" ومجموعة بصرية تحت الشركة الأم.
- الـ RLS يعامل الشركة التجريبية كأي workspace — عزل كامل.

**إضافة صغيرة على السياق:** كشف `isSandbox` و`sandboxOfCompanyId` في `CurrentCompanyContext` لتمكين لافتة "أنت في وضع تجريبي" في `MainLayout`.

**المستخدمون التجريبيون الإضافيون:** أدمن الشركة التجريبية يقدر يضيف `company_users` جدد مربوطين فقط بـ `company_id` التجريبي. لا يحتاج تعديل أي edge function — نفس `create-user`/`invite-user` تعمل مع فحص إضافي: إذا `is_sandbox=true`، لا نرسل بريد إلكتروني حقيقي (اختياري) ونضع علامة `sandbox_user=true` على `profiles` لضمان عدم ظهورهم في الشركة الفعلية أبدًا.

## 4) استراتيجية الـ Diff/Promote

**التقييم الصريح:** Diff عالمي (Configuration + Operational data) عبر كل الجداول = **معقد جدًا ومكلف**. أنصح بتقسيم على مرحلتين:

### المرحلة 1 (MVP — موصى بها للبداية): إعدادات وقوالب فقط
جداول Promotable:
- `evaluation_templates` + `template_categories` + `template_criteria`
- `template_domains/frequencies/priorities`
- `customer_feedback_questions`
- `feature_flags`, `company_off_days`
- `branches` (إعدادات فقط، لا بيانات تشغيلية)
- `clinic_departments`, `clinic_rooms`

آلية Diff:
- كل صف قابل للترقية له `origin_id` (كما في القسم 2).
- Diff = مقارنة عمود بعمود بين صف التجريبي وصف الأصل عبر `origin_id`.
- ثلاث حالات لكل صف: **Added** (`origin_id IS NULL`)، **Modified** (فرق بالأعمدة)، **Deleted** (موجود بالأصل، غير موجود بالتجريبي).
- الحساب على السيرفر عبر RPC: `get_sandbox_diff(_sandbox_company_id uuid) returns jsonb` — تُرجع شجرة مجمّعة حسب الجدول.
- واجهة Diff: قائمة قابلة للتوسيع بمربعات اختيار لكل عنصر (Add / Update / Delete)، ثم زر "Promote Selected" يستدعي `promote_sandbox_changes(_sandbox_company_id uuid, _selections jsonb)`.

### المرحلة 2 (لاحقًا، إذا احتاجها المستخدم فعلًا): بيانات تشغيلية
مشاكل جوهرية يجب طرحها الآن على المستخدم:
- **التقييمات (`evaluations`) تعتمد على قوالب** — إذا انتقلت التقييمات دون قوالبها المقابلة، تنكسر المراجع.
- **تعارضات زمنية:** خلال فترة الاختبار، الشركة الفعلية تستقبل تقييمات جديدة بنفس التواريخ. دمج التقييمات = صعوبة في تحديد "أيهم الحقيقي".
- **`audit_logs`, `notifications`** يجب استبعادها نهائيًا — منطق تاريخي لا يُدمج.
- **الأداء:** Diff على `evaluation_criterion_scores` لآلاف الصفوف مكلف — يحتاج فهارس على `origin_id` وعرض مفلتر.
- الخيار الأنسب لاحقًا: بدل "Diff تشغيلي"، نقدم زر **"Import operational data as new"** — تُنسخ التقييمات التجريبية إلى الفعلية كسجلات جديدة مع علامة "imported from sandbox".

**توصية صريحة للمستخدم:** نبدأ بالمرحلة 1 فقط. البيانات التشغيلية في التجريبي غرضها التجربة والتحقق من صحة الإعدادات، لا الترحيل. نعيد التقييم بعد استخدام حقيقي لمدة شهر.

### Reset التجريبي
زر إضافي: "إعادة تعيين التجريبي من الفعلي" — يحذف الشركة التجريبية ويعيد إنشاءها. مفيد بعد Promote ناجح.

## 5) المخاطر والتعقيدات

1. **انفجار الحجم:** كل شركة تضاعف عدد صفوف الإعدادات. لشركة بـ 500 معيار تقييم، النسخة التجريبية = 500 صف إضافي. مقبول، لكن يحتاج مراقبة.
2. **تسرّب البيانات عبر الحدود:** إذا نُسي `company_id` في أي جدول جديد مستقبلًا، قد تُرى بيانات تجريبية في الفعلية. علاج: مراجعة RLS إلزامية لكل جدول جديد + اختبار E2E يتحقق من العزل.
3. **ترحيل الـ Schema:** أي `ALTER TABLE` لاحقًا يجب أن يطبَّق على الشركتين — الشركات التجريبية حقيقية في نفس الجداول، فلا مشكلة تلقائيًا، لكن أي seed data جديدة لشركات جديدة يجب أن تُنسخ للتجريبية أيضًا.
4. **الفوترة والحصص:** هل الشركة التجريبية تُحتسب في `subscriptions` وحدود الفروع/المستخدمين؟ **توصية:** لا تُحتسب. يحتاج فلترة صريحة في كل استعلام حصص عبر `WHERE is_sandbox = false`.
5. **الـ Edge Functions:** `ai-assistant`, `create-user`, `invite-user`، إلخ — يجب أن تحترم `is_sandbox`: مثلًا `ai-assistant` يعمل عاديًا، لكن `invite-user` قد يتخطى إرسال البريد للشركة التجريبية.
6. **الوقت المتوقع للتنفيذ:** 
   - المرحلة 1 (Schema + Clone + Switcher + Diff/Promote للإعدادات): ~4–6 دفعات عمل.
   - إضافة البيانات التشغيلية (المرحلة 2): مضاعفة الجهد على الأقل.
7. **البحث عن `origin_id`:** إضافة العمود على ~10 جداول موجودة تعني migration واسع + فهارس.
8. **الحذف المتسلسل:** `ON DELETE CASCADE` من الشركة الفعلية إلى التجريبية — إذا حُذفت الفعلية بالخطأ، ضاعت التجريبية. حل: `ON DELETE RESTRICT` + زر حذف صريح للتجريبية أولًا.

## 6) خطة التنفيذ المقترحة (بعد الموافقة)

1. Migration: أعمدة `is_sandbox`, `sandbox_of_company_id`, `origin_id` على الجداول القابلة للترقية.
2. دالة `clone_company_as_sandbox` + تريجر إنشاء تلقائي + Backfill للشركات الحالية.
3. تحديث `CurrentCompanyContext` + `WorkspaceSwitcher` (تجميع + شارة "Sandbox").
4. لافتة "Sandbox Mode" في `MainLayout` + استبعاد التجريبيات من الحصص.
5. صفحة `SandboxDiffPage` + RPC `get_sandbox_diff` + `promote_sandbox_changes`.
6. زر Reset + توثيق مختصر للمستخدم.

## ملاحظة عن حالة التنفيذ

الخطوات 1–4 من قسم "خطة التنفيذ" منجزة فعلًا في الجلسة السابقة (schema + clone + auto-trigger + backfill + Workspace Switcher + Sandbox banner). المتبقي: **الخطوة 5 (صفحة Diff/Promote + RPCs)** ثم **الخطوة 6 (زر Reset)**. الموافقة على هذه الخطة تعني الاستمرار في الخطوة 5.

## أسئلة أطلبها قبل البدء

- هل الشركة التجريبية مرئية لكل أدمن الشركة الفعلية، أم فقط لمن أنشأها؟
- في حالة Promote تعديل قالب تقييم مستخدم فعليًا في تقييمات سابقة — نُنشئ نسخة جديدة (versioning) أم نحدّث في المكان؟
- هل تريد فترة صلاحية للتجريبية (مثلًا 30 يومًا ثم Reset تلقائي)؟
