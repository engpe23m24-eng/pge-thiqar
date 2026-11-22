/**
 * ====================================================================
 * جامعة ذي قار - كلية الهندسة - قسم هندسة النفط والغاز
 * University of Thi-Qar - College of Engineering
 * Department of Petroleum & Gas Engineering
 * Core Application Engine, Router, and UI Controller
 * ====================================================================
 */

// حالة التطبيق العامة
const App = {
  currentRoute: 'home',
  routeParams: {},
  activeCategoryTab: 'lectures',
  currentViewingPdf: null,
  isDarkMode: false,

  // تهيئة التطبيق عند اكتمال تحميل الصفحة
  init() {
    this.initTheme();
    this.bindEvents();
    this.handleRouting();
    window.addEventListener('hashchange', () => this.handleRouting());
    this.updateAdminUIState();
  },

  // إعداد النمط الليلي / النهاري
  initTheme() {
    const savedTheme = localStorage.getItem('thiqar_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.setDarkMode(true);
    } else {
      this.setDarkMode(false);
    }
  },

  toggleTheme() {
    this.setDarkMode(!this.isDarkMode);
  },

  setDarkMode(isDark) {
    this.isDarkMode = isDark;
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('thiqar_theme', 'dark');
      document.querySelectorAll('.theme-icon-sun').forEach(el => el.classList.remove('hidden'));
      document.querySelectorAll('.theme-icon-moon').forEach(el => el.classList.add('hidden'));
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('thiqar_theme', 'light');
      document.querySelectorAll('.theme-icon-sun').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.theme-icon-moon').forEach(el => el.classList.remove('hidden'));
    }
  },

  // ربط الأحداث العامة
  bindEvents() {
    // إغلاق النوافذ المنبثقة بالزر Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMobileMenu({ restoreFocus: true });
        const desktopStagesMenu = document.getElementById('desktop-stages-menu');
        if (desktopStagesMenu?.open) {
          desktopStagesMenu.removeAttribute('open');
          desktopStagesMenu.querySelector('summary')?.focus();
        }
        this.closeAllModals();
      }
    });

    document.addEventListener('click', (event) => {
      const menu = document.getElementById('mobile-drawer');
      const toggle = document.getElementById('mobile-menu-toggle');
      if (
        menu && !menu.classList.contains('hidden') &&
        !menu.contains(event.target) && !toggle?.contains(event.target)
      ) {
        this.closeMobileMenu();
      }

      const stagesMenu = document.getElementById('desktop-stages-menu');
      if (stagesMenu?.open && !stagesMenu.contains(event.target)) {
        stagesMenu.removeAttribute('open');
      }
    });

    const desktopLayout = window.matchMedia('(min-width: 1280px)');
    const closeMenuForDesktop = event => {
      if (event.matches) this.closeMobileMenu();
    };
    if (desktopLayout.addEventListener) desktopLayout.addEventListener('change', closeMenuForDesktop);
    else if (desktopLayout.addListener) desktopLayout.addListener(closeMenuForDesktop);

    // تحديث أيقونات Lucide بعد كل إعادة رسم
    window.addEventListener('academic-data-updated', () => {
      this.renderCurrentView();
    });

    // Recheck the current route after Supabase restores or changes an admin session.
    window.addEventListener('auth-state-changed', () => {
      this.updateAdminUIState();
      if (this.currentRoute === 'admin') this.renderCurrentView();
    });
  },

  refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  },

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));
  },

  // ==========================================
  // نظام التوجيه والتنقل (Routing System)
  // ==========================================
  handleRouting() {
    const previousRoute = this.currentRoute;
    const previousMaterialId = this.routeParams.p1;
    const hash = window.location.hash || '#/';
    const routeText = hash.replace(/^#/, '').split('?')[0].replace(/^\/+|\/+$/g, '');
    const parts = routeText ? routeText.split('/').map(part => {
      try {
        return decodeURIComponent(part);
      } catch (err) {
        return part;
      }
    }) : [];
    const mainRoute = parts[0] || 'home';

    this.currentRoute = mainRoute;
    this.routeParams = {
      p1: parts[1] || null,
      p2: parts[2] || null,
      p3: parts[3] || null
    };

    // Leaving a lecture route must also stop its iframe and close its viewer.
    if (previousRoute === 'material' && (this.currentRoute !== 'material' || this.routeParams.p1 !== previousMaterialId)) {
      const videoFrame = document.getElementById('video-modal-iframe');
      const pdfViewport = document.getElementById('pdf-modal-viewport');
      if (videoFrame) videoFrame.src = '';
      if (pdfViewport) pdfViewport.innerHTML = '';
      this.currentViewingPdf = null;
      document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      });
    }

    // إغلاق القائمة الجانبية للموبايل عند التنقل
    this.closeMobileMenu();
    const desktopStagesMenu = document.getElementById('desktop-stages-menu');
    if (desktopStagesMenu) desktopStagesMenu.removeAttribute('open');
    // تمرير الشاشة إلى الأعلى
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.renderCurrentView();
  },

  navigateTo(path) {
    const route = String(path || '').replace(/^#\/?/, '').replace(/^\/+|\/+$/g, '');
    const encodedRoute = route.split('/').map(part => {
      try {
        return encodeURIComponent(decodeURIComponent(part));
      } catch (err) {
        return encodeURIComponent(part);
      }
    }).join('/');
    window.location.hash = encodedRoute ? `#/${encodedRoute}` : '#/';
  },

  renderCurrentView() {
    const mainContainer = document.getElementById('main-content');
    if (!mainContainer) return;

    // إخفاء كل المشاهد ثم عرض المشهد المطلوب
    const route = String(this.currentRoute || 'home').toLowerCase();

    // Check if route matches direct year identifier (e.g. #/1, #/year-1, #/stage-1)
    const directYear = window.academicDB && window.academicDB.getYearById ? window.academicDB.getYearById(route) : null;

    if (directYear && route !== 'home') {
      this.renderYearView(mainContainer, directYear.id, this.getDirectYearSemesterRouteParam());
      this.updateNavActiveState();
      this.refreshIcons();
      return;
    }

    switch (route) {
      case 'home':
      case '':
        this.renderHomeView(mainContainer);
        break;
      case 'year':
      case 'stage':
      case 'years':
      case 'stages':
        this.renderYearView(mainContainer, this.routeParams.p1, this.getSemesterRouteParam());
        break;
      case 'subject':
        this.renderSubjectView(mainContainer, this.routeParams.p1, this.routeParams.p2);
        break;
      case 'material': {
        const material = window.academicDB.getMaterialById(this.routeParams.p1);
        const subject = material ? window.academicDB.getSubjectById(material.subject_id) : null;
        if (!material || !subject) {
          this.renderNotFound(mainContainer, 'المحاضرة أو المستند المطلوب غير موجود');
          break;
        }
        this.renderSubjectView(mainContainer, subject.id, material.category);
        if (material.youtube_url) {
          this.openVideoModal(material.id);
        } else {
          this.openPdfViewer(material.id);
        }
        break;
      }
      case 'about':
        this.renderAboutView(mainContainer);
        break;
      case 'contact':
        this.renderContactView(mainContainer);
        break;
      case 'admin':
        if (!window.academicDB.isLoggedIn()) {
          if (window.academicDB.authReady === false) {
            mainContainer.innerHTML = `
              <section class="max-w-xl mx-auto my-20 p-8 text-center glass-card rounded-3xl border border-slate-200 dark:border-slate-800" role="status" aria-live="polite">
                <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center mx-auto mb-4">
                  <i data-lucide="loader-circle" class="w-6 h-6 animate-spin"></i>
                </div>
                <p class="font-bold text-slate-800 dark:text-slate-200">جارٍ التحقق من جلسة الإدارة...</p>
              </section>
            `;
            this.refreshIcons();
            return;
          }
          this.showToast('عذراً، الوصول إلى لوحة الإدارة يتطلب تسجيل دخول كمسؤول معتمد.', 'warning');
          this.navigateTo('home');
          this.openAdminLoginModal();
          return;
        }
        this.renderAdminDashboard(mainContainer);
        break;
      default:
        this.renderNotFound(mainContainer, 'الصفحة المطلوبة غير موجودة');
        break;
    }

    this.updateNavActiveState();
    this.refreshIcons();
  },

  // تحديث حالة الروابط النشطة في شريط التنقل
  updateNavActiveState() {
    let currentYear = null;
    if (['year', 'stage', 'years', 'stages'].includes(this.currentRoute)) {
      currentYear = window.academicDB.getYearById(this.routeParams.p1);
    } else if (this.currentRoute === 'subject') {
      const subject = window.academicDB.getSubjectById(this.routeParams.p1);
      const semester = subject ? window.academicDB.getSemesterById(subject.semester_id) : null;
      currentYear = semester ? window.academicDB.getYearById(semester.year_id) : null;
    } else if (this.currentRoute === 'material') {
      const material = window.academicDB.getMaterialById(this.routeParams.p1);
      const subject = material ? window.academicDB.getSubjectById(material.subject_id) : null;
      const semester = subject ? window.academicDB.getSemesterById(subject.semester_id) : null;
      currentYear = semester ? window.academicDB.getYearById(semester.year_id) : null;
    } else {
      currentYear = window.academicDB.getYearById(this.currentRoute);
    }

    document.querySelectorAll('[data-nav-target]').forEach(link => {
      const target = link.getAttribute('data-nav-target');
      const targetYear = window.academicDB.getYearById(target);
      const isActive = Boolean(
        (target === 'home' && this.currentRoute === 'home') ||
        (currentYear && targetYear && currentYear.id === targetYear.id) ||
        (target === this.currentRoute)
      );
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    const stagesMenu = document.getElementById('desktop-stages-menu');
    const stagesSummary = stagesMenu?.querySelector('summary');
    if (stagesSummary) {
      stagesSummary.classList.toggle('is-active', Boolean(currentYear));
      if (currentYear) stagesSummary.setAttribute('aria-current', 'page');
      else stagesSummary.removeAttribute('aria-current');
    }
  },

  // ====================================================================
  // 1. عرض الصفحة الرئيسية (Homepage)
  // ====================================================================
  renderHomeView(container) {
    const years = window.academicDB.getYears();
    const totalSubjects = window.academicDB.data.subjects.length;
    const totalMaterials = window.academicDB.data.materials.length;

    container.innerHTML = `
      <!-- Hero Section (مستوحى من هندسة النفط والغاز، منصات الحفر، والتشكيلات الجيولوجية) -->
      <section class="relative overflow-hidden navy-hero-gradient text-white pt-12 pb-20 sm:pt-16 sm:pb-28 border-b border-amber-500/20 shadow-2xl">
        <!-- خلفية زخرفية هندسية وتشكيلات جيولوجية -->
        <div class="absolute inset-0 opacity-10 pointer-events-none">
          <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="none" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2,2"/>
            <path d="M0,80 Q25,60 50,75 T100,65 L100,100 L0,100 Z" fill="currentColor"/>
            <path d="M0,88 Q30,75 60,85 T100,80 L100,100 L0,100 Z" fill="currentColor" opacity="0.5"/>
          </svg>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div class="text-center max-w-3xl mx-auto">
            
            <!-- شارة القسم الرسمي -->
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-semibold mb-6 backdrop-blur-md">
              <i data-lucide="flame" class="w-4 h-4 text-amber-400"></i>
              <span>جامعة ذي قار • كلية الهندسة</span>
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>قسم هندسة النفط والغاز</span>
            </div>

            <!-- العنوان الرئيسي -->
            <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
              جامعة ذي قار<br>
              <span class="gold-gradient-text">كلية الهندسة</span><br>
              <span class="text-2xl sm:text-4xl text-slate-200 font-bold">قسم هندسة النفط والغاز</span>
            </h1>

            <!-- رسالة الترحيب -->
            <p class="text-lg sm:text-xl font-semibold text-amber-200/90 mb-4">
              "مرحباً بكم في المنصة التعليمية لطلبة قسم هندسة النفط والغاز"
            </p>

            <!-- الوصف المعتمد -->
            <p class="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8">
              منصة تعليمية تهدف إلى تنظيم المحاضرات والمواد الدراسية والمصادر العلمية لجميع المراحل الدراسية في قسم هندسة النفط والغاز.
            </p>

            <!-- حقل البحث السريع في الهيرو -->
            <div class="max-w-xl mx-auto mb-10">
              <div class="relative flex items-center bg-white/10 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-xl focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
                <i data-lucide="search" class="w-5 h-5 text-amber-400 mr-3 shrink-0"></i>
                <input 
                  type="text" 
                  id="hero-search-input"
                  placeholder="ابحث عن مادة، كود، محاضرة، أو مستند دراسي..." 
                  class="w-full bg-transparent border-none text-white placeholder-slate-300 focus:outline-none text-sm px-2 text-right"
                  onkeydown="if(event.key === 'Enter') App.openGlobalSearch(this.value)"
                >
                <button 
                  onclick="App.openGlobalSearch(document.getElementById('hero-search-input').value)"
                  class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95 shrink-0"
                >
                  بحث
                </button>
              </div>
            </div>

            <!-- إحصائيات سريعة للقسم -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-4 border-t border-white/10">
              <div class="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div class="text-2xl sm:text-3xl font-extrabold text-amber-400">4</div>
                <div class="text-xs text-slate-300 mt-1 font-medium">مراحل دراسية</div>
              </div>
              <div class="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div class="text-2xl sm:text-3xl font-extrabold text-amber-400">8</div>
                <div class="text-xs text-slate-300 mt-1 font-medium">فصول دراسية</div>
              </div>
              <div class="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div class="text-2xl sm:text-3xl font-extrabold text-amber-400">${totalSubjects}</div>
                <div class="text-xs text-slate-300 mt-1 font-medium">مادة دراسية معتمدة</div>
              </div>
              <div class="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div class="text-2xl sm:text-3xl font-extrabold text-amber-400">${totalMaterials}</div>
                <div class="text-xs text-slate-300 mt-1 font-medium">محاضرة ومستند متاح</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- الأقسام الدراسية الأربعة (Interactive Academic Stage Cards) -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-14 relative z-20 pb-16">
        <div class="text-center mb-8">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            الهيكل الأكاديمي للقسم
          </span>
          <h2 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            المراحل الدراسية الأكاديمية
          </h2>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
            اختر المرحلة الدراسية للاطلاع على الفصول والمواد والمحاضرات المقررة
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${years.map(year => {
            const semList = window.academicDB.getSemestersByYear(year.id);
            let subjectCount = 0;
            semList.forEach(s => {
              subjectCount += window.academicDB.getSubjectsBySemester(s.id).length;
            });

            return `
              <a 
                href="#/year/${year.id}"
                onclick="App.navigateTo('year/${year.id}'); return false;"
                class="stage-card glass-card rounded-2xl p-6 cursor-pointer border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 group flex flex-col justify-between block no-underline transition-all"
              >
                <div>
                  <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-900 via-blue-800 to-amber-600 flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform">
                    <i data-lucide="${year.icon || 'book-open'}" class="w-7 h-7 text-amber-300"></i>
                  </div>
                  
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      ${year.name_en}
                    </span>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      ${subjectCount > 0 ? `${subjectCount} مادة` : 'جاهزة للبيانات'}
                    </span>
                  </div>

                  <h3 class="text-xl font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    ${year.name_ar}
                  </h3>

                  <p class="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">
                    ${year.description}
                  </p>
                </div>

                <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span class="text-xs font-bold text-blue-700 dark:text-blue-400 group-hover:underline flex items-center gap-1">
                    <span>استعراض الفصول والمواد</span>
                    <i data-lucide="chevron-left" class="w-4 h-4 transition-transform group-hover:-translate-x-1"></i>
                  </span>
                  <div class="flex gap-1">
                    <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                  </div>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      </section>

      <!-- نبذة تعريفية سريعة عن القسم -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-slate-200 dark:border-slate-800">
        <div class="glass-card rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div class="lg:col-span-2">
              <span class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                رسالة وأهداف المنصة التعليمية
              </span>
              <h2 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-3 mb-4">
                بوابتك الأكاديمية الشاملة للتميز في هندسة النفط والغاز
              </h2>
              <p class="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                صُممت هذه المنصة لتوفر للطالب الجامعي وصولاً سهلاً ومباشراً إلى المناهج المعتمدة، المحاضرات النظرية والعملية، الملازم الدراسية، نماذج الامتحانات السابقة، والمصادر الهندسية التخصصية دون الحاجة إلى إنشاء حساب أو تسجيل دخول، مع الحفاظ على أعلى معايير التنظيم الأكاديمي.
              </p>
              <div class="flex flex-wrap gap-3">
                <button onclick="App.navigateTo('about')" class="px-5 py-2.5 rounded-xl bg-blue-900 dark:bg-blue-800 hover:bg-blue-800 dark:hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2">
                  <i data-lucide="info" class="w-4 h-4"></i>
                  <span>عن قسم هندسة النفط والغاز</span>
                </button>
                <button onclick="App.navigateTo('contact')" class="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition-all flex items-center gap-2">
                  <i data-lucide="mail" class="w-4 h-4"></i>
                  <span>تواصل مع رئاسة القسم</span>
                </button>
              </div>
            </div>

            <!-- بطاقة ميزات هندسية -->
            <div class="space-y-3">
              <div class="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <i data-lucide="file-text" class="w-5 h-5"></i>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-slate-900 dark:text-white">قارئ PDF مدمج</h4>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">قراءة المحاضرات والملازم مباشرة داخل المنصة بدون الحاجة لمغادرة الموقع.</p>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <i data-lucide="download" class="w-5 h-5"></i>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-slate-900 dark:text-white">تحميل مباشر وفوري</h4>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">تحميل الملازم والمصادر بصيغة PDF بضغطة زر واحدة لجميع الطلبة.</p>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <i data-lucide="shield-check" class="w-5 h-5"></i>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-slate-900 dark:text-white">إدارة أكاديمية مؤمنة</h4>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">لوحة تحكم خاصة للأساتذة والمسؤولين لإضافة وتحديث المناهج باستمرار.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  // ====================================================================
  // 2. عرض صفحة المرحلة والفصل الدراسي (Year & Semester View)
  // ====================================================================
  getSemesterRouteParam() {
    const first = String(this.routeParams.p2 || '').toLowerCase();
    if (['semester', 'semesters', 'course', 'term'].includes(first)) {
      return this.routeParams.p3;
    }
    return this.routeParams.p2;
  },

  getDirectYearSemesterRouteParam() {
    const first = String(this.routeParams.p1 || '').toLowerCase();
    if (['semester', 'semesters', 'course', 'term'].includes(first)) {
      return this.routeParams.p2;
    }
    return this.routeParams.p1;
  },

  resolveSemesterForYear(year, semesterRef, semesters) {
    if (!semesterRef) return semesters[0] || null;
    const reference = String(semesterRef).trim().toLowerCase();
    const exact = semesters.find(semester => String(semester.id).trim().toLowerCase() === reference);
    if (exact) return exact;

    const explicitId = reference.match(/^sem[-_](\d+)[-_](\d+)$/);
    if (explicitId) {
      if (Number(explicitId[1]) !== Number(year.display_order)) return null;
      return semesters.find(semester => Number(semester.display_order) === Number(explicitId[2])) || null;
    }

    const aliases = {
      '1': 1, 'first': 1, 'first-semester': 1, 'first-course': 1,
      'semester-1': 1, 'sem-1': 1, 'course-1': 1, 'term-1': 1,
      'الأول': 1, 'الاول': 1, 'الكورس-الأول': 1, 'الكورس-الاول': 1, 'الفصل-الأول': 1, 'الفصل-الاول': 1,
      '2': 2, 'second': 2, 'second-semester': 2, 'second-course': 2,
      'semester-2': 2, 'sem-2': 2, 'course-2': 2, 'term-2': 2,
      'الثاني': 2, 'الكورس-الثاني': 2, 'الفصل-الثاني': 2
    };
    let order = aliases[reference];
    if (!order) {
      const prefixedOrder = reference.match(/^(?:semester|sem|course|term)[-_ ]?([12])$/);
      const arabicOrder = reference.match(/^(?:الكورس|الفصل)(?:[-_ ]?الدراسي)?[-_ ]?(الأول|الاول|الثاني|[12])$/);
      if (prefixedOrder) order = Number(prefixedOrder[1]);
      else if (arabicOrder) order = aliases[arabicOrder[1]] || Number(arabicOrder[1]);
    }
    return order
      ? semesters.find(semester => Number(semester.display_order) === order) || null
      : null;
  },

  renderYearView(container, yearId, selectedSemId = null) {
    const year = window.academicDB.getYearById(yearId);
    if (!year) {
      this.renderNotFound(container, 'المرحلة الدراسية المطلوبة غير موجودة');
      return;
    }

    const semesters = window.academicDB.getSemestersByYear(year.id);
    if (semesters.length === 0) {
      container.innerHTML = `
        <section class="max-w-2xl mx-auto my-16 p-8 text-center glass-card rounded-3xl border border-slate-200 dark:border-slate-800">
          <h1 class="text-xl font-black text-slate-900 dark:text-white">${year.name_ar}</h1>
          <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">لا توجد فصول دراسية مرتبطة بهذه المرحلة حالياً.</p>
          <button type="button" onclick="App.navigateTo('home')" class="mt-5 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">العودة إلى المراحل</button>
        </section>
      `;
      return;
    }

    const activeSem = this.resolveSemesterForYear(year, selectedSemId, semesters);
    if (!activeSem) {
      this.renderNotFound(container, 'الكورس الدراسي المطلوب غير موجود');
      return;
    }

    const subjects = activeSem ? window.academicDB.getSubjectsBySemester(activeSem.id) : [];

    container.innerHTML = `
      <!-- Breadcrumbs Navigation -->
      <div class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <a href="#/" class="hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1">
              <i data-lucide="home" class="w-3.5 h-3.5"></i>
              <span>الرئيسية</span>
            </a>
            <i data-lucide="chevron-left" class="w-3.5 h-3.5 text-slate-400"></i>
            <span class="text-slate-800 dark:text-slate-200 font-bold">${year.name_ar}</span>
            ${activeSem ? `
              <i data-lucide="chevron-left" class="w-3.5 h-3.5 text-slate-400"></i>
              <span class="text-amber-600 dark:text-amber-400 font-bold">${activeSem.name_ar}</span>
            ` : ''}
          </nav>
        </div>
      </div>

      <!-- Header Section -->
      <div class="navy-hero-gradient text-white py-10 border-b border-amber-500/20 shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-400/30">
                <i data-lucide="${year.icon || 'graduation-cap'}" class="w-4 h-4"></i>
                <span>${year.name_en}</span>
              </div>
              <h1 class="text-2xl sm:text-4xl font-black text-white">
                ${year.name_ar}
              </h1>
              <p class="text-sm text-slate-300 mt-1 max-w-2xl">
                ${year.description}
              </p>
            </div>

            <!-- أزرار اختيار الكورس الدراسي (الكورس الأول / الكورس الثاني) -->
            <div class="flex items-center gap-2 p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 self-start md:self-auto">
              ${semesters.map(sem => {
                const isActive = sem.id === activeSem.id;
                return `
                  <button 
                    onclick="App.navigateTo('year/${year.id}/${sem.id}')"
                    class="px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      isActive 
                        ? 'bg-amber-500 text-slate-950 shadow-md scale-102' 
                        : 'text-white hover:bg-white/10'
                    }"
                  >
                    ${sem.name_ar}
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- المحتوى الرئيسي: عرض مواد الكورس المختار -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="book-open" class="w-6 h-6 text-amber-500"></i>
              <span>مواد ${activeSem.name_ar}</span>
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              عدد المواد المقررة: ${subjects.length} مادة
            </p>
          </div>

          <!-- زر إدارة المواد إذا كان الأدمن مسجل الدخول -->
          ${window.academicDB.isLoggedIn() ? `
            <button 
              onclick="App.openAddSubjectModal('${activeSem.id}')"
              class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
              <span>إضافة مادة لهذا الكورس</span>
            </button>
          ` : ''}
        </div>

        <!-- حالة المرحلة الثالثة والرابعة (أو الكورسات الفارغة) -->
        ${subjects.length === 0 ? `
          <div class="glass-card rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 max-w-2xl mx-auto my-12">
            <div class="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
              <i data-lucide="clock" class="w-10 h-10"></i>
            </div>
            <h3 class="text-xl font-black text-slate-900 dark:text-white mb-2">
              سيتم إضافة المواد الدراسية قريباً
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              يجري حالياً إعداد واعتماد المناهج والمحاضرات الخاصة بـ ${year.name_ar} (${activeSem.name_ar}) من قبل اللجنة العلمية لقسم هندسة النفط والغاز.
            </p>
            ${window.academicDB.isLoggedIn() ? `
              <div class="mt-6">
                <button 
                  onclick="App.openAddSubjectModal('${activeSem.id}')"
                  class="px-5 py-2.5 rounded-xl bg-blue-900 text-white font-bold text-xs hover:bg-blue-800 transition-all inline-flex items-center gap-2"
                >
                  <i data-lucide="plus" class="w-4 h-4"></i>
                  <span>إضافة مادة الآن من لوحة الإدارة</span>
                </button>
              </div>
            ` : `
              <div class="mt-6 text-xs text-slate-500">
                يمكن للمسؤولين إضافة المواد والمحاضرات عبر لوحة التحكم.
              </div>
            `}
          </div>
        ` : `
          <!-- شبكة بطاقات المواد المعتمدة (Interactive Subject Cards) -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${subjects.map((sub, idx) => {
              const materials = window.academicDB.getMaterialsBySubject(sub.id);
              const lecturesCount = materials.filter(m => m.category === 'lectures').length;

              return `
                <a 
                  href="#/subject/${sub.id}"
                  onclick="App.navigateTo('subject/${sub.id}'); return false;"
                  class="academic-card glass-card rounded-2xl p-6 cursor-pointer border border-slate-200 dark:border-slate-800 flex flex-col justify-between group block no-underline transition-all"
                >
                  <div>
                    <div class="flex items-start justify-between gap-3 mb-4">
                      <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform border border-blue-100 dark:border-blue-900">
                        <i data-lucide="${sub.icon || 'book-open'}" class="w-6 h-6 text-amber-500"></i>
                      </div>
                      <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        ${sub.code || `PGE-${idx + 1}`}
                      </span>
                    </div>

                    <h3 class="text-lg font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      ${sub.name}
                    </h3>
                    
                    ${sub.name_ar && sub.name_ar !== sub.name ? `
                      <p class="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                        ${sub.name_ar}
                      </p>
                    ` : ''}

                    <p class="text-xs text-slate-600 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                      ${sub.description || 'المفاهيم والتطبيقات الهندسية المعتمدة للمادة المقررة.'}
                    </p>
                  </div>

                  <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                    <span class="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span class="flex items-center gap-1" title="فيديوهات YouTube">
                        <i data-lucide="youtube" class="w-3.5 h-3.5 text-red-500"></i>
                        <span>${lecturesCount}</span>
                      </span>
                      <span>•</span>
                      <span class="flex items-center gap-1" title="إجمالي الملفات">
                        <i data-lucide="file-text" class="w-3.5 h-3.5 text-blue-500"></i>
                        <span>${materials.length} ملف</span>
                      </span>
                    </span>
                    <span class="text-blue-700 dark:text-amber-400 group-hover:underline flex items-center gap-1">
                      <span>YouTube Videos • دخول</span>
                      <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                    </span>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  // ====================================================================
  // 3. عرض صفحة المادة الدراسية المخصصة (Dedicated Subject Page)
  // ====================================================================
  renderSubjectView(container, subjectId, categoryId = 'lectures') {
    const validCategory = MATERIAL_CATEGORIES.some(category => category.id === categoryId);
    this.activeCategoryTab = validCategory ? categoryId : 'lectures';
    const subject = window.academicDB.getSubjectById(subjectId);
    if (!subject) {
      this.renderNotFound(container, 'المادة الدراسية المطلوبة غير موجودة');
      return;
    }

    const semester = window.academicDB.getSemesterById(subject.semester_id);
    const year = semester ? window.academicDB.getYearById(semester.year_id) : null;

    const materials = window.academicDB.getMaterialsBySubject(subject.id, this.activeCategoryTab);
    const allMaterials = window.academicDB.getMaterialsBySubject(subject.id);

    container.innerHTML = `
      <!-- Breadcrumbs Navigation -->
      <div class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 overflow-x-auto whitespace-nowrap">
            <a href="#/" class="hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1">
              <i data-lucide="home" class="w-3.5 h-3.5"></i>
              <span>الرئيسية</span>
            </a>
            ${year ? `
              <i data-lucide="chevron-left" class="w-3.5 h-3.5 text-slate-400"></i>
              <a href="#/year/${year.id}" class="hover:text-amber-600 dark:hover:text-amber-400">${year.name_ar}</a>
            ` : ''}
            ${semester ? `
              <i data-lucide="chevron-left" class="w-3.5 h-3.5 text-slate-400"></i>
              <a href="#/year/${year.id}/${semester.id}" class="hover:text-amber-600 dark:hover:text-amber-400">${semester.name_ar}</a>
            ` : ''}
            <i data-lucide="chevron-left" class="w-3.5 h-3.5 text-slate-400"></i>
            <span class="text-amber-600 dark:text-amber-400 font-bold">${subject.name}</span>
          </nav>
        </div>
      </div>

      <!-- Subject Header -->
      <div class="navy-hero-gradient text-white py-10 border-b border-amber-500/20 shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div class="flex items-center gap-3 mb-2 flex-wrap">
                <span class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-400/30">
                  ${subject.code || 'PGE'}
                </span>
                ${year ? `
                  <span class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 text-slate-200">
                    ${year.name_ar}
                  </span>
                ` : ''}
                ${semester ? `
                  <span class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 text-slate-200">
                    ${semester.name_ar}
                  </span>
                ` : ''}
              </div>

              <h1 class="text-2xl sm:text-4xl font-black text-white mt-1">
                ${subject.name}
              </h1>

              ${subject.name_ar && subject.name_ar !== subject.name ? `
                <p class="text-sm font-bold text-amber-300 mt-1">
                  ${subject.name_ar}
                </p>
              ` : ''}

              <p class="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                ${subject.description || 'مفردات ومحاضرات المادة المعتمدة لطلبة قسم هندسة النفط والغاز في كلية الهندسة - جامعة ذي قار.'}
              </p>
            </div>

            <!-- أزرار الإجراءات الخاصة بالمسؤول -->
            <div class="flex items-center gap-2 self-start md:self-center shrink-0">
              ${window.academicDB.isLoggedIn() ? `
                <button 
                  onclick="App.openUploadModal('${subject.id}')"
                  class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all"
                >
                  <i data-lucide="upload" class="w-4 h-4"></i>
                  <span>رفع مستند / محاضرة</span>
                </button>
                <button 
                  onclick="App.openEditSubjectModal('${subject.id}')"
                  class="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all inline-flex items-center gap-2"
                  title="تعديل بيانات المادة"
                  aria-label="تعديل بيانات المادة"
                >
                  <i data-lucide="edit-3" class="w-4 h-4"></i>
                  <span>تعديل المادة</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- تبويبات الأقسام الخمسة المعتمدة (Tabbed Interface) -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
          <div class="flex space-x-2 space-x-reverse min-w-max pb-1">
            ${MATERIAL_CATEGORIES.map(cat => {
              const count = allMaterials.filter(m => m.category === cat.id).length;
              const isActive = this.activeCategoryTab === cat.id;

              return `
                <button 
                  onclick="App.switchCategoryTab('${subject.id}', '${cat.id}')"
                  class="tab-btn px-4 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 border border-transparent ${
                    isActive ? 'active' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }"
                >
                  <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
                  <span>${cat.label_ar}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }">
                    ${count}
                  </span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- شريط الإجراءات لقسم فيديوهات YouTube -->
        ${this.activeCategoryTab === 'lectures' ? `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/25 border border-red-200/80 dark:border-red-900/40">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <i data-lucide="youtube" class="w-5 h-5"></i>
              </div>
              <div>
                <h4 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white">فيديوهات وشروحات YouTube</h4>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">يمكنك مشاهدة الفيديوهات مباشرة من المنصة أو فتحها على YouTube</p>
              </div>
            </div>
            ${window.academicDB.isLoggedIn() ? `
              <button 
                onclick="App.openUploadModal('${subject.id}', 'lectures')"
                class="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
              >
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>إضافة رابط فيديو YouTube</span>
              </button>
            ` : ''}
          </div>
        ` : ''}

        <!-- محتوى القسم المحدد -->
        <div>
          ${materials.length === 0 ? `
            <div class="glass-card rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 max-w-lg mx-auto my-8">
              <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <i data-lucide="${this.activeCategoryTab === 'lectures' ? 'youtube' : 'folder-open'}" class="w-8 h-8 ${this.activeCategoryTab === 'lectures' ? 'text-red-500' : ''}"></i>
              </div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white mb-1">
                ${this.activeCategoryTab === 'lectures' ? 'لا توجد فيديوهات YouTube مضافة حالياً' : 'لا توجد ملفات مضافة في هذا القسم حالياً'}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                ${this.activeCategoryTab === 'lectures' ? 'اضغط على زر إضافة فيديو YouTube لوضع رابط المحاضرة أو الشرح التعليمي.' : 'سيتم رفع وتحديث الملفات والمصادر التعليمية من قبل أساتذة المادة.'}
              </p>
              ${window.academicDB.isLoggedIn() ? `
                <button 
                  onclick="App.openUploadModal('${subject.id}', '${this.activeCategoryTab}')"
                  class="mt-4 px-4 py-2.5 rounded-xl ${this.activeCategoryTab === 'lectures' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-slate-950'} font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 active:scale-95"
                >
                  <i data-lucide="plus" class="w-4 h-4"></i>
                  <span>${this.activeCategoryTab === 'lectures' ? 'إضافة فيديو YouTube لهذه المادة' : 'رفع أول مستند في هذا القسم'}</span>
                </button>
              ` : ''}
            </div>
          ` : `
            <!-- قائمة المستندات والمحاضرات والفيديوهات -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${materials.map((mat, idx) => {
                const isLecture = mat.category === 'lectures';
                const isYt = Boolean(mat.youtube_url) || isLecture;
                const ytId = mat.youtube_url ? App.getYouTubeId(mat.youtube_url) : null;
                const lectureBadge = mat.lecture_number ? `Part ${mat.lecture_number}` : (isLecture ? `Video ${idx + 1}` : null);

                return `
                  <div class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between group">
                    <div>
                      ${ytId ? `
                        <!-- معاينة وصورة مصغرة لفيديو YouTube -->
                        <div 
                          onclick="App.navigateTo('material/${mat.id}')"
                          class="relative w-full aspect-video rounded-xl overflow-hidden mb-3.5 bg-black cursor-pointer group/thumb border border-slate-700/60 shadow-sm"
                        >
                          <img 
                            src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" 
                            alt="${mat.title}"
                            class="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                            loading="lazy"
                          >
                          <div class="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                            <div class="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl group-hover/thumb:scale-110 transition-transform">
                              <i data-lucide="play" class="w-6 h-6 fill-white"></i>
                            </div>
                          </div>
                        </div>
                      ` : ''}

                      <div class="flex items-start justify-between gap-3 mb-2">
                        <div class="flex items-center gap-2">
                          <div class="w-10 h-10 rounded-xl ${isYt ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'} flex items-center justify-center shrink-0">
                            <i data-lucide="${isYt ? 'youtube' : 'file-text'}" class="w-5 h-5"></i>
                          </div>
                          <div>
                            ${lectureBadge ? `
                              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded ${isYt ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'}">
                                ${isYt ? `YouTube • ${lectureBadge}` : lectureBadge}
                              </span>
                            ` : `
                              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                ${isYt ? 'فيديو YouTube' : 'مستند دراسي'}
                              </span>
                            `}
                            <span class="text-xs text-slate-400 mr-2">${mat.file_size || (isYt ? 'YouTube' : 'PDF')}</span>
                          </div>
                        </div>

                        <!-- قائمة إجراءات المسؤول إذا كان مسجلاً -->
                        ${window.academicDB.isLoggedIn() ? `
                          <div class="flex items-center gap-1">
                            <button 
                              onclick="App.openEditMaterialModal('${mat.id}')"
                              class="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="تعديل العنوان"
                            >
                              <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                            </button>
                            <button 
                              onclick="App.deleteMaterialPrompt('${mat.id}', '${subject.id}')"
                              class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="حذف"
                            >
                              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                          </div>
                        ` : ''}
                      </div>

                      <h4 class="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        ${mat.title}
                      </h4>

                      ${mat.description ? `
                        <p class="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                          ${mat.description}
                        </p>
                      ` : ''}

                      <div class="flex items-center gap-3 text-xs text-slate-400 mt-3">
                        <span class="flex items-center gap-1">
                          <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                          <span>${mat.upload_date || '2026-10-01'}</span>
                        </span>
                        <span>•</span>
                        <span class="font-mono">${mat.youtube_url ? 'YouTube Video' : (mat.file_name || 'document.pdf')}</span>
                      </div>
                    </div>

                    <!-- أزرار المشاهدة أو التحميل -->
                    <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      ${mat.youtube_url ? `
                        <button 
                          onclick="App.navigateTo('material/${mat.id}')"
                          class="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                        >
                          <i data-lucide="play" class="w-4 h-4 fill-white"></i>
                          <span>مشاهدة الفيديو</span>
                        </button>

                        <a 
                          href="${mat.youtube_url}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                          title="فتح في YouTube"
                        >
                          <i data-lucide="external-link" class="w-4 h-4"></i>
                          <span class="hidden sm:inline">YouTube</span>
                        </a>
                      ` : `
                        <button 
                          onclick="App.navigateTo('material/${mat.id}')"
                          class="flex-1 py-2 rounded-xl bg-blue-900 dark:bg-blue-800 hover:bg-blue-800 dark:hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                          <i data-lucide="eye" class="w-4 h-4"></i>
                          <span>قراءة المستند</span>
                        </button>

                        <button 
                          onclick="App.downloadPdf('${mat.id}')"
                          class="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                          title="تحميل ملف PDF"
                        >
                          <i data-lucide="download" class="w-4 h-4"></i>
                          <span class="hidden sm:inline">تحميل</span>
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  },

  switchCategoryTab(subjectId, categoryId) {
    if (!MATERIAL_CATEGORIES.some(category => category.id === categoryId)) return;
    this.navigateTo(`subject/${subjectId}/${categoryId}`);
  },

  // ====================================================================
  // 4. قارئ الـ PDF المدمج (Integrated PDF Viewer Modal)
  // ====================================================================
  getMaterialFileUrl(material) {
    if (!material) return null;
    const source = material.file_data_url || material.public_url || material.file_path;
    if (!source || source === 'youtube') return null;
    if (/^(?:https?:|data:|blob:)/i.test(source)) return source;

    const client = window.academicDB && window.academicDB.client;
    if (client && client.storage) {
      try {
        const { data } = client.storage.from('academic-materials').getPublicUrl(source.replace(/^\/+/, ''));
        if (data && data.publicUrl) return data.publicUrl;
      } catch (err) {
        console.warn('Could not resolve academic file from Supabase Storage:', err);
      }
    }

    try {
      return new URL(source, document.baseURI).href;
    } catch (err) {
      return null;
    }
  },

  async isMaterialFileAvailable(url) {
    if (/^(?:data:|blob:)/i.test(url)) return true;
    try {
      const parsed = new URL(url);
      if (parsed.origin !== window.location.origin) return true;
      const response = await fetch(parsed.href, { method: 'HEAD', cache: 'no-store' });
      return response.ok;
    } catch (err) {
      return false;
    }
  },

  async openPdfViewer(materialId) {
    const openedFromMaterialRoute = this.currentRoute === 'material' && this.routeParams.p1 === materialId;
    const mat = window.academicDB.getMaterialById(materialId);
    if (!mat) {
      this.showToast('تعذر العثور على المستند المطلوب', 'error');
      return;
    }

    const targetUrl = this.getMaterialFileUrl(mat);
    if (!targetUrl) {
      this.showToast('رابط هذا المستند غير متوفر حالياً', 'error');
      return;
    }

    this.currentViewingPdf = mat;
    const modal = document.getElementById('pdf-viewer-modal');
    const titleEl = document.getElementById('pdf-modal-title');
    const sizeEl = document.getElementById('pdf-modal-size');
    const viewport = document.getElementById('pdf-modal-viewport');

    if (titleEl) titleEl.textContent = mat.title;
    if (sizeEl) sizeEl.textContent = `${mat.file_name || 'document.pdf'} (${mat.file_size || 'PDF'})`;

    // Check same-origin paths so missing files do not become broken 404 iframes.
    const fileUnavailable = !(await this.isMaterialFileAvailable(targetUrl));
    if (openedFromMaterialRoute && (this.currentRoute !== 'material' || this.routeParams.p1 !== materialId)) return;

    if (viewport) {
      viewport.innerHTML = fileUnavailable ? `
        <div class="h-full min-h-64 flex flex-col items-center justify-center text-center text-white p-8">
          <i data-lucide="file-warning" class="w-10 h-10 text-amber-400 mb-3"></i>
          <h4 class="font-bold mb-2">ملف المستند غير متاح على الموقع</h4>
          <p class="text-sm text-slate-300">احتفظنا ببيانات المستند، لكن مساره الحالي لا يشير إلى ملف منشور. يرجى إعادة ربطه بملف التخزين المعتمد.</p>
        </div>
      ` : `
        <object 
          data="${targetUrl}" 
          type="application/pdf" 
          class="w-full h-full"
        >
          <iframe 
            src="${targetUrl}" 
            class="w-full h-full" 
            frameborder="0"
          >
            <div class="p-8 text-center text-white">
              <p class="mb-4">المتصفح لا يدعم العرض المباشر لملفات PDF ضمن هذا الإطار.</p>
              <a href="${targetUrl}" download="${mat.file_name || 'document.pdf'}" class="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl inline-block">
                تحميل المستند الآن
              </a>
            </div>
          </iframe>
        </object>
      `;
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    this.refreshIcons();
  },

  closePdfViewer() {
    const modal = document.getElementById('pdf-viewer-modal');
    const viewport = document.getElementById('pdf-modal-viewport');
    if (viewport) viewport.innerHTML = '';
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.currentViewingPdf = null;
    this.returnToSubjectFromMaterialRoute();
  },

  downloadCurrentPdf() {
    if (this.currentViewingPdf) {
      this.downloadPdf(this.currentViewingPdf.id);
    }
  },

  async downloadPdf(materialId) {
    const mat = window.academicDB.getMaterialById(materialId);
    if (!mat) return;

    const targetUrl = this.getMaterialFileUrl(mat);
    if (!targetUrl) {
      this.showToast('رابط هذا المستند غير متوفر حالياً', 'error');
      return;
    }

    if (!(await this.isMaterialFileAvailable(targetUrl))) {
      this.showToast('ملف المستند غير منشور على الموقع حالياً', 'error');
      return;
    }
    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = mat.file_name || `${mat.title.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`بدأ تحميل ${mat.file_name || 'المستند'} بنجاح`, 'success');
  },

  // ====================================================================
  // 5. صفحة "عن القسم" (About Department - Editable Placeholder)
  // ====================================================================
  renderAboutView(container) {
    container.innerHTML = `
      <div class="navy-hero-gradient text-white py-12 border-b border-amber-500/20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-400/30">
            <i data-lucide="info" class="w-4 h-4"></i>
            <span>كلية الهندسة • جامعة ذي قار</span>
          </div>
          <h1 class="text-3xl sm:text-5xl font-black text-white">
            عن قسم هندسة النفط والغاز
          </h1>
          <p class="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl">
            معلومات تعريفية بالقسم والبرنامج الأكاديمي لإعداد كوادر هندسية وطنية متخصصة
          </p>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-8">
            <div class="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
              <h2 class="text-xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <i data-lucide="target" class="w-5 h-5 text-amber-500"></i>
                <span>الرؤية والرسالة الأكاديمية</span>
              </h2>
              <div class="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  <strong>الرؤية:</strong> يطمح قسم هندسة النفط والغاز في كلية الهندسة - جامعة ذي قار إلى الريادة والتميز في التعليم الهندسي التخصصي والبحث العلمي وتخريج مهندسين أكفاء يواكبون أحدث التطورات التكنولوجية في استكشاف وتطوير حقول النفط والغاز.
                </p>
                <p>
                  <strong>الرسالة:</strong> تأهيل كوادر هندسية قادرة على تلبية احتياجات الصناعة النفطية الوطنية والعالمية من خلال توفير بيئة تعليمية محفزة للبحث والابتكار، مع الالتزام بأعلى معايير السلامة المهنية وحماية البيئة.
                </p>
              </div>
            </div>

            <div class="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
              <h2 class="text-xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <i data-lucide="flask-conical" class="w-5 h-5 text-amber-500"></i>
                <span>المختبرات والورش الهندسية</span>
              </h2>
              <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                يضم القسم مختبرات تخصصية تسهم في ربط الجانب النظري بالتطبيق العملي في الصناعة النفطية:
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <i data-lucide="check-circle-2" class="w-4 h-4 text-amber-500"></i>
                  <span>مختبر خواص الصخور والموائع (Petrophysics Lab)</span>
                </div>
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <i data-lucide="check-circle-2" class="w-4 h-4 text-amber-500"></i>
                  <span>مختبر سوائل الحفر والتسميت (Drilling Fluids Lab)</span>
                </div>
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <i data-lucide="check-circle-2" class="w-4 h-4 text-amber-500"></i>
                  <span>مختبر الجيولوجيا وعينات اللباب الصخري (Geology Lab)</span>
                </div>
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <i data-lucide="check-circle-2" class="w-4 h-4 text-amber-500"></i>
                  <span>مختبر المحاكاة الحاسوبية والبرمجة (Simulation Lab)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- بطاقة جانبية -->
          <div>
            <div class="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 sticky top-24">
              <h3 class="text-base font-black text-slate-900 dark:text-white mb-3">
                بيانات الاعتماد والصفة
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                تعد هذه الصفحة قالب معلومات تعريفي بالقسم. يمكن تعديل البيانات لاحقاً من قبل رئاسة القسم عبر لوحة التحكم.
              </p>
              <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                <p class="font-bold mb-1">ملاحظة تنظيمية:</p>
                <p>لا يتم عرض أي أسماء أعضاء هيئة تدريسية أو معلومات غير معتمدة رسمياً بدون ترخيص مسبق.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- قسم تواصل مع منشئ المنصة -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div class="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <i data-lucide="user" class="w-7 h-7 text-white"></i>
              </div>
              <div>
                <span class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                  المطوّر والمنشئ
                </span>
                <h3 class="text-xl font-black text-slate-900 dark:text-white mt-2">علي محمد جاسم</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ali Mohammed Jasim — مطوّر ومنشئ المنصة التعليمية</p>
              </div>
            </div>
            <div class="flex items-center gap-3 flex-wrap">
              <a href="https://www.linkedin.com/in/ali-mohammed05" target="_blank" rel="noopener noreferrer"
                 class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
                 style="background:#0a66c2;color:#fff;">
                <i data-lucide="external-link" class="w-4 h-4"></i>
                <span>LinkedIn</span>
              </a>
              <a href="https://www.instagram.com/c3.91?fqnt=MTZ0b2plYXZjMHhnOQ==" target="_blank" rel="noopener noreferrer"
                 class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
                 style="background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:#fff;">
                <i data-lucide="camera" class="w-4 h-4"></i>
                <span>Instagram</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- رمز QR للموقع -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div class="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div class="flex flex-col sm:flex-row items-center gap-8">
            <div class="flex-1 order-2 sm:order-1">
              <span class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                رمز QR للمنصة
              </span>
              <h3 class="text-xl font-black text-slate-900 dark:text-white mt-3 mb-1">مشاركة المنصة</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                امسح رمز QR بكاميرا هاتفك للوصول السريع إلى المنصة، أو شارك الرابط مع زملائك.
              </p>
              <div class="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <i data-lucide="link" class="w-4 h-4 text-amber-500 flex-shrink-0"></i>
                <span id="site-url-display" class="text-xs text-slate-600 dark:text-slate-300 font-mono break-all select-all">PGE-ThiQar</span>
              </div>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-2">
                💡 اسم الموقع للبحث: <strong class="text-amber-600 dark:text-amber-400">PGE-ThiQar</strong>
              </p>
            </div>
            <div class="order-1 sm:order-2 flex flex-col items-center gap-3">
              <div id="about-qr-code" class="p-3 bg-white rounded-2xl shadow-lg border-2 border-amber-400/40"></div>
              <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">امسح للدخول</span>
            </div>
          </div>
        </div>
      </div>
    `;
    this.refreshIcons();
    // Generate QR code after render
    setTimeout(() => {
      const qrEl = document.getElementById('about-qr-code');
      const urlEl = document.getElementById('site-url-display');
      if (qrEl && typeof QRCode !== 'undefined') {
        const siteUrl = 'https://engpe23m24-eng.github.io/pge-thiqar';
        if (urlEl) urlEl.textContent = siteUrl;
        qrEl.innerHTML = '';
        new QRCode(qrEl, {
          text: siteUrl,
          width: 160,
          height: 160,
          colorDark: '#0a192f',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      }
    }, 150);
  },

  // ====================================================================
  // 6. صفحة "تواصل معنا" (Contact Page - Editable Placeholder)
  // ====================================================================
  renderContactView(container) {
    container.innerHTML = `
      <div class="navy-hero-gradient text-white py-12 border-b border-amber-500/20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-400/30">
            <i data-lucide="mail" class="w-4 h-4"></i>
            <span>استفسارات الطلبة والباحثين</span>
          </div>
          <h1 class="text-3xl sm:text-5xl font-black text-white">
            تواصل معنا
          </h1>
          <p class="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl">
            قنوات الاتصال المعتمدة مع رئاسة قسم هندسة النفط والغاز - كلية الهندسة
          </p>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          <!-- استمارة إرسال استفسار -->
          <div class="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
            <h2 class="text-xl font-black text-slate-900 dark:text-white mb-2">
              إرسال استفسار أكاديمي
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">
              يمكنك كتابة استفسارك حول المناهج، المحاضرات، أو الشؤون الدراسية.
            </p>

            <form onsubmit="App.handleContactSubmit(event)" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الطالب / المستفسر</label>
                <input 
                  type="text" 
                  required 
                  placeholder="الاسم الثلاثي..." 
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المرحلة الدراسية</label>
                  <select class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option>المرحلة الأولى</option>
                    <option>المرحلة الثانية</option>
                    <option>المرحلة الثالثة</option>
                    <option>المرحلة الرابعة</option>
                    <option>خريج / أخرى</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نوع الاستفسار</label>
                  <select class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option>استفسار عن محاضرة</option>
                    <option>ملزمة أو مصدر دراسي</option>
                    <option>أسئلة امتحانات سابقة</option>
                    <option>مقترح أو ملاحظة</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نص الرسالة</label>
                <textarea 
                  rows="4" 
                  required 
                  placeholder="اكتب استفسارك هنا بكل وضوح..."
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                ></textarea>
              </div>

              <button 
                type="submit" 
                class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95"
              >
                إرسال الاستفسار
              </button>
            </form>
          </div>

          <!-- بيانات التواصل والموقع الجغرافي -->
          <div class="space-y-6">

            <div class="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/20">
              <div class="flex items-start gap-3">
                <i data-lucide="shield-alert" class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"></i>
                <div>
                  <h4 class="text-xs font-bold text-amber-900 dark:text-amber-200">تنويه بخصوص بيانات الاتصال</h4>
                  <p class="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1 leading-relaxed">
                    هذه الحقول هي بيانات استرشادية، ويمكن لمسؤولي القسم تحديث البريد الإلكتروني وأرقام البدالة الرسمية فور تزويدنا بها من إدارة الجامعة.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  handleContactSubmit(e) {
    e.preventDefault();
    this.showToast('تم استلام استفسارك بنجاح! سيتم التواصل معك عبر القسم.', 'success');
    e.target.reset();
  },

  // ====================================================================
  // 7. لوحة تحكم الإدارة (Administration Dashboard)
  // ====================================================================
  renderAdminDashboard(container) {
    if (!window.academicDB.isLoggedIn()) {
      this.openAdminLoginModal();
      return;
    }

    const totalSubjects = window.academicDB.data.subjects.length;
    const totalMaterials = window.academicDB.data.materials.length;
    const adminMaterials = window.academicDB.data.materials;
    const years = window.academicDB.getYears();

    container.innerHTML = `
      <div class="navy-hero-gradient text-white py-10 border-b border-amber-500/20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-2 border border-amber-400/30">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
                <span>لوحة التحكم الأكاديمية للمسؤولين</span>
              </div>
              <h1 class="text-2xl sm:text-4xl font-black text-white">
                إدارة المنصة التعليمية
              </h1>
              <p class="text-xs sm:text-sm text-slate-300 mt-1">
                التحكم بالمواد الدراسية، رفع المحاضرات، إدارة الفصول، وتحديث المستندات
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button 
                onclick="App.openUploadModal()"
                class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all"
              >
                <i data-lucide="upload" class="w-4 h-4"></i>
                <span>رفع محاضرة / مستند</span>
              </button>
              <button 
                onclick="App.openAddSubjectModal()"
                class="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all"
              >
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>إضافة مادة</span>
              </button>
              <button 
                onclick="App.logoutAdmin()"
                class="p-2.5 rounded-xl bg-red-600/80 hover:bg-red-700 text-white text-xs font-bold transition-all"
                title="تسجيل الخروج"
              >
                <i data-lucide="log-out" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        
        <!-- بطاقات الإحصائيات -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المواد</span>
              <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <i data-lucide="book-open" class="w-5 h-5"></i>
              </div>
            </div>
            <div class="text-3xl font-black text-slate-900 dark:text-white mt-2">${totalSubjects}</div>
            <div class="text-xs text-slate-400 mt-1">مادة موزعة على 4 مراحل</div>
          </div>

          <div class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المحاضرات والمستندات</span>
              <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <i data-lucide="file-text" class="w-5 h-5"></i>
              </div>
            </div>
            <div class="text-3xl font-black text-slate-900 dark:text-white mt-2">${totalMaterials}</div>
            <div class="text-xs text-slate-400 mt-1">ملف PDF ومصدر دراسي</div>
          </div>

          <div class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400">حالة قاعدة البيانات</span>
              <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <i data-lucide="database" class="w-5 h-5"></i>
              </div>
            </div>
            <div class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">نشطة ومحدثة</div>
            <div class="text-xs text-slate-400 mt-1">${SupabaseConfig.isConnected() ? 'متصل بـ Supabase' : 'تخزين محلي متقدم'}</div>
          </div>

          <div class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400">النسخ الاحتياطي</span>
              <div class="w-10 h-10 rounded-xl bg-purple-100 dark:purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <i data-lucide="download-cloud" class="w-5 h-5"></i>
              </div>
            </div>
            <div class="mt-2 flex gap-2">
              <button onclick="App.exportAcademicJson()" class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200">
                تصدير JSON
              </button>
              <button onclick="App.resetDataPrompt()" class="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-200">
                إعادة ضبط
              </button>
            </div>
          </div>
        </div>

        <!-- جدول إدارة المواد الدراسية -->
        <div class="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
          <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <i data-lucide="layers" class="w-5 h-5 text-amber-500"></i>
                <span>قائمة المواد الدراسية في القسم</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                يمكنك إضافة، تعديل، أو حذف أي مادة دراسية
              </p>
            </div>
            
            <div class="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="تصفية المواد..." 
                oninput="App.filterAdminSubjects(this.value)"
                class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
            </div>
          </div>

          <div class="overflow-x-auto hidden md:block">
            <table class="w-full min-w-[760px] text-right text-xs">
              <thead class="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="p-3.5">الكود</th>
                  <th class="p-3.5">اسم المادة (الرسمي)</th>
                  <th class="p-3.5">المرحلة الأكاديمية</th>
                  <th class="p-3.5">الكورس الدراسي</th>
                  <th class="p-3.5">المستندات المرفوعة</th>
                  <th class="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody id="admin-subjects-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                ${window.academicDB.data.subjects.map(sub => {
                  const semester = window.academicDB.getSemesterById(sub.semester_id);
                  const year = semester ? window.academicDB.getYearById(semester.year_id) : null;
                  const materialsCount = window.academicDB.getMaterialsBySubject(sub.id).length;

                  return `
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                      <td class="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">${sub.code || 'PGE'}</td>
                      <td class="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div>${sub.name}</div>
                        ${sub.name_ar && sub.name_ar !== sub.name ? `<div class="text-xs text-slate-400 font-normal">${sub.name_ar}</div>` : ''}
                      </td>
                      <td class="p-3.5 text-slate-600 dark:text-slate-300">${year ? year.name_ar : '-'}</td>
                      <td class="p-3.5 text-slate-600 dark:text-slate-300">${semester ? semester.name_ar : '-'}</td>
                      <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded-full ${materialsCount > 0 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} font-semibold">
                          ${materialsCount} مستند
                        </span>
                      </td>
                      <td class="p-3.5 text-center">
                        <div class="inline-flex items-center gap-1.5">
                          <button 
                            onclick="App.openUploadModal('${sub.id}')"
                            class="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                            title="رفع مستند لهذه المادة"
                          >
                            <i data-lucide="upload" class="w-4 h-4"></i>
                          </button>
                          <button 
                            onclick="App.openEditSubjectModal('${sub.id}')"
                            class="px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                            title="تعديل المادة"
                            aria-label="تعديل المادة ${this.escapeHtml(sub.name)}"
                          >
                            <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                            <span>تعديل</span>
                          </button>
                          <button 
                            onclick="App.deleteSubjectPrompt('${sub.id}')"
                            class="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-500/20 font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                            title="حذف المادة"
                            aria-label="حذف المادة ${this.escapeHtml(sub.name)}"
                          >
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            <span>حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div class="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            ${window.academicDB.data.subjects.map(sub => {
              const subjectName = this.escapeHtml(sub.name || 'مادة دراسية');
              const subjectCode = this.escapeHtml(sub.code || 'PGE');
              const semester = window.academicDB.getSemesterById(sub.semester_id);
              const year = semester ? window.academicDB.getYearById(semester.year_id) : null;
              const semesterName = this.escapeHtml(semester ? semester.name_ar : '-');
              const yearName = this.escapeHtml(year ? year.name_ar : '-');
              const materialsCount = window.academicDB.getMaterialsBySubject(sub.id).length;

              return `
                <article class="p-4 space-y-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h4 class="font-black text-slate-900 dark:text-white">${subjectName}</h4>
                      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${subjectCode} · ${yearName} · ${semesterName}</p>
                    </div>
                    <span class="shrink-0 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]">${materialsCount} مستند</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="App.openEditSubjectModal('${sub.id}')" class="min-h-10 px-3 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center justify-center gap-2" aria-label="تعديل المادة ${subjectName}">
                      <i data-lucide="edit" class="w-4 h-4"></i><span>تعديل المادة</span>
                    </button>
                    <button type="button" onclick="App.deleteSubjectPrompt('${sub.id}')" class="min-h-10 px-3 py-2 rounded-xl bg-red-600 text-white font-bold text-xs inline-flex items-center justify-center gap-2" aria-label="حذف المادة ${subjectName}">
                      <i data-lucide="trash-2" class="w-4 h-4"></i><span>حذف المادة</span>
                    </button>
                    <button type="button" onclick="App.openUploadModal('${sub.id}')" class="col-span-2 min-h-10 px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-2">
                      <i data-lucide="upload" class="w-4 h-4"></i><span>رفع محاضرة أو مستند</span>
                    </button>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </div>

        <!-- إدارة المحاضرات والمستندات -->
        <div class="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
          <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <i data-lucide="files" class="w-5 h-5 text-amber-500"></i>
                <span>إدارة المحاضرات والمستندات</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">تعديل بيانات أي مستند أو محاضرة وحذف سجلها من المنصة</p>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="search"
                id="admin-materials-filter"
                placeholder="ابحث بالعنوان أو المادة أو الملف..."
                oninput="App.filterAdminMaterials(this.value)"
                class="w-full sm:w-72 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
              <span class="shrink-0 px-2.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold">${adminMaterials.length}</span>
            </div>
          </div>
          <div class="overflow-x-auto hidden md:block">
            <table class="w-full min-w-[760px] text-right text-xs">
              <thead class="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="p-3.5">عنوان المحاضرة / المستند</th>
                  <th class="p-3.5">المادة الدراسية</th>
                  <th class="p-3.5">النوع</th>
                  <th class="p-3.5">الملف أو الرابط</th>
                  <th class="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody id="admin-materials-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                ${adminMaterials.length ? adminMaterials.map(mat => {
                  const subject = window.academicDB.getSubjectById(mat.subject_id);
                  const category = MATERIAL_CATEGORIES.find(item => item.id === mat.category);
                  const materialTitle = this.escapeHtml(mat.title || 'بدون عنوان');
                  const subjectName = this.escapeHtml(subject ? subject.name : 'مادة غير معروفة');
                  const categoryName = this.escapeHtml(category ? category.label_ar : mat.category || 'غير مصنف');
                  const fileName = this.escapeHtml(mat.youtube_url ? 'رابط فيديو YouTube' : mat.file_name || mat.file_path || 'بدون ملف');
                  const safeId = this.escapeHtml(mat.id);

                  return `
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                      <td class="p-3.5 font-bold text-slate-900 dark:text-white">${materialTitle}</td>
                      <td class="p-3.5 text-slate-600 dark:text-slate-300">${subjectName}</td>
                      <td class="p-3.5"><span class="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${categoryName}</span></td>
                      <td class="p-3.5 max-w-xs truncate text-slate-500 dark:text-slate-400" title="${fileName}">${fileName}</td>
                      <td class="p-3.5 text-center">
                        <div class="inline-flex items-center gap-1.5">
                          <button type="button" data-material-id="${safeId}" onclick="App.openEditMaterialModal(this.dataset.materialId)" class="px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 font-bold inline-flex items-center gap-1.5 whitespace-nowrap" title="تعديل بيانات المحاضرة أو المستند" aria-label="تعديل ${materialTitle}">
                            <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                            <span>تعديل</span>
                          </button>
                          <button type="button" data-material-id="${safeId}" onclick="App.deleteMaterialPrompt(this.dataset.materialId)" class="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-500/20 font-bold inline-flex items-center gap-1.5 whitespace-nowrap" title="حذف من المنصة" aria-label="حذف ${materialTitle}">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            <span>حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr><td colspan="5" class="p-8 text-center text-slate-500 dark:text-slate-400">لا توجد محاضرات أو مستندات مضافة حالياً.</td></tr>
                `}
              </tbody>
            </table>
          </div>
          <div class="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            ${adminMaterials.length ? adminMaterials.map(mat => {
              const subject = window.academicDB.getSubjectById(mat.subject_id);
              const materialTitle = this.escapeHtml(mat.title || 'بدون عنوان');
              const subjectName = this.escapeHtml(subject ? subject.name : 'مادة غير معروفة');
              const category = MATERIAL_CATEGORIES.find(item => item.id === mat.category);
              const categoryName = this.escapeHtml(category ? category.label_ar : mat.category || 'غير مصنف');
              const safeId = this.escapeHtml(mat.id);

              return `
                <article class="p-4 space-y-3">
                  <div class="min-w-0">
                    <h4 class="font-black text-slate-900 dark:text-white">${materialTitle}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${subjectName} · ${categoryName}</p>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <button type="button" data-material-id="${safeId}" onclick="App.openEditMaterialModal(this.dataset.materialId)" class="min-h-10 px-3 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center justify-center gap-2" aria-label="تعديل ${materialTitle}">
                      <i data-lucide="edit" class="w-4 h-4"></i><span>تعديل</span>
                    </button>
                    <button type="button" data-material-id="${safeId}" onclick="App.deleteMaterialPrompt(this.dataset.materialId)" class="min-h-10 px-3 py-2 rounded-xl bg-red-600 text-white font-bold text-xs inline-flex items-center justify-center gap-2" aria-label="حذف ${materialTitle}">
                      <i data-lucide="trash-2" class="w-4 h-4"></i><span>حذف</span>
                    </button>
                  </div>
                </article>
              `;
            }).join('') : `
              <p class="p-8 text-center text-slate-500 dark:text-slate-400">لا توجد محاضرات أو مستندات مضافة حالياً.</p>
            `}
          </div>
          <p class="px-5 pb-4 text-[11px] text-slate-400">الحذف يزيل سجل المستند من المنصة؛ ملف التخزين الأصلي لا يُحذف تلقائياً.</p>
        </div>

        <!-- إعدادات Supabase السحابية (اختيارية) -->
        <div class="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
          <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <i data-lucide="cloud" class="w-5 h-5 text-amber-500"></i>
                <span>ربط قاعدة بيانات Supabase السحابية</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                يمكنك ربط مشروع Supabase لتفعيل المزامنة المركزية الفورية والمستودع السحابي
              </p>
            </div>
            
            <a 
              href="supabase_schema.sql" 
              download 
              class="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-200"
            >
              <i data-lucide="download" class="w-4 h-4"></i>
              <span>تحميل ملف المخطط (supabase_schema.sql)</span>
            </a>
          </div>

          <form onsubmit="App.saveSupabaseSettings(event)" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Project URL</label>
              <input 
                type="text" 
                id="supabase-url-input"
                placeholder="https://xyzcompany.supabase.co" 
                value="${SupabaseConfig.getUrl()}"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Anon / Public Key</label>
              <input 
                type="password" 
                id="supabase-key-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." 
                value="${SupabaseConfig.getKey()}"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              >
            </div>
            <div class="md:col-span-2 flex items-center gap-3 pt-2">
              <button 
                type="submit" 
                class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all"
              >
                حفظ وتحديث الاتصال
              </button>
              ${SupabaseConfig.isConnected() ? `
                <button 
                  type="button" 
                  onclick="App.clearSupabaseSettings()"
                  class="px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-xs font-bold"
                >
                  إلغاء الربط والعودة للتخزين المحلي
                </button>
              ` : ''}
            </div>
          </form>
        </div>

      </div>
    `;
  },

  filterAdminRows(tbodyId, query) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const normalizedQuery = String(query || '').trim().toLocaleLowerCase();
    tbody.querySelectorAll('tr').forEach(row => {
      row.classList.toggle('hidden', Boolean(normalizedQuery) && !row.textContent.toLocaleLowerCase().includes(normalizedQuery));
    });
  },

  filterAdminSubjects(query) {
    this.filterAdminRows('admin-subjects-tbody', query);
  },

  filterAdminMaterials(query) {
    this.filterAdminRows('admin-materials-tbody', query);
  },

  // ====================================================================
  // 8. نوافذ منبثقة للإدارة (CRUD Modals)
  // ====================================================================

  // إضافة أو تعديل مادة دراسية
  openAddSubjectModal(defaultSemesterId = null) {
    const modal = document.getElementById('subject-modal');
    const titleEl = document.getElementById('subject-modal-title');
    const form = document.getElementById('subject-form');

    if (!modal || !form) return;

    form.reset();
    document.getElementById('subject-id-input').value = '';
    titleEl.textContent = 'إضافة مادة دراسية جديدة';

    // تعبئة خيارات الفصول الدراسية
    this.populateSemesterSelect('subject-semester-select', defaultSemesterId);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    this.refreshIcons();
  },

  openEditSubjectModal(subjectId) {
    const sub = window.academicDB.getSubjectById(subjectId);
    if (!sub) return;

    const modal = document.getElementById('subject-modal');
    const titleEl = document.getElementById('subject-modal-title');

    titleEl.textContent = 'تعديل بيانات المادة الدراسية';
    document.getElementById('subject-id-input').value = sub.id;
    document.getElementById('subject-name-input').value = sub.name;
    document.getElementById('subject-name-ar-input').value = sub.name_ar || sub.name;
    document.getElementById('subject-code-input').value = sub.code || '';
    document.getElementById('subject-desc-input').value = sub.description || '';

    this.populateSemesterSelect('subject-semester-select', sub.semester_id);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    this.refreshIcons();
  },

  populateSemesterSelect(selectId, selectedId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '';
    const years = window.academicDB.getYears();
    years.forEach(year => {
      const sems = window.academicDB.getSemestersByYear(year.id);
      sems.forEach(sem => {
        const option = document.createElement('option');
        option.value = sem.id;
        option.textContent = `${year.name_ar} • ${sem.name_ar}`;
        if (selectedId && sem.id === selectedId) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    });
  },

  async handleSubjectFormSubmit(e) {
    e.preventDefault();
    if (!window.academicDB.isLoggedIn()) {
      this.showToast('عذراً، تعديل أو إضافة المواد يتطلب تصريح مسؤول.', 'error');
      this.closeModal('subject-modal');
      this.openAdminLoginModal();
      return;
    }
    const subId = document.getElementById('subject-id-input').value;
    const semesterId = document.getElementById('subject-semester-select').value;
    const name = document.getElementById('subject-name-input').value;
    const nameAr = document.getElementById('subject-name-ar-input').value;
    const code = document.getElementById('subject-code-input').value;
    const description = document.getElementById('subject-desc-input').value;

    if (!name.trim() || !semesterId) {
      this.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    if (subId) {
      // تعديل
      window.academicDB.updateSubject(subId, {
        semester_id: semesterId,
        name: name.trim(),
        name_ar: nameAr.trim(),
        code: code.trim(),
        description: description.trim()
      });
      this.showToast('تم تعديل المادة الدراسية بنجاح', 'success');
    } else {
      // إضافة جديدة
      window.academicDB.addSubject({
        semester_id: semesterId,
        name: name.trim(),
        name_ar: nameAr.trim() || name.trim(),
        code: code.trim(),
        description: description.trim()
      });
      this.showToast('تمت إضافة المادة الدراسية بنجاح', 'success');
    }

    this.closeModal('subject-modal');
    this.renderCurrentView();
  },

  async deleteSubjectPrompt(subjectId) {
    if (!window.academicDB.isLoggedIn()) {
      this.showToast('عذراً، حذف المواد يتطلب تصريح مسؤول.', 'error');
      this.openAdminLoginModal();
      return;
    }
    const sub = window.academicDB.getSubjectById(subjectId);
    if (!sub) return;

    if (confirm(`هل أنت متأكد من حذف مادة "${sub.name}" وكافة الملفات والمحاضرات المرتبطة بها نهائياً؟`)) {
      window.academicDB.deleteSubject(subjectId);
      this.showToast('تم حذف المادة الدراسية بنجاح', 'success');
      this.renderCurrentView();
    }
  },

  // رفع مستند / محاضرة (مع دعم السحب والإفلات وقراءة الملف المحلي)
  openUploadModal(defaultSubjectId = null, defaultCategory = 'lectures') {
    if (!window.academicDB.isLoggedIn()) {
      this.showToast('عذراً، إضافة المحاضرات وفيديوهات YouTube مخصصة للادارة فقط. يرجى تسجيل الدخول كمسؤول.', 'warning');
      this.openAdminLoginModal();
      return;
    }
    const modal = document.getElementById('upload-modal');
    const form = document.getElementById('upload-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('upload-file-data-url').value = '';
    document.getElementById('upload-selected-file-label').textContent = 'لم يتم اختيار ملف بعد';

    // تعبئة خيارات المواد
    const subSelect = document.getElementById('upload-subject-select');
    subSelect.innerHTML = '';
    window.academicDB.data.subjects.forEach(sub => {
      const sem = window.academicDB.getSemesterById(sub.semester_id);
      const year = sem ? window.academicDB.getYearById(sem.year_id) : null;
      const opt = document.createElement('option');
      opt.value = sub.id;
      opt.textContent = `${year ? year.name_ar + ' • ' : ''}${sub.name}`;
      if (defaultSubjectId && sub.id === defaultSubjectId) {
        opt.selected = true;
      }
      subSelect.appendChild(opt);
    });

    // تعبئة خيارات الفئة
    const catSelect = document.getElementById('upload-category-select');
    catSelect.innerHTML = '';
    MATERIAL_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.label_ar;
      if (cat.id === defaultCategory) opt.selected = true;
      catSelect.appendChild(opt);
    });

    this.toggleLectureNumberField(defaultCategory);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    this.refreshIcons();
  },

  toggleLectureNumberField(category) {
    const numContainer = document.getElementById('upload-lecture-num-container');
    const ytContainer = document.getElementById('upload-youtube-url-container');
    const dropzoneContainer = document.getElementById('upload-file-dropzone-container');
    const titleInput = document.getElementById('upload-title-input');

    if (category === 'lectures') {
      if (numContainer) numContainer.classList.remove('hidden');
      if (ytContainer) ytContainer.classList.remove('hidden');
      if (dropzoneContainer) dropzoneContainer.classList.add('hidden');
      if (titleInput) titleInput.placeholder = "مثال: Lecture 1: Petroleum Refining Introduction";
    } else {
      if (numContainer) numContainer.classList.add('hidden');
      if (ytContainer) ytContainer.classList.add('hidden');
      if (dropzoneContainer) dropzoneContainer.classList.remove('hidden');
      if (titleInput) titleInput.placeholder = "مثال: ملزمة الفصل الأول - المحاضرات المعتمدة";
    }
    this.refreshIcons();
  },

  getYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  },

  openVideoModal(materialId) {
    const mat = window.academicDB.getMaterialById(materialId);
    if (!mat || !mat.youtube_url) return;
    const ytId = this.getYouTubeId(mat.youtube_url);
    const modal = document.getElementById('video-player-modal');
    const iframe = document.getElementById('video-modal-iframe');
    const title = document.getElementById('video-modal-title');
    const desc = document.getElementById('video-modal-desc');
    const link = document.getElementById('video-modal-yt-link');

    if (title) title.textContent = mat.title;
    if (desc) desc.textContent = mat.description || 'فيديو تعليمي معتمد لقسم هندسة النفط والغاز';
    if (link) link.href = mat.youtube_url;
    if (iframe) {
      iframe.src = ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=1` : mat.youtube_url;
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    this.refreshIcons();
  },

  closeVideoModal() {
    const modal = document.getElementById('video-player-modal');
    const iframe = document.getElementById('video-modal-iframe');
    if (iframe) iframe.src = '';
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.returnToSubjectFromMaterialRoute();
  },

  returnToSubjectFromMaterialRoute() {
    if (this.currentRoute !== 'material') return;
    const material = window.academicDB.getMaterialById(this.routeParams.p1);
    const subject = material ? window.academicDB.getSubjectById(material.subject_id) : null;
    if (subject) {
      const route = `#/subject/${encodeURIComponent(subject.id)}/${encodeURIComponent(material.category || 'lectures')}`;
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${route}`);
      this.handleRouting();
    }
  },

  // معالجة اختيار ملف من القرص المحلي وتحويله إلى DataURL للمعاينة والتحميل
  handleFileInputChange(input) {
    const file = input.files[0];
    if (!file) return;

    // التحقق من الحجم (الحد الأقصى 50 ميغابايت)
    if (file.size > 50 * 1024 * 1024) {
      this.showToast('حجم الملف كبير جداً! الحد الأقصى هو 50 ميغابايت', 'error');
      input.value = '';
      return;
    }

    const label = document.getElementById('upload-selected-file-label');
    if (label) {
      label.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    }

    const titleInput = document.getElementById('upload-title-input');
    if (titleInput && !titleInput.value) {
      titleInput.value = file.name.replace(/\.[^/.]+$/, "");
    }

    // قراءة الملف محلياً للمعاينة والتحميل المباشر
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('upload-file-data-url').value = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  async handleUploadFormSubmit(e) {
    e.preventDefault();
    if (!window.academicDB.isLoggedIn()) {
      this.showToast('عذراً، هذه العملية تتطلب تسجيل دخول كمسؤول النظام.', 'error');
      this.closeModal('upload-modal');
      this.openAdminLoginModal();
      return;
    }
    const subjectId = document.getElementById('upload-subject-select').value;
    const category = document.getElementById('upload-category-select').value;
    const title = document.getElementById('upload-title-input').value;
    const description = document.getElementById('upload-desc-input').value;
    const lectureNum = document.getElementById('upload-lecture-num-input').value;
    const youtubeUrl = document.getElementById('upload-youtube-url-input')?.value || '';
    const fileInput = document.getElementById('upload-file-input');

    const file = fileInput.files[0];
    const isYt = category === 'lectures' && Boolean(youtubeUrl.trim());

    if (!title.trim() || !subjectId) {
      this.showToast('يرجى كتابة عنوان واختيار المادة', 'error');
      return;
    }

    if (category === 'lectures' && !youtubeUrl.trim() && !file) {
      this.showToast('يرجى وضع رابط فيديو YouTube أو اختيار ملف', 'error');
      return;
    }

    let filePath = 'sample_docs/geology_lec1_intro.pdf';
    let fileName = isYt ? 'YouTube Video' : 'document.pdf';
    let fileSize = isYt ? 'YouTube' : '1.5 MB';
    let fileDataUrl = null;

    if (file) {
      try {
        const uploadRes = await window.academicDB.uploadAcademicFile(file, 'lectures');
        filePath = uploadRes.public_url || uploadRes.file_path;
        fileName = uploadRes.file_name;
        fileSize = uploadRes.file_size;
        fileDataUrl = uploadRes.file_data_url || null;
      } catch (err) {
        this.showToast('خطأ أثناء رفع الملف: ' + err.message, 'error');
        return;
      }
    }

    try {
      await window.academicDB.addMaterial({
        subject_id: subjectId,
        category: category,
        title: title.trim(),
        description: description.trim(),
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        file_data_url: fileDataUrl,
        youtube_url: youtubeUrl.trim() || null,
        lecture_number: category === 'lectures' && lectureNum ? Number(lectureNum) : null
      });

      this.showToast(isYt ? 'تمت إضافة فيديو YouTube بنجاح!' : 'تم رفع المستند الدراسي بنجاح!', 'success');
      this.closeModal('upload-modal');
      this.renderCurrentView();
    } catch (err) {
      this.showToast('فشل إضافة المادة: ' + err.message, 'error');
    }
  },

  // تعديل مستند موجود
  async openEditMaterialModal(materialId) {
    if (!window.academicDB.isLoggedIn()) {
      this.showToast('عذراً، تعديل المستندات يتطلب تصريح مسؤول.', 'error');
      this.openAdminLoginModal();
      return;
    }
    const mat = window.academicDB.getMaterialById(materialId);
    if (!mat) return;

    const modal = document.getElementById('material-edit-modal');
    const form = document.getElementById('material-edit-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('material-edit-id').value = mat.id;
    document.getElementById('material-edit-title').value = mat.title || '';
    document.getElementById('material-edit-description').value = mat.description || '';
    document.getElementById('material-edit-youtube').value = mat.youtube_url || '';
    document.getElementById('material-edit-lecture-number').value = mat.lecture_number || '';
    this.populateMaterialSubjectSelect('material-edit-subject', mat.subject_id);

    const categorySelect = document.getElementById('material-edit-category');
    categorySelect.innerHTML = '';
    MATERIAL_CATEGORIES.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.label_ar;
      option.selected = category.id === mat.category;
      categorySelect.appendChild(option);
    });

    const fileLabel = document.getElementById('material-edit-current-file');
    if (fileLabel) {
      fileLabel.textContent = mat.youtube_url
        ? `الفيديو الحالي: ${mat.youtube_url}`
        : `الملف الحالي: ${mat.file_name || mat.file_path || 'غير محدد'}`;
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    this.refreshIcons();
  },

  populateMaterialSubjectSelect(selectId, selectedId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    window.academicDB.data.subjects.forEach(subject => {
      const semester = window.academicDB.getSemesterById(subject.semester_id);
      const year = semester ? window.academicDB.getYearById(semester.year_id) : null;
      const option = document.createElement('option');
      option.value = subject.id;
      option.textContent = `${year ? `${year.name_ar} • ` : ''}${subject.name}`;
      option.selected = subject.id === selectedId;
      select.appendChild(option);
    });
  },

  async handleEditMaterialSubmit(e) {
    e.preventDefault();
    if (!window.academicDB.isLoggedIn()) {
      this.showToast('عذراً، تعديل المستندات يتطلب تصريح مسؤول.', 'error');
      this.closeModal('material-edit-modal');
      this.openAdminLoginModal();
      return;
    }

    const materialId = document.getElementById('material-edit-id').value;
    const mat = window.academicDB.getMaterialById(materialId);
    if (!mat) {
      this.showToast('تعذر العثور على المستند المطلوب', 'error');
      this.closeModal('material-edit-modal');
      return;
    }

    const subjectId = document.getElementById('material-edit-subject').value;
    const category = document.getElementById('material-edit-category').value;
    const title = document.getElementById('material-edit-title').value.trim();
    const description = document.getElementById('material-edit-description').value.trim();
    const youtubeUrl = document.getElementById('material-edit-youtube').value.trim();
    const lectureValue = document.getElementById('material-edit-lecture-number').value;
    const fileInput = document.getElementById('material-edit-file');
    const file = fileInput.files && fileInput.files[0];
    const usesYouTube = category === 'lectures' && Boolean(youtubeUrl);
    const hasExistingFile = Boolean(mat.file_data_url || mat.public_url || (mat.file_path && mat.file_path !== 'youtube'));

    if (!subjectId || !window.academicDB.getSubjectById(subjectId) || !MATERIAL_CATEGORIES.some(item => item.id === category) || !title) {
      this.showToast('يرجى التأكد من المادة ونوع المحتوى والعنوان', 'error');
      return;
    }
    if (youtubeUrl && !this.getYouTubeId(youtubeUrl)) {
      this.showToast('يرجى إدخال رابط YouTube صحيح', 'error');
      return;
    }
    if (file && file.size > 50 * 1024 * 1024) {
      this.showToast('حجم الملف كبير جداً! الحد الأقصى هو 50 ميغابايت', 'error');
      return;
    }
    if (usesYouTube && file) {
      this.showToast('اختر رابط YouTube أو ملفاً بديلاً، وليس الاثنين معاً', 'error');
      return;
    }
    if (!usesYouTube && !file && !hasExistingFile) {
      this.showToast('هذا السجل لا يحتوي ملفاً؛ أرفق ملفاً أو أضف رابط YouTube للمحاضرة', 'error');
      return;
    }

    const submitButton = document.getElementById('material-edit-save');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'جارٍ حفظ التعديلات...';
    }

    try {
      const updates = {
        subject_id: subjectId,
        category,
        title,
        description,
        youtube_url: usesYouTube ? youtubeUrl : null,
        lecture_number: category === 'lectures' && lectureValue ? Number(lectureValue) : null
      };

      if (file) {
        const upload = await window.academicDB.uploadAcademicFile(file, category);
        updates.file_path = upload.public_url || upload.file_path;
        updates.file_name = upload.file_name || file.name;
        updates.file_size = upload.file_size || `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
        updates.file_type = upload.file_type || file.type || 'application/pdf';
        updates.file_data_url = upload.file_data_url || null;
      } else if (usesYouTube && !mat.file_path) {
        updates.file_path = 'youtube';
        updates.file_name = 'YouTube Video';
        updates.file_size = 'YouTube';
        updates.file_type = 'video/youtube';
        updates.file_data_url = null;
      }

      await window.academicDB.updateMaterial(materialId, updates);
      this.closeModal('material-edit-modal');
      this.showToast('تم تحديث بيانات المحاضرة أو المستند بنجاح', 'success');
      this.renderCurrentView();
    } catch (err) {
      this.showToast('فشل تحديث المستند: ' + err.message, 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'حفظ التعديلات';
      }
    }
  },

  // استبدال ملف مستند بملف جديد
  openReplaceFileModal(materialId) {
    if (!window.academicDB.isLoggedIn()) {
      this.showToast('عذراً، استبدال الملفات يتطلب تصريح مسؤول.', 'error');
      this.openAdminLoginModal();
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.ppt,.pptx';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) {
        this.showToast('حجم الملف كبير جداً! الحد الأقصى هو 50 ميغابايت', 'error');
        return;
      }
      try {
        const mat = window.academicDB.getMaterialById(materialId);
        if (!mat) return;
        const upload = await window.academicDB.uploadAcademicFile(file, mat.category || 'lectures');
        await window.academicDB.updateMaterial(materialId, {
          file_path: upload.public_url || upload.file_path,
          file_name: upload.file_name || file.name,
          file_size: upload.file_size || `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          file_type: upload.file_type || file.type || 'application/pdf',
          file_data_url: upload.file_data_url || null,
          youtube_url: null
        });
        this.showToast('تم استبدال الملف بنجاح', 'success');
        this.renderCurrentView();
      } catch (err) {
        this.showToast('فشل استبدال الملف: ' + err.message, 'error');
      }
    };
    input.click();
  },

  async deleteMaterialPrompt(materialId) {
    if (!window.academicDB.isLoggedIn()) {
      this.showToast('عذراً، حذف المستندات يتطلب تصريح مسؤول.', 'error');
      this.openAdminLoginModal();
      return;
    }
    const mat = window.academicDB.getMaterialById(materialId);
    if (!mat) return;

    if (confirm(`هل تريد حذف "${mat.title}" من المنصة؟ سيُحذف سجل العرض فقط، ولن يُحذف ملف التخزين الأصلي.`)) {
      try {
        await window.academicDB.deleteMaterial(materialId);
        this.showToast('تم حذف المستند بنجاح', 'success');
        this.renderCurrentView();
      } catch (err) {
        this.showToast('فشل حذف المستند: ' + err.message, 'error');
      }
    }
  },

  // ====================================================================
  // 9. نظام البحث الحي الشامل (Live Search System)
  // ====================================================================
  openGlobalSearch(initialQuery = '') {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('global-search-input');
    if (!modal || !input) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    input.value = initialQuery;
    input.focus();
    this.handleSearchInput(initialQuery);
    this.refreshIcons();
  },

  closeSearchModal() {
    this.closeModal('search-modal');
  },

  handleSearchInput(query) {
    const resultsContainer = document.getElementById('search-results-container');
    if (!resultsContainer) return;

    if (!query || query.trim().length === 0) {
      resultsContainer.innerHTML = `
        <div class="p-8 text-center text-slate-400 text-xs">
          اكتب كلمة البحث للبحث في أسماء المواد، عناوين المحاضرات، المراحل، والفصول الدراسية...
        </div>
      `;
      return;
    }

    const { subjects, materials } = window.academicDB.search(query);

    if (subjects.length === 0 && materials.length === 0) {
      resultsContainer.innerHTML = `
        <div class="p-8 text-center">
          <i data-lucide="search-x" class="w-8 h-8 text-slate-400 mx-auto mb-2"></i>
          <p class="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد نتائج مطابقة لـ "${query}"</p>
          <p class="text-xs text-slate-400 mt-1">تأكد من كتابة الكلمات بشكل صحيح أو جرب البحث بكلمات عامة مثل "Geology" أو "Math"</p>
        </div>
      `;
      this.refreshIcons();
      return;
    }

    resultsContainer.innerHTML = `
      <div class="space-y-6">
        <!-- نتائج المواد -->
        ${subjects.length > 0 ? `
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
              المواد الدراسية (${subjects.length})
            </h4>
            <div class="divide-y divide-slate-100 dark:divide-slate-800">
              ${subjects.map(sub => {
                const sem = window.academicDB.getSemesterById(sub.semester_id);
                const year = sem ? window.academicDB.getYearById(sem.year_id) : null;

                return `
                  <div 
                    onclick="App.closeSearchModal(); App.navigateTo('subject/${sub.id}')"
                    class="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div class="text-sm font-bold text-slate-900 dark:text-white">${sub.name}</div>
                      <div class="text-xs text-slate-500 dark:text-slate-400">
                        ${year ? year.name_ar + ' • ' : ''}${sem ? sem.name_ar : ''}
                      </div>
                    </div>
                    <span class="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <span>فتح المادة</span>
                      <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- نتائج المحاضرات والمستندات -->
        ${materials.length > 0 ? `
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
              المحاضرات والمستندات (${materials.length})
            </h4>
            <div class="divide-y divide-slate-100 dark:divide-slate-800">
              ${materials.map(mat => {
                const sub = window.academicDB.getSubjectById(mat.subject_id);

                return `
                  <div class="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                        <i data-lucide="file-text" class="w-4 h-4"></i>
                      </div>
                      <div>
                        <div class="text-xs font-bold text-slate-900 dark:text-white">${mat.title}</div>
                        <div class="text-xs text-slate-500 dark:text-slate-400">
                          ${sub ? sub.name + ' • ' : ''}${mat.file_size || 'PDF'}
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <button 
                        onclick="App.closeSearchModal(); App.navigateTo('material/${mat.id}')"
                        class="px-2.5 py-1 rounded-lg bg-blue-900 text-white text-xs font-bold hover:bg-blue-800"
                      >
                        قراءة
                      </button>
                      <button 
                        onclick="App.downloadPdf('${mat.id}')"
                        class="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                        title="تحميل"
                      >
                        <i data-lucide="download" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    this.refreshIcons();
  },

  // ====================================================================
  // 10. تسجيل دخول وخروج المسؤول (Authentication)
  // ====================================================================
  openAdminLoginModal() {
    const modal = document.getElementById('admin-login-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    const setupPanel = document.getElementById('supabase-bootstrap-panel');
    const urlInput = document.getElementById('supabase-bootstrap-url');
    const keyInput = document.getElementById('supabase-bootstrap-anon-key');
    if (urlInput) urlInput.value = SupabaseConfig.getUrl();
    if (keyInput) keyInput.value = SupabaseConfig.getKey();
    if (setupPanel) setupPanel.open = !SupabaseConfig.isConnected();
    this.refreshIcons();
  },

  async handleAdminLoginSubmit(e) {
    e.preventDefault();
    const emailInput = document.getElementById('admin-email-input');
    const passInput = document.getElementById('admin-password-input');
    const submitBtn = document.getElementById('admin-login-submit-btn');

    const email = emailInput ? emailInput.value : '';
    const pass = passInput ? passInput.value : '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري التحقق من الصلاحيات...';
    }

    try {
      const res = await window.academicDB.loginAdmin(email, pass);
      if (res.success) {
        const name = (res.profile && res.profile.full_name) || 'المسؤول';
        this.showToast(`تم تسجيل الدخول بنجاح! مرحباً ${name}.`, 'success');
        this.closeModal('admin-login-modal');
        this.updateAdminUIState();
        this.navigateTo('admin');
      } else {
        this.showToast(res.message || 'بيانات الدخول غير صحيحة أو ليس لديك صلاحية مسؤول', 'error');
      }
    } catch (err) {
      this.showToast('حدث خطأ أثناء الاتصال: ' + (err.message || err), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تسجيل الدخول الآمن';
      }
    }
  },

  async saveSupabaseBootstrapSettings(e) {
    e.preventDefault();
    const urlInput = document.getElementById('supabase-bootstrap-url');
    const keyInput = document.getElementById('supabase-bootstrap-anon-key');
    const url = urlInput ? urlInput.value.trim() : '';
    const key = keyInput ? keyInput.value.trim() : '';

    if (!url || !key) {
      this.showToast('أدخل Project URL و anon/public key من إعدادات مشروع Supabase.', 'error');
      return;
    }
    let keyRole = null;
    const tokenPayload = key.split('.')[1];
    if (tokenPayload && typeof window.atob === 'function') {
      try {
        let base64Payload = tokenPayload.replace(/-/g, '+').replace(/_/g, '/');
        while (base64Payload.length % 4) base64Payload += '=';
        keyRole = JSON.parse(window.atob(base64Payload)).role || null;
      } catch (err) {
        keyRole = null;
      }
    }
    if (key.toLowerCase().startsWith('sb_secret_') || keyRole === 'service_role') {
      this.showToast('هذا مفتاح سري عالي الصلاحية. استخدم anon/public أو publishable key فقط.', 'error');
      return;
    }
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:') {
        this.showToast('يجب أن يبدأ رابط مشروع Supabase بـ https://', 'error');
        return;
      }
    } catch (err) {
      this.showToast('رابط مشروع Supabase غير صحيح.', 'error');
      return;
    }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      this.showToast('تعذر تحميل مكتبة Supabase. حدّث الصفحة وحاول مرة أخرى.', 'error');
      return;
    }

    try {
      SupabaseConfig.saveCredentials(url, key);
      window.academicDB.client = null;
      window.academicDB.currentUser = null;
      window.academicDB.adminProfile = null;
      window.academicDB.initSupabaseClient();
      if (!window.academicDB.client) throw new Error('تعذر إنشاء اتصال Supabase');

      const { error } = await window.academicDB.client.auth.getSession();
      if (error) throw error;
      const syncResult = await window.academicDB.syncFromSupabase();
      const setupPanel = document.getElementById('supabase-bootstrap-panel');
      if (setupPanel) setupPanel.open = false;
      this.updateAdminUIState();
      if (syncResult.success) {
        this.showToast('تم الاتصال ومزامنة البيانات. أدخل بريد المسؤول وكلمة مروره لتسجيل الدخول.', 'success');
      } else {
        this.showToast(`حُفظت الإعدادات، لكن ${this.getSupabaseSyncFailureMessage(syncResult)}`, 'info');
      }
    } catch (err) {
      this.showToast('تعذر تهيئة الاتصال. تحقق من URL والمفتاح العام وحاول مرة أخرى.', 'error');
    }
  },

  getSupabaseSyncFailureMessage(result = {}) {
    const code = String(result.code || '').toUpperCase();
    const table = ['academic_years', 'semesters', 'subjects', 'materials'].includes(result.table)
      ? result.table
      : null;

    if (code === 'NO_CLIENT') return 'لم يتكوّن اتصال Supabase؛ تحقق من Project URL والمفتاح العام.';
    if (code === 'NETWORK_ERROR') return 'تعذر الوصول إلى Supabase؛ تحقق من Project URL والاتصال بالإنترنت.';
    if (['42P01', 'PGRST204', 'PGRST205'].includes(code)) {
      return `جدول ${table || 'المقررات'} غير موجود أو غير ظاهر في Supabase. شغّل ملف supabase_schema.sql من SQL Editor.`;
    }
    if (code === '42501' || Number(result.status) === 403) {
      return `صلاحيات القراءة تمنع الوصول${table ? ` إلى جدول ${table}` : ''}. تحقق من سياسات SELECT وRLS في supabase_schema.sql.`;
    }
    if (Number(result.status) === 401 || code === 'PGRST301') {
      return 'مفتاح anon/public غير مقبول من المشروع؛ انسخه مجدداً من إعدادات Supabase.';
    }
    if (code === 'EMPTY_RESPONSE') return 'لم ترجع الجداول بيانات؛ تحقق من تهيئة مخطط قاعدة البيانات وسياسات القراءة.';
    const safeCode = /^[A-Z0-9_-]+$/.test(code) ? ` (رمز ${code})` : '';
    return `تعذر قراءة البيانات${table ? ` من جدول ${table}` : ''}${safeCode}. تحقق من إعدادات المشروع والجداول.`;
  },

  async logoutAdmin() {
    await window.academicDB.logoutAdmin();
    this.updateAdminUIState();
    this.showToast('تم تسجيل الخروج وإلغاء الجلسة بنجاح', 'info');
    this.navigateTo('home');
  },

  updateAdminUIState() {
    const isLogged = window.academicDB.isLoggedIn();
    document.querySelectorAll('.admin-only-btn').forEach(btn => {
      if (isLogged) {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    });

    const loginNavBtn = document.getElementById('nav-admin-login-btn');
    if (loginNavBtn) {
      if (isLogged) {
        loginNavBtn.innerHTML = `
          <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>
          <span class="hidden md:inline">لوحة الإدارة</span>
        `;
        loginNavBtn.setAttribute('aria-label', 'لوحة الإدارة');
        loginNavBtn.onclick = () => App.navigateTo('admin');
      } else {
        loginNavBtn.innerHTML = `
          <i data-lucide="lock" class="w-4 h-4"></i>
          <span class="hidden md:inline">دخول الإدارة</span>
        `;
        loginNavBtn.setAttribute('aria-label', 'دخول الإدارة');
        loginNavBtn.onclick = () => App.openAdminLoginModal();
      }
    }
    this.refreshIcons();
  },

  // ====================================================================
  // 11. إعدادات Supabase وتصدير واستيراد البيانات
  // ====================================================================
  saveSupabaseSettings(e) {
    e.preventDefault();
    const url = document.getElementById('supabase-url-input').value;
    const key = document.getElementById('supabase-key-input').value;

    if (url && key) {
      SupabaseConfig.saveCredentials(url, key);
      window.academicDB.initSupabaseClient();
      this.showToast('تم حفظ بيانات الاتصال بـ Supabase وجاري تهيئة العميل...', 'success');
      window.academicDB.syncFromSupabase().then(res => {
        if (res.success) {
          this.showToast(`تمت مزامنة ${res.count} مادة من قاعدة بيانات Supabase!`, 'success');
        } else {
          this.showToast(this.getSupabaseSyncFailureMessage(res), 'info');
        }
        this.renderCurrentView();
      });
    }
  },

  clearSupabaseSettings() {
    SupabaseConfig.clearCredentials();
    window.academicDB.client = null;
    window.academicDB.currentUser = null;
    window.academicDB.adminProfile = null;
    this.updateAdminUIState();
    this.showToast('تم إلغاء الربط والعودة للوضع المحلي للقراءة فقط', 'info');
    this.navigateTo('home');
  },

  exportAcademicJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(window.academicDB.exportData());
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `thiqar_pge_academic_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    document.body.removeChild(dlAnchor);
    this.showToast('تم تصدير ملف النسخة الاحتياطية بنجاح', 'success');
  },

  resetDataPrompt() {
    if (confirm('تحذير: هل أنت متأكد من إعادة ضبط البيانات إلى الحالة الأولية الأصلية المعتمدة؟')) {
      window.academicDB.resetToDefaultData();
      this.showToast('تمت استعادة البيانات الأصلية بنجاح', 'info');
      this.renderCurrentView();
    }
  },

  // ====================================================================
  // 12. المساعدات والنوافذ العامة (Modals & UI Helpers)
  // ====================================================================
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  closeAllModals() {
    this.returnToSubjectFromMaterialRoute();
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  },

  toggleMobileMenu() {
    const menu = document.getElementById('mobile-drawer');
    if (menu) {
      const isOpening = menu.classList.contains('hidden');
      menu.classList.toggle('hidden', !isOpening);
      this.updateMobileMenuButton(isOpening);
      if (isOpening) menu.querySelector('a')?.focus();
    }
  },

  updateMobileMenuButton(isOpen) {
    const toggle = document.getElementById('mobile-menu-toggle');
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
    toggle.setAttribute('aria-label', isOpen ? 'إغلاق قائمة التنقل' : 'فتح قائمة التنقل');
    const openIcon = toggle.querySelector('.mobile-menu-open-icon');
    const closeIcon = toggle.querySelector('.mobile-menu-close-icon');
    if (openIcon) openIcon.classList.toggle('hidden', Boolean(isOpen));
    if (closeIcon) closeIcon.classList.toggle('hidden', !isOpen);
  },

  closeMobileMenu({ restoreFocus = false } = {}) {
    const menu = document.getElementById('mobile-drawer');
    const wasOpen = Boolean(menu && !menu.classList.contains('hidden'));
    if (menu) menu.classList.add('hidden');
    this.updateMobileMenuButton(false);
    if (restoreFocus && wasOpen) document.getElementById('mobile-menu-toggle')?.focus();
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-red-600 text-white',
      info: 'bg-slate-900 dark:bg-slate-800 text-white border border-amber-500/30'
    };

    const icons = {
      success: 'check-circle-2',
      error: 'alert-circle',
      info: 'info'
    };

    toast.className = `toast px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-bold ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}" class="w-5 h-5 shrink-0"></i>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    this.refreshIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  renderNotFound(container, msg = 'الصفحة المطلوبة غير موجودة') {
    container.innerHTML = `
      <div class="max-w-xl mx-auto my-20 p-8 text-center glass-card rounded-3xl border border-slate-200 dark:border-slate-800">
        <div class="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <i data-lucide="alert-triangle" class="w-8 h-8"></i>
        </div>
        <h2 class="text-xl font-black text-slate-900 dark:text-white mb-2">${msg}</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">يرجى التأكد من الرابط أو العودة إلى الصفحة الرئيسية</p>
        <button onclick="App.navigateTo('home')" class="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md">
          العودة للرئيسية
        </button>
      </div>
    `;
    this.refreshIcons();
  }
};

// تشغيل التطبيق بمجرد جاهزية المستند
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
