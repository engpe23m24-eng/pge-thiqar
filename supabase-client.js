/**
 * Supabase Client & Local Persistence Adapter
 * جامعة ذي قار - كلية الهندسة - قسم هندسة النفط والغاز
 */

const SupabaseConfig = {
  // يتم قراءة الإعدادات من LocalStorage أو المتغيرات
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

// فئة إدارة البيانات الموحدة (تدعم Supabase والتخزين المحلي المتقدم IndexedDB / LocalStorage)
class AcademicDataManager {
  constructor() {
    this.storageKey = 'thiqar_pge_academic_data_v3';
    this.adminSessionKey = 'thiqar_pge_admin_session_v3';
    this.data = this.loadLocalData();
  }

  loadLocalData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // التحقق من اكتمال الهيكل
        if (parsed.years && parsed.semesters && parsed.subjects && parsed.materials) {
          // دمج ذكي وغير متكرر (Idempotent Merge): ضمان توفر مقررات المرحلة الثالثة والرابعة مع الحفاظ التام على المقررات والملفات السابقة
          let hasUpdates = false;
          const existingSubIds = new Set(parsed.subjects.map(s => s.id));
          const existingSubKeys = new Set(parsed.subjects.map(s => `${s.semester_id}::${s.name.trim().toLowerCase()}`));

          INITIAL_ACADEMIC_DATA.subjects.forEach(initialSub => {
            const key = `${initialSub.semester_id}::${initialSub.name.trim().toLowerCase()}`;
            if (!existingSubIds.has(initialSub.id) && !existingSubKeys.has(key)) {
              parsed.subjects.push(initialSub);
              existingSubIds.add(initialSub.id);
              existingSubKeys.add(key);
              hasUpdates = true;
            }
          });

          // تحديث بيانات المراحل والفصول إن لزم الأمر
          INITIAL_ACADEMIC_DATA.years.forEach(initYear => {
            const yIndex = parsed.years.findIndex(y => y.id === initYear.id);
            if (yIndex === -1) {
              parsed.years.push(initYear);
              hasUpdates = true;
            } else if (parsed.years[yIndex].name_en !== initYear.name_en) {
              parsed.years[yIndex].name_en = initYear.name_en;
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
    // استخدام البيانات الأولية الدقيقة المعتمدة
    this.saveLocalData(INITIAL_ACADEMIC_DATA);
    return JSON.parse(JSON.stringify(INITIAL_ACADEMIC_DATA));
  }

  saveLocalData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      this.data = data;
      // إطلاق حدث تحديث للبيانات
      window.dispatchEvent(new CustomEvent('academic-data-updated', { detail: data }));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // استرجاع المراحل الدراسية
  getYears() {
    return this.data.years.sort((a, b) => a.display_order - b.display_order);
  }

  getYearById(yearId) {
    return this.data.years.find(y => y.id === yearId);
  }

  // استرجاع الفصول الدراسية لمرحلة معينة
  getSemestersByYear(yearId) {
    return this.data.semesters
      .filter(s => s.year_id === yearId)
      .sort((a, b) => a.display_order - b.display_order);
  }

  getSemesterById(semesterId) {
    return this.data.semesters.find(s => s.id === semesterId);
  }

  // استرجاع المواد لفصل معين
  getSubjectsBySemester(semesterId) {
    return this.data.subjects
      .filter(s => s.semester_id === semesterId)
      .sort((a, b) => a.display_order - b.display_order);
  }

  getSubjectById(subjectId) {
    return this.data.subjects.find(s => s.id === subjectId);
  }

  // استرجاع المواد والمحاضرات لمادة معينة
  getMaterialsBySubject(subjectId, category = null) {
    let items = this.data.materials.filter(m => m.subject_id === subjectId);
    if (category) {
      items = items.filter(m => m.category === category);
    }
    // في المحاضرات، الترتيب حسب رقم المحاضرة أولاً ثم تاريخ الإضافة
    return items.sort((a, b) => {
      if (a.lecture_number && b.lecture_number) {
        return a.lecture_number - b.lecture_number;
      }
      return new Date(b.created_at || b.upload_date) - new Date(a.created_at || a.upload_date);
    });
  }

  getMaterialById(materialId) {
    return this.data.materials.find(m => m.id === materialId);
  }

  // ==========================================
  // عمليات الإدارة (CRUD) للمسؤولين
  // ==========================================

  // 1. إضافة مادة دراسية جديدة
  addSubject(subjectData) {
    const newSubject = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      semester_id: subjectData.semester_id,
      name: subjectData.name.trim(),
      name_en: subjectData.name_en ? subjectData.name_en.trim() : subjectData.name.trim(),
      name_ar: subjectData.name_ar ? subjectData.name_ar.trim() : subjectData.name.trim(),
      code: subjectData.code ? subjectData.code.trim().toUpperCase() : 'PGE-NEW',
      description: subjectData.description ? subjectData.description.trim() : '',
      icon: subjectData.icon || 'book-open',
      display_order: Number(subjectData.display_order) || (this.getSubjectsBySemester(subjectData.semester_id).length + 1)
    };

    this.data.subjects.push(newSubject);
    this.saveLocalData(this.data);
    return newSubject;
  }

  // 2. تعديل مادة دراسية
  updateSubject(subjectId, updatedFields) {
    const index = this.data.subjects.findIndex(s => s.id === subjectId);
    if (index === -1) return null;

    this.data.subjects[index] = {
      ...this.data.subjects[index],
      ...updatedFields,
      name: updatedFields.name ? updatedFields.name.trim() : this.data.subjects[index].name
    };

    this.saveLocalData(this.data);
    return this.data.subjects[index];
  }

  // 3. حذف مادة دراسية
  deleteSubject(subjectId) {
    // حذف المادة وكافة الملفات والمحاضرات المرتبطة بها
    this.data.subjects = this.data.subjects.filter(s => s.id !== subjectId);
    this.data.materials = this.data.materials.filter(m => m.subject_id !== subjectId);
    this.saveLocalData(this.data);
    return true;
  }

  // 4. إضافة مستند / محاضرة جديدة
  addMaterial(materialData) {
    const newMaterial = {
      id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      subject_id: materialData.subject_id,
      category: materialData.category || 'lectures',
      title: materialData.title.trim(),
      description: materialData.description ? materialData.description.trim() : '',
      file_path: materialData.file_path || 'sample_docs/geology_lec1_intro.pdf',
      file_name: materialData.file_name || 'document.pdf',
      file_size: materialData.file_size || '1.5 MB',
      file_type: materialData.file_type || 'application/pdf',
      file_data_url: materialData.file_data_url || null, // دعم المعاينة المباشرة للملفات المرفوعة من الجهاز
      lecture_number: materialData.lecture_number ? Number(materialData.lecture_number) : null,
      upload_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    this.data.materials.push(newMaterial);
    this.saveLocalData(this.data);
    return newMaterial;
  }

  // 5. تعديل بيانات مستند / محاضرة
  updateMaterial(materialId, updatedFields) {
    const index = this.data.materials.findIndex(m => m.id === materialId);
    if (index === -1) return null;

    this.data.materials[index] = {
      ...this.data.materials[index],
      ...updatedFields,
      updated_at: new Date().toISOString()
    };

    this.saveLocalData(this.data);
    return this.data.materials[index];
  }

  // 6. استبدال ملف المستند بملف جديد
  replaceMaterialFile(materialId, fileInfo) {
    const index = this.data.materials.findIndex(m => m.id === materialId);
    if (index === -1) return null;

    this.data.materials[index].file_name = fileInfo.file_name;
    this.data.materials[index].file_path = fileInfo.file_path || this.data.materials[index].file_path;
    this.data.materials[index].file_size = fileInfo.file_size;
    this.data.materials[index].file_data_url = fileInfo.file_data_url || null;
    this.data.materials[index].upload_date = new Date().toISOString().split('T')[0];
    this.data.materials[index].updated_at = new Date().toISOString();

    this.saveLocalData(this.data);
    return this.data.materials[index];
  }

  // 7. حذف مستند / محاضرة
  deleteMaterial(materialId) {
    this.data.materials = this.data.materials.filter(m => m.id !== materialId);
    this.saveLocalData(this.data);
    return true;
  }

  // استعادة البيانات الأولية الافتراضية
  resetToDefaultData() {
    this.saveLocalData(INITIAL_ACADEMIC_DATA);
    return true;
  }

  // تصدير البيانات إلى ملف JSON
  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  // استيراد بيانات من JSON
  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.years && parsed.semesters && parsed.subjects && parsed.materials) {
        this.saveLocalData(parsed);
        return true;
      }
    } catch (e) {
      console.error('Invalid import data:', e);
    }
    return false;
  }

  // ==========================================
  // البحث الشامل في المقررات والمحاضرات
  // ==========================================
  search(query) {
    if (!query || query.trim().length === 0) return { subjects: [], materials: [] };
    const q = query.trim().toLowerCase();

    // البحث في المواد
    const matchedSubjects = this.data.subjects.filter(s => {
      const semester = this.getSemesterById(s.semester_id);
      const year = semester ? this.getYearById(semester.year_id) : null;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.name_ar && s.name_ar.toLowerCase().includes(q)) ||
        (s.name_en && s.name_en.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (semester && semester.name_ar.toLowerCase().includes(q)) ||
        (year && year.name_ar.toLowerCase().includes(q))
      );
    });

    // البحث في المحاضرات والمستندات
    const matchedMaterials = this.data.materials.filter(m => {
      const subject = this.getSubjectById(m.subject_id);
      return (
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.file_name && m.file_name.toLowerCase().includes(q)) ||
        (subject && subject.name.toLowerCase().includes(q))
      );
    });

    return {
      subjects: matchedSubjects,
      materials: matchedMaterials
    };
  }

  // ==========================================
  // جلسة المسؤول (Admin Authentication)
  // ==========================================
  loginAdmin(username, password) {
    // التحقق من بيانات الدخول (الافتراضية: admin / thiqar2026 أو اتصال Supabase)
    if ((username.trim() === 'admin' || username.trim() === 'pge_admin') && password === 'thiqar2026') {
      const session = {
        authenticated: true,
        username: username.trim(),
        role: 'super_admin',
        loginTime: new Date().toISOString()
      };
      localStorage.setItem(this.adminSessionKey, JSON.stringify(session));
      return { success: true, session };
    }
    return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  }

  isLoggedIn() {
    try {
      const session = JSON.parse(localStorage.getItem(this.adminSessionKey));
      return Boolean(session && session.authenticated);
    } catch (e) {
      return false;
    }
  }

  logoutAdmin() {
    localStorage.removeItem(this.adminSessionKey);
  }
}

// إنشاء نسخة عامة واحدة لخدمة الموقع
window.academicDB = new AcademicDataManager();
