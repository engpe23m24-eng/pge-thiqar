/**
-- ====================================================================
-- جامعة ذي قار - كلية الهندسة - قسم هندسة النفط والغاز
-- University of Thi-Qar - Department of Petroleum and Gas Engineering
-- Secure Supabase Client & Role-Based Access Control (RBAC) Manager
-- ====================================================================
 */

const SupabaseConfig = {
  getUrl: () => localStorage.getItem('thiqar_supabase_url') || '',
  getKey: () => localStorage.getItem('thiqar_supabase_anon_key') || '',
  isConnected: () => Boolean(localStorage.getItem('thiqar_supabase_url') && localStorage.getItem('thiqar_supabase_anon_key')),
  
  saveCredentials: (url, anonKey) => {
    localStorage.setItem('thiqar_supabase_url', url.trim());
    localStorage.setItem('thiqar_supabase_anon_key', anonKey.trim());
  },
  
  clearCredentials: () => {
    localStorage.removeItem('thiqar_supabase_url');
    localStorage.removeItem('thiqar_supabase_anon_key');
  }
};

class AcademicDataManager {
  constructor() {
    this.storageKey = 'thiqar_pge_academic_data_v4';
    this.client = null;
    this.currentUser = null;
    this.adminProfile = null;
    this.authReady = true;
    this.authRestorePromise = Promise.resolve();
    this.data = this.loadLocalData();

    this.initSupabaseClient();
  }

  // تهيئة عميل Supabase الرسمي عبر CDN
  initSupabaseClient() {
    try {
      if (typeof window !== 'undefined' && window.supabase && SupabaseConfig.isConnected()) {
        this.client = window.supabase.createClient(SupabaseConfig.getUrl(), SupabaseConfig.getKey(), {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        this.authReady = false;
        this.authRestorePromise = this.restoreSession();
      }
    } catch (err) {
      this.authReady = true;
      console.warn('Supabase client initialization warning:', err);
    }
  }

  // استعادة جلسة المسؤول المشفرة إن وجدت
  async restoreSession() {
    if (!this.client) {
      this.authReady = true;
      return;
    }
    try {
      const client = this.client;
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user) {
        await this.verifyAndSetAdmin(session.user);
      }

      client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          this.currentUser = null;
          this.adminProfile = null;
          window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isLoggedIn: false } }));
        } else if (event === 'SIGNED_IN' && session.user) {
          await this.verifyAndSetAdmin(session.user);
          window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isLoggedIn: this.isLoggedIn() } }));
        }
      });
    } catch (e) {
      console.warn('Session verification exception:', e);
    } finally {
      this.authReady = true;
      window.dispatchEvent(new CustomEvent('auth-state-changed', {
        detail: { isLoggedIn: this.isLoggedIn(), restored: true }
      }));
    }
  }

  // التحقق من جدول المسؤولين administrators عبر RLS
  async verifyAndSetAdmin(user) {
    if (!this.client || !user) return;
    try {
      const { data: adminRecord, error } = await this.client
        .from('administrators')
        .select('user_id, email, full_name, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && adminRecord && ['super_admin', 'admin', 'editor'].includes(adminRecord.role)) {
        this.currentUser = user;
        this.adminProfile = adminRecord;
      } else {
        this.currentUser = null;
        this.adminProfile = null;
      }
    } catch (e) {
      this.currentUser = null;
      this.adminProfile = null;
    }
  }

  // تحميل البيانات الأولية المحفوظة محلياً لضمان سرعة التصفح لعامة الطلبة
  loadLocalData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed.years) &&
          Array.isArray(parsed.semesters) &&
          Array.isArray(parsed.subjects) &&
          Array.isArray(parsed.materials)
        ) {
          let hasUpdates = false;

          // Keep persisted IDs intact; only normalize the legacy relationship field.
          parsed.semesters.forEach(sem => {
            if (!sem.year_id && sem.academic_year_id) {
              sem.year_id = sem.academic_year_id;
              hasUpdates = true;
            }
          });

          if (hasUpdates) {
            this.saveLocalData(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not parse local data, initializing default dataset:', e);
    }
    this.saveLocalData(INITIAL_ACADEMIC_DATA);
    return JSON.parse(JSON.stringify(INITIAL_ACADEMIC_DATA));
  }

  saveLocalData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      this.data = data;
      window.dispatchEvent(new CustomEvent('academic-data-updated', { detail: data }));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // مزامنة البيانات من قاعدة بيانات Supabase (قراءة عامة للطلبة والزوار)
  async syncFromSupabase() {
    if (!this.client) return { success: false, code: 'NO_CLIENT' };
    try {
      const tableQueries = [
        ['academic_years', this.client.from('academic_years').select('*').order('display_order')],
        ['semesters', this.client.from('semesters').select('*').order('display_order')],
        ['subjects', this.client.from('subjects').select('*').order('display_order')],
        ['materials', this.client.from('materials').select('*').order('created_at', { ascending: false })]
      ];
      const results = await Promise.all(tableQueries.map(([, query]) => query));
      const failedIndex = results.findIndex(result => result.error);
      if (failedIndex !== -1) {
        const error = results[failedIndex].error;
        return {
          success: false,
          table: tableQueries[failedIndex][0],
          code: error.code || null,
          status: error.status || null
        };
      }

      const [yearsRes, semRes, subRes, matRes] = results;
      if (![yearsRes.data, semRes.data, subRes.data, matRes.data].every(Array.isArray)) {
        return { success: false, code: 'EMPTY_RESPONSE' };
      }

      if (yearsRes.data && semRes.data && subRes.data) {
        const syncedData = {
          years: yearsRes.data.length ? yearsRes.data : this.data.years,
          semesters: semRes.data.length ? semRes.data : this.data.semesters,
          subjects: subRes.data.length ? subRes.data : this.data.subjects,
          materials: matRes.data || this.data.materials
        };
        this.saveLocalData(syncedData);
        return { success: true, count: subRes.data.length };
      }
    } catch (e) {
      console.warn('Supabase sync error:', e);
      const isNetworkError = /fetch|network|timeout|load failed/i.test(String(e.message || e));
      return { success: false, code: isNetworkError ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR' };
    }
    return { success: false, code: 'EMPTY_RESPONSE' };
  }

  // ====================================================================
  // دوال القراءة العامة (Public Read - متاحة للطلبة والزوار بدون تسجيل)
  // ====================================================================

  getYears() {
    if (this.data && Array.isArray(this.data.years)) {
      return this.data.years.slice().sort((a, b) => a.display_order - b.display_order);
    }
    return (INITIAL_ACADEMIC_DATA.years || []).slice().sort((a, b) => a.display_order - b.display_order);
  }

  getYearById(yearId) {
    if (!yearId) return null;
    const str = String(yearId).trim().toLowerCase();

    const hasLiveYears = this.data && Array.isArray(this.data.years);
    const list = hasLiveYears ? this.data.years : (INITIAL_ACADEMIC_DATA.years || []);
    const normalizeId = value => String(value || '').trim().toLowerCase();

    // Prefer the actual record ID. Supabase may use UUIDs while older links
    // and bookmarks use year-1 / stage-1 / numeric IDs.
    const exact = list.find(year => normalizeId(year.id) === str);
    if (exact) return exact;

    const aliases = {
      '1': 1, 'year-1': 1, 'year1': 1, 'stage-1': 1, 'stage1': 1,
      'first': 1, 'first-year': 1, 'المرحلة-الأولى': 1,
      '2': 2, 'year-2': 2, 'year2': 2, 'stage-2': 2, 'stage2': 2,
      'second': 2, 'second-year': 2, 'المرحلة-الثانية': 2,
      '3': 3, 'year-3': 3, 'year3': 3, 'stage-3': 3, 'stage3': 3,
      'third': 3, 'third-year': 3, 'المرحلة-الثالثة': 3,
      '4': 4, 'year-4': 4, 'year4': 4, 'stage-4': 4, 'stage4': 4,
      'fourth': 4, 'fourth-year': 4, 'المرحلة-الرابعة': 4
    };

    let order = aliases[str];
    if (!order) {
      const name = str.replace(/[_\s]+/g, '-');
      const englishNames = { 'first-year': 1, 'second-year': 2, 'third-year': 3, 'fourth-year': 4 };
      order = englishNames[name];
    }
    if (!order) return null;

    const byOrder = list.find(year => Number(year.display_order) === order);
    if (byOrder) return byOrder;

    // Only use seed IDs when no live dataset exists. Returning a seed record
    // for a different live ID breaks its semester foreign-key relationship.
    return hasLiveYears ? null : (INITIAL_ACADEMIC_DATA.years || []).find(year => Number(year.display_order) === order) || null;
  }

  getSemestersByYear(yearId) {
    const year = this.getYearById(yearId);
    if (!year) return [];

    const list = (this.data && Array.isArray(this.data.semesters))
      ? this.data.semesters
      : INITIAL_ACADEMIC_DATA.semesters;

    return list
      .filter(semester => {
        const yearRef = semester.year_id || semester.academic_year_id;
        const linkedYear = this.getYearById(yearRef);
        return linkedYear ? linkedYear.id === year.id : String(yearRef || '').toLowerCase() === String(year.id).toLowerCase();
      })
      .sort((a, b) => a.display_order - b.display_order);
  }

  getSemesterById(semesterId) {
    if (!semesterId) return null;
    const str = String(semesterId).trim().toLowerCase();

    const list = (this.data && Array.isArray(this.data.semesters))
      ? this.data.semesters
      : INITIAL_ACADEMIC_DATA.semesters;

    const exact = list.find(semester => String(semester.id).trim().toLowerCase() === str);
    if (exact) return exact;

    const legacy = INITIAL_ACADEMIC_DATA.semesters.find(semester => String(semester.id).trim().toLowerCase() === str);
    if (!legacy) return null;

    const hasLiveSemesters = this.data && Array.isArray(this.data.semesters);
    if (!hasLiveSemesters) return legacy;

    const legacyYear = INITIAL_ACADEMIC_DATA.years.find(year => year.id === legacy.year_id);
    if (!legacyYear) return null;

    return list.find(semester => {
      const linkedYear = this.getYearById(semester.year_id || semester.academic_year_id);
      return linkedYear &&
        Number(linkedYear.display_order) === Number(legacyYear.display_order) &&
        Number(semester.display_order) === Number(legacy.display_order);
    }) || null;
  }

  getSubjectsBySemester(semesterId) {
    if (!semesterId) return [];
    const list = this.data && Array.isArray(this.data.subjects)
      ? this.data.subjects
      : INITIAL_ACADEMIC_DATA.subjects;
    const targetSemester = this.getSemesterById(semesterId);
    const targetYear = targetSemester
      ? this.getYearById(targetSemester.year_id || targetSemester.academic_year_id)
      : null;

    const filtered = list.filter(subject => {
      const subjectSemesterRef = subject.semester_id || subject.semesterId;
      if (String(subjectSemesterRef || '').trim().toLowerCase() === String(semesterId).trim().toLowerCase()) return true;

      const subjectSemester = this.getSemesterById(subjectSemesterRef);
      if (!subjectSemester || !targetSemester || !targetYear) return false;
      const subjectYear = this.getYearById(subjectSemester.year_id || subjectSemester.academic_year_id);
      return Boolean(subjectYear) &&
        subjectYear.id === targetYear.id &&
        Number(subjectSemester.display_order) === Number(targetSemester.display_order);
    });

    return filtered.slice().sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
  }

  getSubjectById(subjectId) {
    if (!subjectId) return null;
    const str = String(subjectId).trim().toLowerCase();

    const list = this.data && Array.isArray(this.data.subjects)
      ? this.data.subjects
      : INITIAL_ACADEMIC_DATA.subjects;

    return list.find(subject => String(subject.id).trim().toLowerCase() === str) || null;
  }

  getMaterialsBySubject(subjectId, category = null) {
    if (!subjectId) return [];
    const list = (this.data && Array.isArray(this.data.materials))
      ? this.data.materials
      : (INITIAL_ACADEMIC_DATA.materials || []);

    return list
      .filter(material => String(material.subject_id).trim().toLowerCase() === String(subjectId).trim().toLowerCase() && (!category || material.category === category))
      .sort((a, b) => (a.lecture_number || 999) - (b.lecture_number || 999));
  }

  getMaterialById(materialId) {
    if (materialId == null) return null;
    const requestedId = String(materialId).trim().toLowerCase();
    return this.data.materials.find(material => String(material.id).trim().toLowerCase() === requestedId) || null;
  }

  search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return { subjects: [], materials: [] };

    const matchedSubjects = this.data.subjects.filter(s => 
      s.name.toLowerCase().includes(q) ||
      (s.name_ar && s.name_ar.toLowerCase().includes(q)) ||
      (s.name_en && s.name_en.toLowerCase().includes(q)) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );

    const matchedMaterials = this.data.materials.filter(m => {
      const subject = this.getSubjectById(m.subject_id);
      return (
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.file_name && m.file_name.toLowerCase().includes(q)) ||
        (subject && subject.name.toLowerCase().includes(q))
      );
    });

    return { subjects: matchedSubjects, materials: matchedMaterials };
  }

  // ====================================================================
  // مصادقة المسؤول الآمنة (Secure RBAC Authentication via Supabase Auth)
  // ====================================================================

  isLoggedIn() {
    return Boolean(this.currentUser && this.adminProfile && ['super_admin', 'admin', 'editor'].includes(this.adminProfile.role));
  }

  getAdminInfo() {
    if (!this.isLoggedIn()) return null;
    return {
      email: this.currentUser.email,
      fullName: this.adminProfile.full_name || 'مسؤول النظام',
      role: this.adminProfile.role
    };
  }

  async loginAdmin(email, password) {
    if (!email || !password) {
      return { success: false, message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' };
    }

    if (!this.client) {
      return { 
        success: false, 
        message: 'قاعدة بيانات Supabase غير متصلة. يرجى إدخال Project URL و Anon Key في إعدادات الربط لتسجيل الدخول بأمان.' 
      };
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        return { success: false, message: error.message || 'بيانات الدخول غير صحيحة' };
      }

      if (!data.user) {
        return { success: false, message: 'تعذر التحقق من هوية المستخدم' };
      }

      // التحقق الصارم من رتبة المسؤول في جدول administrators المحمي بـ RLS
      const { data: adminRecord, error: roleError } = await this.client
        .from('administrators')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (roleError || !adminRecord) {
        await this.client.auth.signOut();
        return { 
          success: false, 
          message: 'تم التحقق من الحساب ولكن ليس لديك تصريح مسؤول (Administrator). الدخول مخصص لإدارة القسم فقط.' 
        };
      }

      this.currentUser = data.user;
      this.adminProfile = adminRecord;

      return { success: true, user: data.user, profile: adminRecord };
    } catch (err) {
      return { success: false, message: 'حدث خطأ أثناء الاتصال: ' + (err.message || err) };
    }
  }

  async logoutAdmin() {
    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch (e) {
        console.warn('Sign out warning:', e);
      }
    }
    this.currentUser = null;
    this.adminProfile = null;
  }

  // ====================================================================
  // رفع وتخزين الملفات الآمن (Secure Storage Upload with Validation)
  // ====================================================================

  async uploadAcademicFile(file, folderPath = 'lectures') {
    if (!this.isLoggedIn()) {
      throw new Error('Unauthorized: رفع الملفات مخصص لمسؤولي القسم المسجلين فقط.');
    }

    // 1. التحقق من حجم الملف (الحد الأقصى 50 ميغابايت)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميغابايت)');
    }

    // 2. التحقق من امتداد الملف ونوعه المعتمد
    const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'];
    const fileExt = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      throw new Error(`امتداد الملف (.${fileExt}) غير مسموح به. الامتدادات المدعومة: PDF, Word, PowerPoint, Excel, Images`);
    }

    // 3. توليد مسار تخزين آمن وفريد يمنع التداخل أو استبدال الملفات غير المصرح
    const safeRandom = Math.random().toString(36).substring(2, 9);
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${folderPath}/${Date.now()}-${safeRandom}_${sanitizedFileName}`;

    if (this.client) {
      const { data, error } = await this.client.storage
        .from('academic-materials')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error('فشل رفع الملف إلى التخزين السحابي: ' + error.message);
      }

      const { data: publicData } = this.client.storage
        .from('academic-materials')
        .getPublicUrl(storagePath);

      return {
        file_path: data.path,
        public_url: publicData.publicUrl,
        file_name: file.name,
        file_size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        file_type: file.type || 'application/pdf'
      };
    }

    // في حال عدم ربط التخزين السحابي، تخزين بيانات المعاينة محلياً للمسؤول فقط
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          file_path: storagePath,
          file_data_url: e.target.result,
          file_name: file.name,
          file_size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          file_type: file.type || 'application/pdf'
        });
      };
      reader.onerror = () => reject(new Error('فشل قراءة الملف المحلي'));
      reader.readAsDataURL(file);
    });
  }

  // ====================================================================
  // العمليات الإدارية المحمية (Protected CRUD - Admin Only)
  // ====================================================================

  async addSubject(subjectData) {
    if (!this.isLoggedIn()) {
      throw new Error('Unauthorized: إضافة المواد الدراسية مقتصرة على المسؤولين فقط.');
    }

    const newSubject = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      semester_id: subjectData.semester_id,
      name: subjectData.name.trim(),
      name_en: subjectData.name_en ? subjectData.name_en.trim() : subjectData.name.trim(),
      name_ar: subjectData.name_ar ? subjectData.name_ar.trim() : subjectData.name.trim(),
      code: subjectData.code ? subjectData.code.trim().toUpperCase() : 'PGE',
      description: subjectData.description ? subjectData.description.trim() : '',
      icon: subjectData.icon || 'book-open',
      display_order: this.data.subjects.filter(s => s.semester_id === subjectData.semester_id).length + 1,
      created_at: new Date().toISOString()
    };

    if (this.client) {
      const { error } = await this.client.from('subjects').insert(newSubject);
      if (error) throw new Error('فشل الحفظ في قاعدة البيانات: ' + error.message);
    }

    this.data.subjects.push(newSubject);
    this.saveLocalData(this.data);
    return newSubject;
  }

  async updateSubject(subjectId, updatedFields) {
    if (!this.isLoggedIn()) {
      throw new Error('Unauthorized: تعديل المواد الدراسية مقتصر على المسؤولين فقط.');
    }

    const index = this.data.subjects.findIndex(s => s.id === subjectId);
    if (index === -1) return null;

    if (this.client) {
      const { error } = await this.client.from('subjects').update(updatedFields).eq('id', subjectId);
      if (error) throw new Error('فشل تحديث قاعدة البيانات: ' + error.message);
    }

    this.data.subjects[index] = { ...this.data.subjects[index], ...updatedFields };
    this.saveLocalData(this.data);
    return this.data.subjects[index];
  }

  async deleteSubject(subjectId) {
    if (!this.isLoggedIn()) {
      throw new Error('Unauthorized: حذف المواد الدراسية مقتصر على المسؤولين فقط.');
    }

    if (this.client) {
      const { error } = await this.client.from('subjects').delete().eq('id', subjectId);
      if (error) throw new Error('فشل الحذف من قاعدة البيانات: ' + error.message);
    }

    this.data.subjects = this.data.subjects.filter(s => s.id !== subjectId);
    this.data.materials = this.data.materials.filter(m => m.subject_id !== subjectId);
    this.saveLocalData(this.data);
    return true;
  }

  async addMaterial(materialData) {
    if (!this.isLoggedIn()) {
      throw new Error('Unauthorized: رفع المواد وإضافة الفيديوهات مقتصرة على المسؤولين فقط.');
    }

    const newMaterial = {
      id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      subject_id: materialData.subject_id,
      category: materialData.category || 'lectures',
      title: materialData.title.trim(),
      description: materialData.description ? materialData.description.trim() : '',
      file_path: materialData.file_path || (materialData.youtube_url ? 'youtube' : 'sample_docs/geology_lec1_intro.pdf'),
      file_name: materialData.file_name || (materialData.youtube_url ? 'YouTube Video' : 'document.pdf'),
      file_size: materialData.file_size || (materialData.youtube_url ? 'YouTube' : '1.5 MB'),
      file_type: materialData.file_type || (materialData.youtube_url ? 'video/youtube' : 'application/pdf'),
      youtube_url: materialData.youtube_url || null,
      file_data_url: materialData.file_data_url || null,
      lecture_number: materialData.lecture_number ? Number(materialData.lecture_number) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (this.client) {
      // إزالة حقول العرض المحلية المؤقتة قبل الإرسال لـ Supabase
      const { file_data_url, ...dbPayload } = newMaterial;
      const { error } = await this.client.from('materials').insert(dbPayload);
      if (error) throw new Error('فشل الحفظ في قاعدة البيانات: ' + error.message);
    }

    this.data.materials.unshift(newMaterial);
    this.saveLocalData(this.data);
    return newMaterial;
  }

  async updateMaterial(materialId, updatedFields) {
    if (!this.isLoggedIn()) {
      throw new Error('Unauthorized: تعديل المواد التعليمية مقتصر على المسؤولين فقط.');
    }

    const index = this.data.materials.findIndex(m => m.id === materialId);
    if (index === -1) return null;

    if (this.client) {
      // file_data_url is a local preview cache, not a database column or upload payload.
      const { file_data_url, ...dbPayload } = updatedFields;
      const { error } = await this.client.from('materials').update(dbPayload).eq('id', materialId);
      if (error) throw new Error('فشل التحديث في قاعدة البيانات: ' + error.message);
    }

    this.data.materials[index] = {
      ...this.data.materials[index],
      ...updatedFields,
      updated_at: new Date().toISOString()
    };
    this.saveLocalData(this.data);
    return this.data.materials[index];
  }

  async deleteMaterial(materialId) {
    if (!this.isLoggedIn()) {
      throw new Error('Unauthorized: حذف المواد التعليمية مقتصر على المسؤولين فقط.');
    }

    if (this.client) {
      const { error } = await this.client.from('materials').delete().eq('id', materialId);
      if (error) throw new Error('فشل الحذف من قاعدة البيانات: ' + error.message);
    }

    this.data.materials = this.data.materials.filter(m => m.id !== materialId);
    this.saveLocalData(this.data);
    return true;
  }

  exportData() {
    return JSON.stringify(this.data, null, 2);
  }
}

// إنشاء نسخة واحدة وتصديرها للنافذة العامة
window.academicDB = new AcademicDataManager();
