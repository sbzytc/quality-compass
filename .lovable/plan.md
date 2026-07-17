# تصميم ميزة "الشركة التجريبية" (Sandbox)

> plan mode فقط — لا يُنفّذ أي تغيير على الكود.

## 1) تمثيل العلاقة بين الشركة الفعلية والتجريبية في قاعدة البيانات

### التوصية: نموذج الأعمدة على `companies` + عمود `origin_id` على جداول الإعدادات

لا نضيف جدول ربط منفصل؛ العلاقة 1↔1 صارمة بين شركة فعلية وشركة تجريبية واحدة.

#### جدول `companies`

````text
companies
├── id
├── name / name_ar / slug / sector_type / workspace_type / primary_module
├── status / deleted_at
├── is_sandbox            boolean  -- true = شركة تجريبية
├── sandbox_of_company_id uuid     -- تشير من التجريبية إلى الفعلية؛ NULL في الفعلية
├── sandbox_created_at    timestamptz
└── sandbox_last_synced_at timestamptz
````

#### ضوابط النزاهة

- **Trigger** `enforce_sandbox_company_shape`:
  - `is_sandbox = true` يجب أن يكون `sandbox_of_company_id` غير NULL.
  - `is_sandbox = false` يجب أن يكون `sandbox_of_company_id` NULL.
- **Unique partial index** لمنع تكرار Sandbox لنفس الشركة:
  `UNIQUE (sandbox_of_company_id) WHERE is_sandbox = true`.
- **Trigger** `trigger_auto_create_sandbox` على `INSERT` في `companies` ينشئ Sandbox تلقائيًا للشركة الفعلية.

#### تمثيل السجلات المقابلة داخل الشركتين

لكل جدول إعدادات/هيكل نريد Diff/Promote له، نضيف عمود `origin_id uuid`:

- `origin_id` يشير إلى `id` السجل الأصل في الشركة الفعلية.
- `origin_id IS NULL` يعني أن السجل جديد أنشئ في Sandbox فقط.
- لا نضيف `origin_id` لجداول Facts التشغيلية (تقييمات، درجات، بلاغات) لأنها لا تُرقّى.

#### لماذا لا نستخدم `parent_company_id` في كل جدول؟

لأن كل الاستعلامات الحالية مُفلترة بـ `company_id`، وإضافة `parent_company_id` ستكرّر المنطق وتكسر عزل الشركات. عمود `origin_id` يكفي ولا يُغيّر شكل الاستعلامات القائمة.

---

## 2) تعامل RLS مع تبديل السياق

### المبدأ: لا "context switching" في قاعدة البيانات

الشركة التجريبية هي شركة مستقلة بمعرّف `company_id` مختلف. الـ RLS القائم على `company_id` يعمل كما هو دون تعديل.

### آلية الوصول

1. **إضافة الأدمن كعضو في Sandbox:** أثناء الاستنساخ، يُضاف صاحب/أدمن الشركة الفعلية إلى `company_users` للشركة التجريبية بدور `owner` أو `admin`.
2. **الفرونت يمرّر `company_id` الحالي:** عند تبديل الشركة عبر `WorkspaceSwitcher`، يُخزّن الاختيار في `localStorage` ويُرسل مع كل استعلام.
3. **RLS القائمة:** سياسات مثل `has_company_access(auth.uid(), company_id)` تسمح للأدمن بالوصول إلى الشركتين لأنه عضو في كلتيهما.

### نقاط حرجة يجب مراعاتها

- **عدم الاعتماد على `profiles.default_company_id`:** أي RLS يستخدم `default_company_id` كمصدر وحيد للسياق يجب تعديله ليقبل `company_id` المرسل مع الاستعلام.
- **التحقق من الصلاحيات على الشركة الفعلية:** دوال Promote/Reset يجب أن تتحقق أن المستخدم أدمن/مالك على **الشركة الفعلية** قبل السماح بنقل التعديلات أو إعادة التعيين.
- **عزل البيانات عبر الشركتين:** لا يوجد JOIN بين `sandbox_company_id` و `real_company_id` في استعلامات المستخدم النهائي؛ فقط دوال SECURITY DEFINER (`get_sandbox_diff`, `promote_sandbox_changes`) تفعل ذلك بعد التحقق من الملكية.

### تحسين مقترح

إضافة helper واحد:

```sql
private.is_sandbox_admin_of(_user_id uuid, _sandbox_company_id uuid) RETURNS boolean
```

يتحقق أن المستخدم أدمن/مالك للشركة الأصل، ويُستخدم في كل مسارات Promote/Reset بدل تكرار المنطق.

---

## 3) تقييم إمكانية حساب Diff شامل لكل الجداول

### الإجابة المختصرة: غير عملي وغير مرغوب لكل الجداول

نوصي بتقسيم الجداول إلى ثلاث فئات:

#### الفئة أ — Diff + Promote كامل

جداول إعدادات وقوالب: صغيرة، تتغير ببطء، وذات دلالة تشغيلية للـ Promote.

- المنفّذ حاليًا: `regions`, `branches`, `feature_flags`, `company_off_days`.
- Diff فقط حاليًا (Promote يحتاج معالجة شجرية): `evaluation_templates`, `template_categories`, `template_criteria`.
- مرشحات للإضافة: `template_domains`, `template_frequencies`, `template_priorities`, `clinic_departments`, `clinic_rooms`.

#### الفئة ب — Diff للعرض فقط (بدون Promote)

جداول تشغيلية متوسطة يمكن مقارنتها إحصائيًا لكن ترقيتها للفعلي تكسر المعنى:

- `evaluation_schedules` (مرتبطة بفروع مختلفة الـ ID).
- `operations_tasks` (مرتبطة بمستخدمين وفروع).

يمكن عرض عدد السجلات الجديدة/المعدلة دون زر Promote.

#### الفئة ج — لا Diff ولا Promote

جداول Facts عالية التغيّر (نتائج تنفيذ فعلي):

- `evaluations`, `evaluation_criterion_scores`, `evaluation_category_scores`.
- `non_conformities`, `non_conformity_history`, `corrective_actions`.
- `customer_feedbacks`, `customer_feedback_scores`, `customer_complaints`.
- `notifications`, `audit_logs`, `system_logs`, `appointments`, `visits`, `patients`.

**السبب:**
- لا معنى لـ "ترقية تقييم" من التجريبي للفعلي؛ يخلق تاريخًا مزيّفًا.
- الحجم يجعل Diff مكلفًا.
- الـ FKs (branch, user, template) مختلفة بين البيئتين → كل صف سيظهر مختلفًا.

### استراتيجية الـ Diff

- استخدام `sandbox_diff_row_json` لحذف `id`, `origin_id`, `company_id`, `created_at`, `updated_at` قبل المقارنة.
- **مشكلة معروفة:** الأعمدة التي تحمل FK لجداول أخرى (`region_id`, `parent_id`) ستظهر كاختلاف دائم لأن الـ IDs مختلفة. **الحل:** إضافة خطوة normalization تستبدل الـ FK بـ `origin_id` الخاص بالسجل المُشار إليه قبل المقارنة.

### التوصية

ابدأ بنطاق أضيق (الإعدادات والقوالب)، ثم وسّع تدريجيًا. لا تُضمّن Facts في Promote.

---

## 4) أهم المخاطر التقنية قبل التنفيذ

### مخاطر عالية

1. **انفجار عدد الشركات التجريبية:** كل شركة فعلية تولّد نسخة → مضاعفة الصفوف في 13+ جدول. يجب unique index جزئي على `sandbox_of_company_id WHERE is_sandbox`.
2. **تسرّب صلاحيات عبر الاستنساخ:** إذا استُنسخ `company_users` بحذافيره قد يحصل مستخدمون سابقون على وصول للـ Sandbox. **الحل:** استنساخ صلاحيات الأدمن/المالك فقط.
3. **فقدان عمل المستخدم عند Reset:** إعادة التعيين تحذف كل شيء. مطلوب تأكيد مزدوج + Snapshot تلقائي قبل Reset.
4. **Promote يكتب فوق تغييرات الفعلية:** إذا عدّل مستخدم الفعلي بينما الأدمن يعدّل Sandbox، الـ Promote يحذف التغيير. مطلوب فحص `updated_at` (Optimistic locking).

### مخاطر متوسطة

5. **FKs الشجرية (Templates):** ترقية `template_criteria` تتطلب `template_categories` أولًا، والذي يتطلب `evaluation_templates` — يجب أن يحدث في transaction واحد بترتيب طوبولوجي.
6. **الاستنساخ الأولي بطيء للشركات الكبيرة:** trigger على `INSERT` قد يستغرق ثوانٍ. اقتراح: تحويل الاستنساخ لعملية async (queue) للشركات الكبيرة.
7. **UI Confusion:** المستخدم قد يظن أنه في الفعلية. يُفضّل إضافة لون واضح للـ header + prefix في عنوان التبويب.
8. **RLS على Storage:** ملفات Sandbox تُرفع لنفس الـ buckets بمسارات تحتوي `company_id` مختلف — يجب التحقق من سياسات storage وأن Reset يحذف ملفات Sandbox أيضًا.

### مخاطر منخفضة

9. **حجم `types.ts` والـ frontend:** كل توسع لـ Diff يضيف كود؛ يُنصح بمكوّن Diff عام يقبل تعريف الجدول ديناميكيًا.
10. **الاختبار:** لا توجد بيئة Staging منفصلة؛ الميزة نفسها ستُستخدم كـ Staging، ما يجعل اختبارها معقدًا.

---

## خارطة التنفيذ المقترحة

| المرحلة | النطاق |
|---|---|
| 1 | استنساخ الهيكلة + Switcher + تنبيه Sandbox |
| 2 | Diff/Promote للإعدادات الأساسية + Reset |
| 3 | Promote للقوالب (شجري + Transaction) |
| 4 | Normalization للـ FKs في Diff |
| 5 | Optimistic locking + Snapshot قبل Reset |
| 6 | Diff للعرض فقط على الجداول التشغيلية |
| 7 | تحويل الاستنساخ لعملية async عند الحاجة |

**قرار تصميمي مقصود:** لا Promote للـ Facts (تقييمات/بلاغات/مهام) — فقط للإعدادات والقوالب.