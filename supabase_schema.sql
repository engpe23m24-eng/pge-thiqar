-- ====================================================================
-- جامعة ذي قار - كلية الهندسة - قسم هندسة النفط والغاز
-- University of Thi-Qar - College of Engineering
-- Department of Petroleum & Gas Engineering
-- Supabase PostgreSQL Schema, RBAC & Row Level Security (RLS)
-- ====================================================================

-- 1. تفعيل ملحق UUID لتوليد المعرفات الفريدة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- الجداول الأكاديمية وجداول الصلاحيات (Tables Definition)
-- ====================================================================

-- 1. جدول المراحل الدراسية (Academic Years)
CREATE TABLE IF NOT EXISTS public.academic_years (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. جدول الفصول الدراسية (Semesters)
CREATE TABLE IF NOT EXISTS public.semesters (
    id TEXT PRIMARY KEY,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. جدول المواد الدراسية (Subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    semester_id TEXT NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    name_ar TEXT,
    code TEXT,
    description TEXT,
    icon TEXT DEFAULT 'book-open',
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. جدول المواد والمصادر التعليمية (Materials)
CREATE TABLE IF NOT EXISTS public.materials (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('lectures', 'booklets', 'assignments', 'exams', 'resources')),
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_name TEXT,
    file_size TEXT,
    file_type TEXT DEFAULT 'application/pdf',
    youtube_url TEXT,
    lecture_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. جدول المسؤولين ومدراء النظام (Administrators RBAC)
CREATE TABLE IF NOT EXISTS public.administrators (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'editor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ====================================================================
-- الفهارس لتحسين سرعة الاستعلام والبحث (Performance Indexes)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_semesters_year ON public.semesters(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON public.subjects(semester_id);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON public.materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_lecture_num ON public.materials(lecture_number);
CREATE INDEX IF NOT EXISTS idx_administrators_user_id ON public.administrators(user_id);

-- ====================================================================
-- دوال الأمان والتحقق من الصلاحيات (Security Functions)
-- ====================================================================

-- دالة للتحقق من أن المستخدم الحالي مسجل كمسؤول في جدول administrators
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.administrators
    WHERE user_id = auth.uid()
  );
$$;

-- دالة للتحقق من رتبة المسؤول المتميز (Super Admin)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.administrators
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

-- ====================================================================
-- تفعيل سياسات الأمان والحماية على مستوى الصفوف (Row Level Security - RLS)
-- ====================================================================

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrators ENABLE ROW LEVEL SECURITY;

-- 1. سياسات القراءة العامة (Public Read - للطلبة وعامة الزوار بدون تسجيل دخول)
DROP POLICY IF EXISTS "Public users can view academic years" ON public.academic_years;
CREATE POLICY "Public users can view academic years" ON public.academic_years
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public users can view semesters" ON public.semesters;
CREATE POLICY "Public users can view semesters" ON public.semesters
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public users can view subjects" ON public.subjects;
CREATE POLICY "Public users can view subjects" ON public.subjects
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public users can view educational materials" ON public.materials;
CREATE POLICY "Public users can view educational materials" ON public.materials
    FOR SELECT TO anon, authenticated USING (true);

-- 2. سياسات التعديل والإدارة للمراحل والفصول والمواد (Admins Only)
DROP POLICY IF EXISTS "Admins can manage academic years" ON public.academic_years;
CREATE POLICY "Admins can manage academic years" ON public.academic_years
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage semesters" ON public.semesters;
CREATE POLICY "Admins can manage semesters" ON public.semesters
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert/update/delete subjects" ON public.subjects;
CREATE POLICY "Admins can insert/update/delete subjects" ON public.subjects
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert/update/delete materials" ON public.materials;
CREATE POLICY "Admins can insert/update/delete materials" ON public.materials
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 3. حماية جدول مدراء النظام (Administrators Protection)
-- المسؤول المسجل يمكنه قراءة قائمة المسؤولين فقط
DROP POLICY IF EXISTS "Admins can view administrator list" ON public.administrators;
CREATE POLICY "Admins can view administrator list" ON public.administrators
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- فقط Super Admin أو مالك قاعدة البيانات يمكنه إضافة أو تعديل أو حذف مدراء النظام
DROP POLICY IF EXISTS "Super admins can manage administrators" ON public.administrators;
CREATE POLICY "Super admins can manage administrators" ON public.administrators
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ====================================================================
-- الصلاحيات على مستوى المخطط (Schema Grants & Least Privilege)
-- ====================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- منح حق القراءة فقط (SELECT) لـ anon على جميع الجداول
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- منح حق القراءة والكتابة لـ authenticated وتتحكم بها سياسات RLS بدقة
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- منع المستخدمين غير المسجلين صراحةً من أي عملية تعديل أو إضافة أو حذف
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;

-- ====================================================================
-- إعداد حاوية تخزين المستندات وسياسات الأمان (Supabase Storage Bucket & RLS)
-- ====================================================================

-- إنشاء حاوية تخزين المستندات الأكاديمية بحجم أقصى 50 ميغابايت
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'academic-materials', 
    'academic-materials', 
    true, 
    52428800, -- 50 MB
    ARRAY[
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'application/vnd.ms-powerpoint', 
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'image/png', 
        'image/jpeg'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800;

-- سياسات أمان التخزين السحابي (Storage RLS Policies)
DROP POLICY IF EXISTS "Public users can view and download academic materials" ON storage.objects;
CREATE POLICY "Public users can view and download academic materials"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'academic-materials');

DROP POLICY IF EXISTS "Admins can upload files to academic materials" ON storage.objects;
CREATE POLICY "Admins can upload files to academic materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'academic-materials' AND
    public.is_admin()
);

DROP POLICY IF EXISTS "Admins can update files in academic materials" ON storage.objects;
CREATE POLICY "Admins can update files in academic materials"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'academic-materials' AND
    public.is_admin()
)
WITH CHECK (
    bucket_id = 'academic-materials' AND
    public.is_admin()
);

DROP POLICY IF EXISTS "Admins can delete files in academic materials" ON storage.objects;
CREATE POLICY "Admins can delete files in academic materials"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'academic-materials' AND
    public.is_admin()
);

-- ====================================================================
-- طريقة إضافة أول مسؤول نظام (First Admin Provisioning Instructions)
-- ====================================================================
-- 1. في لوحة تحكم Supabase، اذهب إلى Authentication -> Users -> Add user
-- 2. أدخل البريد الإلكتروني (مثال: admin@pge-thiqar.edu.iq) وكلمة مرور قوية.
-- 3. انسخ الـ User UID الخاص به.
-- 4. في SQL Editor في Supabase، قم بتشغيل الأمر التالي لترقيته إلى مدير نظام:
--
-- INSERT INTO public.administrators (user_id, email, full_name, role)
-- VALUES ('<ضع_هنا_User_UID>', 'admin@pge-thiqar.edu.iq', 'رئاسة قسم هندسة النفط والغاز', 'super_admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';

-- ====================================================================
-- البيانات الأولية للمقررات الأكاديمية الـ 52 (Seed Data)
-- ====================================================================

-- 1. المراحل الدراسية الأربعة
INSERT INTO public.academic_years (id, name_ar, name_en, description, display_order)
VALUES 
    ('year-1', 'المرحلة الأولى', 'First Year', 'السنة التأسيسية لطلبة هندسة النفط والغاز - العلوم الأساسية والهندسية', 1),
    ('year-2', 'المرحلة الثانية', 'Second Year', 'المرحلة التخصصية المتوسطة - مبادئ هندسة النفط والموائع والمكامن', 2),
    ('year-3', 'المرحلة الثالثة', 'Third Year', 'المرحلة المتقدمة - الحفر والإنتاج ومحاكاة المكامن', 3),
    ('year-4', 'المرحلة الرابعة', 'Fourth Year', 'سنة التخرج ومشاريع التخرج ومعالجة الغاز وهندسة المنشآت السطحية', 4)
ON CONFLICT (id) DO NOTHING;

-- 2. الفصول الدراسية الثمانية
INSERT INTO public.semesters (id, academic_year_id, name_ar, name_en, display_order)
VALUES 
    ('sem-1-1', 'year-1', 'الكورس الأول', 'First Semester', 1),
    ('sem-1-2', 'year-1', 'الكورس الثاني', 'Second Semester', 2),
    ('sem-2-1', 'year-2', 'الكورس الأول', 'First Semester', 1),
    ('sem-2-2', 'year-2', 'الكورس الثاني', 'Second Semester', 2),
    ('sem-3-1', 'year-3', 'الكورس الأول', 'First Semester', 1),
    ('sem-3-2', 'year-3', 'الكورس الثاني', 'Second Semester', 2),
    ('sem-4-1', 'year-4', 'الكورس الأول', 'First Semester', 1),
    ('sem-4-2', 'year-4', 'الكورس الثاني', 'Second Semester', 2)
ON CONFLICT (id) DO NOTHING;

-- 3. مواد المرحلة الأولى - الكورس الأول (7 مواد)
INSERT INTO public.subjects (id, semester_id, name, name_en, name_ar, code, description, icon, display_order)
VALUES
    ('sub-1-1-1', 'sem-1-1', 'Engineering Drawing (رسم هندسي)', 'Engineering Drawing', 'الرسم الهندسي', 'PGE111', 'أساسيات الرسم الهندسي اليدوي، الإسقاط المتعامد، القطاعات، ورسم المجسمات والمخططات الهندسية.', 'compass', 1),
    ('sub-1-1-2', 'sem-1-1', 'Mechanical Engineering', 'Mechanical Engineering', 'الهندسة الميكانيكية', 'PGE112', 'مبادئ الميكانيك الهندسي (Statics)، توازن القوى، العزوم، وتطبيقاتها في الأنظمة الهندسية.', 'cog', 2),
    ('sub-1-1-3', 'sem-1-1', 'Chemistry', 'Chemistry', 'الكيمياء العامة', 'PGE113', 'مفاهيم الكيمياء العامة واللاعضوية، الروابط الكيميائية، المحاليل، وتطبيقات الكيمياء في الصناعة النفطية.', 'flask-conical', 3),
    ('sub-1-1-4', 'sem-1-1', 'Physics', 'Physics', 'الفيزياء الهندسية', 'PGE114', 'الموجات، الميكانيكا الكلاسيكية، الحرارة، والخواص الفيزيائية للمادة المستخدمة في التطبيقات النفطية.', 'atom', 4),
    ('sub-1-1-5', 'sem-1-1', 'Geology', 'Geology', 'الجيولوجيا العامة', 'PGE115', 'مقدمة في الجيولوجيا العامة، تكوين القشرة الأرضية، الصخور الرسوبية، والمعادن والطبقات الجيولوجية.', 'mountain', 5),
    ('sub-1-1-6', 'sem-1-1', 'Computer Programming', 'Computer Programming', 'البرمجة الحاسوبية', 'PGE116', 'أساسيات البرمجة، الخوارزميات، هياكل التحكم، وحل المسائل الهندسية برمجياً.', 'terminal', 6),
    ('sub-1-1-7', 'sem-1-1', 'Mathematics', 'Mathematics', 'الرياضيات 1', 'PGE117', 'التفاضل والتكامل، الدوال المثلثية والزائدية، والمتتاليات والمصفوفات الهندسية.', 'binary', 7)
ON CONFLICT (id) DO NOTHING;

-- 4. مواد المرحلة الأولى - الكورس الثاني (6 مواد)
INSERT INTO public.subjects (id, semester_id, name, name_en, name_ar, code, description, icon, display_order)
VALUES
    ('sub-1-2-1', 'sem-1-2', 'Electric', 'Electric', 'الهندسة الكهربائية', 'PGE121', 'مبادئ الدوائر الكهربائية (DC & AC)، قوانين كيرشوف، القدرة الكهربائية والمحركات في المنشآت النفطية.', 'zap', 1),
    ('sub-1-2-2', 'sem-1-2', 'Dynamic', 'Dynamic', 'الديناميكا الهندسية', 'PGE122', 'حركة الجسيمات والأجسام الجاسئة، الحركة الخطية والمنحنية، الشغل والطاقة وقوانين نيوتن الحركية.', 'activity', 2),
    ('sub-1-2-3', 'sem-1-2', 'AutoCAD', 'AutoCAD', 'الرسم الهندسي بالحاسوب (AutoCAD)', 'PGE123', 'تطبيقات الرسم ثنائي وثلاثي الأبعاد باستخدام برنامج أوتوكاد لتصميم المنشآت والمخططات الهندسية.', 'monitor', 3),
    ('sub-1-2-4', 'sem-1-2', 'Mathematics', 'Mathematics 2', 'الرياضيات 2', 'PGE124', 'طرق التكامل المتقدمة، الإحداثيات القطبية، المتجهات، والتطبيقات الهندسية في المساحات والحجوم.', 'calculator', 4),
    ('sub-1-2-5', 'sem-1-2', 'Computer Programming 2', 'Computer Programming 2', 'البرمجة الحاسوبية 2', 'PGE125', 'البرمجة المتقدمة والموجهة للكائنات (OOP)، الدوال الرياضية، وتطوير برامج تحليل البيانات الهندسية.', 'code', 5),
    ('sub-1-2-6', 'sem-1-2', 'Geology 2', 'Geology 2', 'الجيولوجيا 2', 'PGE126', 'الجيولوجيا التاريخية، التراكيب الجيولوجية، ودراسة البيئات الترسيبية المكونة للنفط والغاز.', 'pickaxe', 6)
ON CONFLICT (id) DO NOTHING;

-- 5. مواد المرحلة الثانية - الكورس الأول (8 مواد)
INSERT INTO public.subjects (id, semester_id, name, name_en, name_ar, code, description, icon, display_order)
VALUES
    ('sub-2-1-1', 'sem-2-1', 'Mathematics 3', 'Mathematics 3', 'الرياضيات 3', 'PGE211', 'المعادلات التفاضلية الاعتيادية (ODEs)، تحويلات لابلاس، والمتسلسلات اللانهائية وتطبيقاتها الهندسية.', 'sigma', 1),
    ('sub-2-1-2', 'sem-2-1', 'Thermodynamic', 'Thermodynamic', 'الديناميكا الحرارية', 'PGE212', 'القانون الأول والثاني للثرموداينمك، دورات الطاقة والحرارة، توازن الأطوار وسلوك الغازات الحقيقية والمثالية.', 'flame', 2),
    ('sub-2-1-3', 'sem-2-1', 'Fluid Mechanics', 'Fluid Mechanics', 'ميكانيك الموائع', 'PGE213', 'سكون الموائع، حركة الموائع اللزجة، معادلة برنولي، وفقدان الضغط في خطوط الأنابيب النفطية.', 'droplet', 3),
    ('sub-2-1-4', 'sem-2-1', 'Reservoir Petrophysics', 'Reservoir Petrophysics', 'بتروفيزياء المكامن', 'PGE214', 'المسامية، النفاذية، التشبع المائي، الضغط الشعري، والبللية وحساب الحجم الأولي للنفط في المكمن.', 'layers', 4),
    ('sub-2-1-5', 'sem-2-1', 'Stratigraphic & Structure Geology', 'Stratigraphic & Structure Geology', 'الجيولوجيا الطباقية والتركيبية', 'PGE215', 'دراسة الفوالق والطيّات، المصائد النفطية التركيبية والطباقية، وتأريخ وتتابع الطبقات الصخرية.', 'land-plot', 5),
    ('sub-2-1-6', 'sem-2-1', 'Human Rights', 'Human Rights', 'حقوق الإنسان', 'UHR101', 'مبادئ ومفاهيم حقوق الإنسان، المواثيق الدولية، والحريات العامة في إطار الدستور والقانون.', 'scale', 6),
    ('sub-2-1-7', 'sem-2-1', 'Pet. Properties', 'Pet. Properties', 'خواص النفط والغاز (PVT)', 'PGE217', 'تحليل خواص موائع المكامن النفطية (PVT): الكثافة، اللزوجة، معامل حجم التكوين، ومخططات الأطوار الهيدروكربونية.', 'beaker', 7),
    ('sub-2-1-8', 'sem-2-1', 'Computer Programming 3', 'Computer Programming 3', 'البرمجة الحاسوبية 3', 'PGE218', 'البرمجة والتحليل العددي باستخدام بايثون أو C++ لمعالجة البيانات البتروفيزيائية والمكمنية.', 'file-code', 8)
ON CONFLICT (id) DO NOTHING;

-- 6. مواد المرحلة الثانية - الكورس الثاني (8 مواد)
INSERT INTO public.subjects (id, semester_id, name, name_en, name_ar, code, description, icon, display_order)
VALUES
    ('sub-2-2-1', 'sem-2-2', 'Strength of Materials', 'Strength of Materials', 'مقاومة المواد', 'PGE221', 'الإجهاد والانفعال، إجهادات القص والانحناء، وتصميم الأنابيب وأوعية الضغط في الصناعة النفطية.', 'shield', 1),
    ('sub-2-2-2', 'sem-2-2', 'Mathematics 4', 'Mathematics 4', 'الرياضيات 4', 'PGE222', 'المعادلات التفاضلية الجزئية (PDEs)، متسلسلات فورييه، والتحليل المركب وتطبيقاتها في جريان المكامن.', 'function-square', 2),
    ('sub-2-2-3', 'sem-2-2', 'Fundamentals of Petroleum Engineering', 'Fundamentals of Petroleum Engineering', 'أساسيات هندسة النفط', 'PGE223', 'نظرة شاملة لصناعة النفط والغاز من الاستكشاف، الحفر، إكمال الآبار، الإنتاج، وحتى التكرير والتصدير.', 'wrench', 3),
    ('sub-2-2-4', 'sem-2-2', 'Petroleum Geology', 'Petroleum Geology', 'جيولوجيا النفط', 'PGE224', 'توليد وهجرة وتجمع النفط، صخور المصدر، صخور المكمن، صخور الغطاء، وتقييم الأنظمة البترولية.', 'globe', 4),
    ('sub-2-2-5', 'sem-2-2', 'MATLAB', 'MATLAB', 'تطبيقات ماتلاب الهندسية', 'PGE225', 'البرمجة باستخدام MATLAB، معالجة المصفوفات، الرسم البياني، وحل معادلات هندسة النفط عددياً.', 'cpu', 5),
    ('sub-2-2-6', 'sem-2-2', 'Petroleum and Gas Pipeline', 'Petroleum and Gas Pipeline', 'أنابيب النفط والغاز', 'PGE226', 'هيدروليكا خطوط الأنابيب، التصميم الميكانيكي، الحماية الكاثودية، ومحطات الضخ والضغط.', 'route', 6),
    ('sub-2-2-7', 'sem-2-2', 'Democracy', 'Democracy', 'الديمقراطية والحريات', 'UDM102', 'تاريخ الفكر الديمقراطي، التعددية السياسية، والمواطنة ودور المجتمع المدني.', 'landmark', 7),
    ('sub-2-2-8', 'sem-2-2', 'الاحتمالية والإحصاء الهندسي', 'Probability & Engineering Statistics', 'الاحتمالية والإحصاء الهندسي', 'PGE228', 'نظرية الاحتمالات، التوزيعات الإحصائية، الانحدار الخطي، وتحليل المخاطر واللايقين في المكامن النفطية.', 'bar-chart-3', 8)
ON CONFLICT (id) DO NOTHING;

-- 7. مواد المرحلة الثالثة - الكورس الأول (7 مواد)
INSERT INTO public.subjects (id, semester_id, name, name_en, name_ar, code, description, icon, display_order)
VALUES
    ('sub-3-1-1', 'sem-3-1', 'Drilling Engineering', 'Drilling Engineering', 'هندسة الحفر', 'PGE311', 'مبادئ ومعدات عمليات حفر آبار النفط والغاز، ميكانيكا الحفر، سوائل الحفر وهيدروليكا قاع البئر.', 'cog', 1),
    ('sub-3-1-2', 'sem-3-1', 'Pet. Eng. Economics 1', 'Pet. Eng. Economics 1', 'اقتصاديات هندسة النفط 1', 'PGE312', 'التحليل الاقتصادي للمشاريع النفطية، القيمة الزمنية للنقود، التدفقات النقدية، وتقييم الجدوى الاقتصادية.', 'trending-up', 2),
    ('sub-3-1-3', 'sem-3-1', 'Pet. Production Eng. 1', 'Pet. Production Eng. 1', 'هندسة الإنتاج النفطي 1', 'PGE313', 'جريان الموائع من المكمن إلى رأس البئر، أداء الجريان الداخل (IPR)، والتحليل العقدي لمنظومات الإنتاج.', 'factory', 3),
    ('sub-3-1-4', 'sem-3-1', 'Well Logging', 'Well Logging', 'الجس البئري', 'PGE314', 'قياسات وتفسير مجسات الآبار السلكية والكهربائية والإشعاعية والصوتية لتحديد خواص الصخور والموائع.', 'activity', 4),
    ('sub-3-1-5', 'sem-3-1', 'Mathematics', 'Mathematics', 'الرياضيات المتقدمة', 'PGE315', 'التحليل الرياضي المتقدم، الحلول العددية للمعادلات التفاضلية، وطرق التقريب الرياضي للهندسة النفطية.', 'binary', 5),
    ('sub-3-1-6', 'sem-3-1', 'Geophysics', 'Geophysics', 'الجيوفيزياء', 'PGE316', 'المسوحات الزلزالية والجاذبية والمغناطيسية لاستكشاف التراكيب الجيولوجية الحاوية على الهيدروكربونات.', 'waves', 6),
    ('sub-3-1-7', 'sem-3-1', 'Reservoir Fluid', 'Reservoir Fluid', 'موائع المكامن النفطية', 'PGE317', 'سلوك ومخططات أطوار الهيدروكربونات، الخواص الترموديناميكية لغاز ومائع المكمن، وتحليلات PVT المخبرية.', 'droplet', 7)
ON CONFLICT (id) DO NOTHING;

-- 8. مواد المرحلة الثالثة - الكورس الثاني (7 مواد)
INSERT INTO public.subjects (id, semester_id, name, name_en, name_ar, code, description, icon, display_order)
VALUES
    ('sub-3-2-1', 'sem-3-2', 'Pet. Production Eng. 2', 'Pet. Production Eng. 2', 'هندسة الإنتاج النفطي 2', 'PGE321', 'طرق الرفع الاصطناعي (المضخات الغاطسة ESP، مضخات قضيب المص، والرفع بالغاز)، ومعالجة مشاكل الإنتاج.', 'sliders', 1),
    ('sub-3-2-2', 'sem-3-2', 'Reservoir Engineering', 'Reservoir Engineering', 'هندسة المكامن', 'PGE322', 'معادلة موازنة المادة، آليات دفع المكمن الطبيعية، وحساب المخزون النفطي والغازي والتنبؤ بالأداء المستقبلي.', 'layers', 2),
    ('sub-3-2-3', 'sem-3-2', 'Pollution', 'Pollution', 'التلوث البيئي والسلامة المهنية', 'PGE323', 'معالجة المخلفات النفطية، الانبعاثات الغازية، حماية البيئة المائية والبرية، ومعايير السلامة المهنية HSE.', 'alert-triangle', 3),
    ('sub-3-2-4', 'sem-3-2', 'Drilling Engineering 2', 'Drilling Engineering 2', 'هندسة الحفر 2', 'PGE324', 'الحفر الموجه والأفقي، السيطرة على ضغوط الآبار وموانع الانفجار (BOP)، وتصميم أنابيب التبطين والتسميت.', 'drill', 4),
    ('sub-3-2-5', 'sem-3-2', 'Formation Evaluation', 'Formation Evaluation', 'تقييم التكوينات النفطية', 'PGE325', 'التكامل بين تسجيلات الآبار وعينات اللباب الصخري لتحليل النطاقات المنتجة وحساب التشبع النفطي.', 'file-search', 5),
    ('sub-3-2-6', 'sem-3-2', 'Optimality', 'Optimality', 'الأمثلية الهندسية', 'PGE326', 'خوارزميات وطرق الحل الأمثل (Optimization) لتشغيل الآبار وإدارة شبكات الإنتاج وتوزيع الضغوط.', 'target', 6),
    ('sub-3-2-7', 'sem-3-2', 'Pet. Eng. Economics', 'Pet. Eng. Economics', 'اقتصاديات هندسة النفط', 'PGE327', 'عقود النفط والغاز، الضرائب، تسعير المنتجات البترولية، إدارة المخاطر الاستثمارية، والقرارات التمويلية.', 'coins', 7)
ON CONFLICT (id) DO NOTHING;

-- 9. مواد المرحلة الرابعة - الكورس الأول (8 مواد)
INSERT INTO public.subjects (id, semester_id, name, name_en, name_ar, code, description, icon, display_order)
VALUES
    ('sub-4-1-1', 'sem-4-1', 'Renewable Energy', 'Renewable Energy', 'الطاقة المتجددة', 'PGE411', 'مصادر الطاقة البديلة والنظيفة، الطاقة الشمسية والحرارية الأرضية، والتحول الطاقي في المنشآت الهندسية.', 'sun', 1),
    ('sub-4-1-2', 'sem-4-1', 'EOR', 'EOR', 'الاستخلاص المدعم للنفط (EOR)', 'PGE412', 'طرق الاستخلاص المدعم للنفط: الحقن الحراري، الغمر الكيميائي، وحقن الغازات القابلة للامتزاج وغير القابلة.', 'flame', 2),
    ('sub-4-1-3', 'sem-4-1', 'Pet. Reservoir Eng.', 'Pet. Reservoir Eng.', 'هندسة المكامن المتقدمة', 'PGE413', 'المحاكاة الرقمية للمكامن، نماذج الجريان متعدد الأطوار، وتحليل منحنيات التناقص الإنتاجي المتقدمة.', 'database', 3),
    ('sub-4-1-4', 'sem-4-1', 'Drilling', 'Drilling', 'عمليات وتقنيات الحفر المتقدمة', 'PGE414', 'تقنيات الحفر المتقدمة، حفر الآبار البحرية، حفر الضغط المدار (MPD)، والتعامل مع مشاكل استعصاء الأنابيب.', 'wrench', 4),
    ('sub-4-1-5', 'sem-4-1', 'Eng. Ethics', 'Eng. Ethics', 'أخلاقيات مهنة الهندسة', 'PGE415', 'المسؤولية المهنية والاجتماعية للمهندس، كودات السلوك الأخلاقي، السلامة العامة وحماية الملكية الفكرية.', 'shield-check', 5),
    ('sub-4-1-6', 'sem-4-1', 'Project Planning & Management', 'Project Planning & Management', 'تخطيط وإدارة المشاريع الهندسية', 'PGE416', 'جدولة المشاريع النفطية، إدارة المخاطر والتكاليف، مراقبة الجودة، واستخدام أسلوبي CPM و PERT في الإدارة.', 'calendar-check', 6),
    ('sub-4-1-7', 'sem-4-1', 'Well Test', 'Well Test', 'فحص واختبار الآبار', 'PGE417', 'اختبارات بناء وهبوط الضغط (Drawdown & Buildup)، تحديد معامل التضرر (Skin)، ونفاذية وضغط المكمن المتوسط.', 'gauge', 7),
    ('sub-4-1-8', 'sem-4-1', 'Natural Gas', 'Natural Gas', 'هندسة ومعالجة الغاز الطبيعي', 'PGE418', 'استخراج ومعالجة الغاز الطبيعي، إزالة مركبات الكبريت وتجفيف الغاز، ونقله وتخزينه وتسييله (LNG/LPG).', 'fuel', 8)
ON CONFLICT (id) DO NOTHING;

-- 10. مواد المرحلة الرابعة - الكورس الثاني (مادة واحدة مؤكدة)
INSERT INTO public.subjects (id, semester_id, name, name_en, name_ar, code, description, icon, display_order)
VALUES
    ('sub-4-2-1', 'sem-4-2', 'Reservoir Management', 'Reservoir Management', 'إدارة المكامن النفطية', 'PGE421', 'التخطيط الاستراتيجي المتكامل لتطوير الحقول، تتبع حركة السوائل، تعظيم القيمة الاستردادية وإطالة عمر الحقل.', 'briefcase', 1)
ON CONFLICT (id) DO NOTHING;
