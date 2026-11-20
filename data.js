/**
 * قاعدة البيانات والبيانات الأولية (Seed Data)
 * جامعة ذي قار - كلية الهندسة - قسم هندسة النفط والغاز
 * University of Thi-Qar - College of Engineering - Department of Petroleum and Gas Engineering
 */

// هيكل المراحل الدراسية والفصول والمواد حسب المتطلبات الرسمية
const INITIAL_ACADEMIC_DATA = {
  years: [
    {
      id: "year-1",
      name_ar: "المرحلة الأولى",
      name_en: "First Year",
      description: "السنة التأسيسية لطلبة هندسة النفط والغاز - العلوم الأساسية والهندسية",
      icon: "graduation-cap",
      display_order: 1
    },
    {
      id: "year-2",
      name_ar: "المرحلة الثانية",
      name_en: "Second Year",
      description: "المرحلة التخصصية المتوسطة - مبادئ هندسة النفط والموائع والمكامن",
      icon: "layers",
      display_order: 2
    },
    {
      id: "year-3",
      name_ar: "المرحلة الثالثة",
      name_en: "Third Year",
      description: "المرحلة المتقدمة - الحفر والإنتاج ومحاكاة المكامن",
      icon: "flame",
      display_order: 3
    },
    {
      id: "year-4",
      name_ar: "المرحلة الرابعة",
      name_en: "Fourth Year",
      description: "سنة التخرج ومشاريع التخرج ومعالجة الغاز وهندسة المنشآت السطحية",
      icon: "award",
      display_order: 4
    }
  ],

  semesters: [
    // المرحلة الأولى
    { id: "sem-1-1", year_id: "year-1", name_ar: "الكورس الأول", name_en: "First Semester", display_order: 1 },
    { id: "sem-1-2", year_id: "year-1", name_ar: "الكورس الثاني", name_en: "Second Semester", display_order: 2 },

    // المرحلة الثانية
    { id: "sem-2-1", year_id: "year-2", name_ar: "الكورس الأول", name_en: "First Semester", display_order: 1 },
    { id: "sem-2-2", year_id: "year-2", name_ar: "الكورس الثاني", name_en: "Second Semester", display_order: 2 },

    // المرحلة الثالثة
    { id: "sem-3-1", year_id: "year-3", name_ar: "الكورس الأول", name_en: "First Semester", display_order: 1 },
    { id: "sem-3-2", year_id: "year-3", name_ar: "الكورس الثاني", name_en: "Second Semester", display_order: 2 },

    // المرحلة الرابعة
    { id: "sem-4-1", year_id: "year-4", name_ar: "الكورس الأول", name_en: "First Semester", display_order: 1 },
    { id: "sem-4-2", year_id: "year-4", name_ar: "الكورس الثاني", name_en: "Second Semester", display_order: 2 }
  ],

  // المواد المحددة بدقة متناهية وفق المتطلبات
  subjects: [
    // ==========================================
    // المرحلة الأولى - الكورس الأول (7 مواد بالضبط)
    // ==========================================
    {
      id: "sub-1-1-1",
      semester_id: "sem-1-1",
      name: "Engineering Drawing (رسم هندسي)",
      name_en: "Engineering Drawing",
      name_ar: "الرسم الهندسي",
      code: "PGE111",
      description: "أساسيات الرسم الهندسي اليدوي، الإسقاط المتعامد، القطاعات، ورسم المجسمات والمخططات الهندسية.",
      icon: "compass",
      display_order: 1
    },
    {
      id: "sub-1-1-2",
      semester_id: "sem-1-1",
      name: "Mechanical Engineering",
      name_en: "Mechanical Engineering",
      name_ar: "الهندسة الميكانيكية",
      code: "PGE112",
      description: "مبادئ الميكانيك الهندسي (Statics)، توازن القوى، العزوم، وتطبيقاتها في الأنظمة الهندسية.",
      icon: "cog",
      display_order: 2
    },
    {
      id: "sub-1-1-3",
      semester_id: "sem-1-1",
      name: "Chemistry",
      name_en: "Chemistry",
      name_ar: "الكيمياء العامة",
      code: "PGE113",
      description: "مفاهيم الكيمياء العامة واللاعضوية، الروابط الكيميائية، المحاليل، وتطبيقات الكيمياء في الصناعة النفطية.",
      icon: "flask-conical",
      display_order: 3
    },
    {
      id: "sub-1-1-4",
      semester_id: "sem-1-1",
      name: "Physics",
      name_en: "Physics",
      name_ar: "الفيزياء الهندسية",
      code: "PGE114",
      description: "الموجات، الميكانيكا الكلاسيكية، الحرارة، والخواص الفيزيائية للمادة المستخدمة في التطبيقات النفطية.",
      icon: "atom",
      display_order: 4
    },
    {
      id: "sub-1-1-5",
      semester_id: "sem-1-1",
      name: "Geology",
      name_en: "Geology",
      name_ar: "الجيولوجيا العامة",
      code: "PGE115",
      description: "مقدمة في الجيولوجيا العامة، تكوين القشرة الأرضية، الصخور الرسوبية، والمعادن والطبقات الجيولوجية.",
      icon: "mountain",
      display_order: 5
    },
    {
      id: "sub-1-1-6",
      semester_id: "sem-1-1",
      name: "Computer Programming",
      name_en: "Computer Programming",
      name_ar: "البرمجة الحاسوبية",
      code: "PGE116",
      description: "أساسيات البرمجة، الخوارزميات، هياكل التحكم، وحل المسائل الهندسية برمجياً.",
      icon: "terminal",
      display_order: 6
    },
    {
      id: "sub-1-1-7",
      semester_id: "sem-1-1",
      name: "Mathematics",
      name_en: "Mathematics",
      name_ar: "الرياضيات 1",
      code: "PGE117",
      description: "التفاضل والتكامل، الدوال المثلثية والزائدية، والمتتاليات والمصفوفات الهندسية.",
      icon: "binary",
      display_order: 7
    },

    // ==========================================
    // المرحلة الأولى - الكورس الثاني (6 مواد بالضبط)
    // ==========================================
    {
      id: "sub-1-2-1",
      semester_id: "sem-1-2",
      name: "Electric",
      name_en: "Electric",
      name_ar: "الهندسة الكهربائية",
      code: "PGE121",
      description: "مبادئ الدوائر الكهربائية (DC & AC)، قوانين كيرشوف، القدرة الكهربائية والمحركات في المنشآت النفطية.",
      icon: "zap",
      display_order: 1
    },
    {
      id: "sub-1-2-2",
      semester_id: "sem-1-2",
      name: "Dynamic",
      name_en: "Dynamic",
      name_ar: "الديناميكا الهندسية",
      code: "PGE122",
      description: "حركة الجسيمات والأجسام الجاسئة، الحركة الخطية والمنحنية، الشغل والطاقة وقوانين نيوتن الحركية.",
      icon: "activity",
      display_order: 2
    },
    {
      id: "sub-1-2-3",
      semester_id: "sem-1-2",
      name: "AutoCAD",
      name_en: "AutoCAD",
      name_ar: "الرسم الهندسي بالحاسوب (AutoCAD)",
      code: "PGE123",
      description: "تطبيقات الرسم ثنائي وثلاثي الأبعاد باستخدام برنامج أوتوكاد لتصميم المنشآت والمخططات الهندسية.",
      icon: "monitor",
      display_order: 3
    },
    {
      id: "sub-1-2-4",
      semester_id: "sem-1-2",
      name: "Mathematics",
      name_en: "Mathematics 2",
      name_ar: "الرياضيات 2",
      code: "PGE124",
      description: "طرق التكامل المتقدمة، الإحداثيات القطبية، المتجهات، والتطبيقات الهندسية في المساحات والحجوم.",
      icon: "calculator",
      display_order: 4
    },
    {
      id: "sub-1-2-5",
      semester_id: "sem-1-2",
      name: "Computer Programming 2",
      name_en: "Computer Programming 2",
      name_ar: "البرمجة الحاسوبية 2",
      code: "PGE125",
      description: "البرمجة المتقدمة والموجهة للكائنات (OOP)، الدوال الرياضية، وتطوير برامج تحليل البيانات الهندسية.",
      icon: "code",
      display_order: 5
    },
    {
      id: "sub-1-2-6",
      semester_id: "sem-1-2",
      name: "Geology 2",
      name_en: "Geology 2",
      name_ar: "الجيولوجيا 2",
      code: "PGE126",
      description: "الجيولوجيا التاريخية، التراكيب الجيولوجية، ودراسة البيئات الترسيبية المكونة للنفط والغاز.",
      icon: "pickaxe",
      display_order: 6
    },

    // ==========================================
    // المرحلة الثانية - الكورس الأول (8 مواد بالضبط)
    // ==========================================
    {
      id: "sub-2-1-1",
      semester_id: "sem-2-1",
      name: "Mathematics 3",
      name_en: "Mathematics 3",
      name_ar: "الرياضيات 3",
      code: "PGE211",
      description: "المعادلات التفاضلية الاعتيادية (ODEs)، تحويلات لابلاس، والمتسلسلات اللانهائية وتطبيقاتها الهندسية.",
      icon: "sigma",
      display_order: 1
    },
    {
      id: "sub-2-1-2",
      semester_id: "sem-2-1",
      name: "Thermodynamic",
      name_en: "Thermodynamic",
      name_ar: "الديناميكا الحرارية",
      code: "PGE212",
      description: "القانون الأول والثاني للثرموداينمك، دورات الطاقة والحرارة، توازن الأطوار وسلوك الغازات الحقيقية والمثالية.",
      icon: "flame",
      display_order: 2
    },
    {
      id: "sub-2-1-3",
      semester_id: "sem-2-1",
      name: "Fluid Mechanics",
      name_en: "Fluid Mechanics",
      name_ar: "ميكانيك الموائع",
      code: "PGE213",
      description: "سكون الموائع، حركة الموائع اللزجة، معادلة برنولي، وفقدان الضغط في خطوط الأنابيب النفطية.",
      icon: "droplet",
      display_order: 3
    },
    {
      id: "sub-2-1-4",
      semester_id: "sem-2-1",
      name: "Reservoir Petrophysics",
      name_en: "Reservoir Petrophysics",
      name_ar: "بتروفيزياء المكامن",
      code: "PGE214",
      description: "المسامية، النفاذية، التشبع المائي، الضغط الشعري، والبللية وحساب الحجم الأولي للنفط في المكمن.",
      icon: "layers",
      display_order: 4
    },
    {
      id: "sub-2-1-5",
      semester_id: "sem-2-1",
      name: "Stratigraphic & Structure Geology",
      name_en: "Stratigraphic & Structure Geology",
      name_ar: "الجيولوجيا الطباقية والتركيبية",
      code: "PGE215",
      description: "دراسة الفوالق والطيّات، المصائد النفطية التركيبية والطباقية، وتأريخ وتتابع الطبقات الصخرية.",
      icon: "land-plot",
      display_order: 5
    },
    {
      id: "sub-2-1-6",
      semester_id: "sem-2-1",
      name: "Human Rights",
      name_en: "Human Rights",
      name_ar: "حقوق الإنسان",
      code: "UHR101",
      description: "مبادئ ومفاهيم حقوق الإنسان، المواثيق الدولية، والحريات العامة في إطار الدستور والقانون.",
      icon: "scale",
      display_order: 6
    },
    {
      id: "sub-2-1-7",
      semester_id: "sem-2-1",
      name: "Pet. Properties",
      name_en: "Pet. Properties",
      name_ar: "خواص النفط والغاز (PVT)",
      code: "PGE217",
      description: "تحليل خواص موائع المكامن النفطية (PVT): الكثافة، اللزوجة، معامل حجم التكوين، ومخططات الأطوار الهيدروكربونية.",
      icon: "beaker",
      display_order: 7
    },
    {
      id: "sub-2-1-8",
      semester_id: "sem-2-1",
      name: "Computer Programming 3",
      name_en: "Computer Programming 3",
      name_ar: "البرمجة الحاسوبية 3",
      code: "PGE218",
      description: "البرمجة والتحليل العددي باستخدام بايثون أو C++ لمعالجة البيانات البتروفيزيائية والمكمنية.",
      icon: "file-code",
      display_order: 8
    },

    // ==========================================
    // المرحلة الثانية - الكورس الثاني (8 مواد بالضبط)
    // ==========================================
    {
      id: "sub-2-2-1",
      semester_id: "sem-2-2",
      name: "Strength of Materials",
      name_en: "Strength of Materials",
      name_ar: "مقاومة المواد",
      code: "PGE221",
      description: "الإجهاد والانفعال، إجهادات القص والانحناء، وتصميم الأنابيب وأوعية الضغط في الصناعة النفطية.",
      icon: "shield",
      display_order: 1
    },
    {
      id: "sub-2-2-2",
      semester_id: "sem-2-2",
      name: "Mathematics 4",
      name_en: "Mathematics 4",
      name_ar: "الرياضيات 4",
      code: "PGE222",
      description: "المعادلات التفاضلية الجزئية (PDEs)، متسلسلات فورييه، والتحليل المركب وتطبيقاتها في جريان المكامن.",
      icon: "function-square",
      display_order: 2
    },
    {
      id: "sub-2-2-3",
      semester_id: "sem-2-2",
      name: "Fundamentals of Petroleum Engineering",
      name_en: "Fundamentals of Petroleum Engineering",
      name_ar: "أساسيات هندسة النفط",
      code: "PGE223",
      description: "نظرة شاملة لصناعة النفط والغاز من الاستكشاف، الحفر، إكمال الآبار، الإنتاج، وحتى التكرير والتصدير.",
      icon: "wrench",
      display_order: 3
    },
    {
      id: "sub-2-2-4",
      semester_id: "sem-2-2",
      name: "Petroleum Geology",
      name_en: "Petroleum Geology",
      name_ar: "جيولوجيا النفط",
      code: "PGE224",
      description: "توليد وهجرة وتجمع النفط، صخور المصدر، صخور المكمن، صخور الغطاء، وتقييم الأنظمة البترولية.",
      icon: "globe",
      display_order: 4
    },
    {
      id: "sub-2-2-5",
      semester_id: "sem-2-2",
      name: "MATLAB",
      name_en: "MATLAB",
      name_ar: "تطبيقات ماتلاب الهندسية",
      code: "PGE225",
      description: "البرمجة باستخدام MATLAB، معالجة المصفوفات، الرسم البياني، وحل معادلات هندسة النفط عددياً.",
      icon: "cpu",
      display_order: 5
    },
    {
      id: "sub-2-2-6",
      semester_id: "sem-2-2",
      name: "Petroleum and Gas Pipeline",
      name_en: "Petroleum and Gas Pipeline",
      name_ar: "أنابيب النفط والغاز",
      code: "PGE226",
      description: "هيدروليكا خطوط الأنابيب، التصميم الميكانيكي، الحماية الكاثودية، ومحطات الضخ والضغط.",
      icon: "route",
      display_order: 6
    },
    {
      id: "sub-2-2-7",
      semester_id: "sem-2-2",
      name: "Democracy",
      name_en: "Democracy",
      name_ar: "الديمقراطية والحريات",
      code: "UDM102",
      description: "تاريخ الفكر الديمقراطي، التعددية السياسية، والمواطنة ودور المجتمع المدني.",
      icon: "landmark",
      display_order: 7
    },
    {
      id: "sub-2-2-8",
      semester_id: "sem-2-2",
      name: "الاحتمالية والإحصاء الهندسي",
      name_en: "Probability & Engineering Statistics",
      name_ar: "الاحتمالية والإحصاء الهندسي",
      code: "PGE228",
      description: "نظرية الاحتمالات، التوزيعات الإحصائية، الانحدار الخطي، وتحليل المخاطر واللايقين في المكامن النفطية.",
      icon: "bar-chart-3",
      display_order: 8
    },

    // ==========================================
    // المرحلة الثالثة - الكورس الأول (7 مواد بالضبط)
    // ==========================================
    {
      id: "sub-3-1-1",
      semester_id: "sem-3-1",
      name: "Drilling Engineering",
      name_en: "Drilling Engineering",
      name_ar: "هندسة الحفر",
      code: "PGE311",
      description: "مبادئ ومعدات عمليات حفر آبار النفط والغاز، ميكانيكا الحفر، سوائل الحفر وهيدروليكا قاع البئر.",
      icon: "cog",
      display_order: 1
    },
    {
      id: "sub-3-1-2",
      semester_id: "sem-3-1",
      name: "Pet. Eng. Economics 1",
      name_en: "Pet. Eng. Economics 1",
      name_ar: "اقتصاديات هندسة النفط 1",
      code: "PGE312",
      description: "التحليل الاقتصادي للمشاريع النفطية، القيمة الزمنية للنقود، التدفقات النقدية، وتقييم الجدوى الاقتصادية.",
      icon: "trending-up",
      display_order: 2
    },
    {
      id: "sub-3-1-3",
      semester_id: "sem-3-1",
      name: "Pet. Production Eng. 1",
      name_en: "Pet. Production Eng. 1",
      name_ar: "هندسة الإنتاج النفطي 1",
      code: "PGE313",
      description: "جريان الموائع من المكمن إلى رأس البئر، أداء الجريان الداخل (IPR)، والتحليل العقدي لمنظومات الإنتاج.",
      icon: "factory",
      display_order: 3
    },
    {
      id: "sub-3-1-4",
      semester_id: "sem-3-1",
      name: "Well Logging",
      name_en: "Well Logging",
      name_ar: "الجس البئري",
      code: "PGE314",
      description: "قياسات وتفسير مجسات الآبار السلكية والكهربائية والإشعاعية والصوتية لتحديد خواص الصخور والموائع.",
      icon: "activity",
      display_order: 4
    },
    {
      id: "sub-3-1-5",
      semester_id: "sem-3-1",
      name: "Mathematics",
      name_en: "Mathematics",
      name_ar: "الرياضيات المتقدمة",
      code: "PGE315",
      description: "التحليل الرياضي المتقدم، الحلول العددية للمعادلات التفاضلية، وطرق التقريب الرياضي للهندسة النفطية.",
      icon: "binary",
      display_order: 5
    },
    {
      id: "sub-3-1-6",
      semester_id: "sem-3-1",
      name: "Geophysics",
      name_en: "Geophysics",
      name_ar: "الجيوفيزياء",
      code: "PGE316",
      description: "المسوحات الزلزالية والجاذبية والمغناطيسية لاستكشاف التراكيب الجيولوجية الحاوية على الهيدروكربونات.",
      icon: "waves",
      display_order: 6
    },
    {
      id: "sub-3-1-7",
      semester_id: "sem-3-1",
      name: "Reservoir Fluid",
      name_en: "Reservoir Fluid",
      name_ar: "موائع المكامن النفطية",
      code: "PGE317",
      description: "سلوك ومخططات أطوار الهيدروكربونات، الخواص الترموديناميكية لغاز ومائع المكمن، وتحليلات PVT المخبرية.",
      icon: "droplet",
      display_order: 7
    },

    // ==========================================
    // المرحلة الثالثة - الكورس الثاني (7 مواد بالضبط)
    // ==========================================
    {
      id: "sub-3-2-1",
      semester_id: "sem-3-2",
      name: "Pet. Production Eng. 2",
      name_en: "Pet. Production Eng. 2",
      name_ar: "هندسة الإنتاج النفطي 2",
      code: "PGE321",
      description: "طرق الرفع الاصطناعي (المضخات الغاطسة ESP، مضخات قضيب المص، والرفع بالغاز)، ومعالجة مشاكل الإنتاج.",
      icon: "sliders",
      display_order: 1
    },
    {
      id: "sub-3-2-2",
      semester_id: "sem-3-2",
      name: "Reservoir Engineering",
      name_en: "Reservoir Engineering",
      name_ar: "هندسة المكامن",
      code: "PGE322",
      description: "معادلة موازنة المادة، آليات دفع المكمن الطبيعية، وحساب المخزون النفطي والغازي والتنبؤ بالأداء المستقبلي.",
      icon: "layers",
      display_order: 2
    },
    {
      id: "sub-3-2-3",
      semester_id: "sem-3-2",
      name: "Pollution",
      name_en: "Pollution",
      name_ar: "التلوث البيئي والسلامة المهنية",
      code: "PGE323",
      description: "معالجة المخلفات النفطية، الانبعاثات الغازية، حماية البيئة المائية والبرية، ومعايير السلامة المهنية HSE.",
      icon: "alert-triangle",
      display_order: 3
    },
    {
      id: "sub-3-2-4",
      semester_id: "sem-3-2",
      name: "Drilling Engineering 2",
      name_en: "Drilling Engineering 2",
      name_ar: "هندسة الحفر 2",
      code: "PGE324",
      description: "الحفر الموجه والأفقي، السيطرة على ضغوط الآبار وموانع الانفجار (BOP)، وتصميم أنابيب التبطين والتسميت.",
      icon: "drill",
      display_order: 4
    },
    {
      id: "sub-3-2-5",
      semester_id: "sem-3-2",
      name: "Formation Evaluation",
      name_en: "Formation Evaluation",
      name_ar: "تقييم التكوينات النفطية",
      code: "PGE325",
      description: "التكامل بين تسجيلات الآبار وعينات اللباب الصخري لتحليل النطاقات المنتجة وحساب التشبع النفطي.",
      icon: "file-search",
      display_order: 5
    },
    {
      id: "sub-3-2-6",
      semester_id: "sem-3-2",
      name: "Optimality",
      name_en: "Optimality",
      name_ar: "الأمثلية الهندسية",
      code: "PGE326",
      description: "خوارزميات وطرق الحل الأمثل (Optimization) لتشغيل الآبار وإدارة شبكات الإنتاج وتوزيع الضغوط.",
      icon: "target",
      display_order: 6
    },
    {
      id: "sub-3-2-7",
      semester_id: "sem-3-2",
      name: "Pet. Eng. Economics",
      name_en: "Pet. Eng. Economics",
      name_ar: "اقتصاديات هندسة النفط",
      code: "PGE327",
      description: "عقود النفط والغاز، الضرائب، تسعير المنتجات البترولية، إدارة المخاطر الاستثمارية، والقرارات التمويلية.",
      icon: "coins",
      display_order: 7
    },

    // ==========================================
    // المرحلة الرابعة - الكورس الأول (8 مواد بالضبط)
    // ==========================================
    {
      id: "sub-4-1-1",
      semester_id: "sem-4-1",
      name: "Renewable Energy",
      name_en: "Renewable Energy",
      name_ar: "الطاقة المتجددة",
      code: "PGE411",
      description: "مصادر الطاقة البديلة والنظيفة، الطاقة الشمسية والحرارية الأرضية، والتحول الطاقي في المنشآت الهندسية.",
      icon: "sun",
      display_order: 1
    },
    {
      id: "sub-4-1-2",
      semester_id: "sem-4-1",
      name: "EOR",
      name_en: "EOR",
      name_ar: "الاستخلاص المدعم للنفط (EOR)",
      code: "PGE412",
      description: "طرق الاستخلاص المدعم للنفط: الحقن الحراري، الغمر الكيميائي، وحقن الغازات القابلة للامتزاج وغير القابلة.",
      icon: "flame",
      display_order: 2
    },
    {
      id: "sub-4-1-3",
      semester_id: "sem-4-1",
      name: "Pet. Reservoir Eng.",
      name_en: "Pet. Reservoir Eng.",
      name_ar: "هندسة المكامن المتقدمة",
      code: "PGE413",
      description: "المحاكاة الرقمية للمكامن، نماذج الجريان متعدد الأطوار، وتحليل منحنيات التناقص الإنتاجي المتقدمة.",
      icon: "database",
      display_order: 3
    },
    {
      id: "sub-4-1-4",
      semester_id: "sem-4-1",
      name: "Drilling",
      name_en: "Drilling",
      name_ar: "عمليات وتقنيات الحفر المتقدمة",
      code: "PGE414",
      description: "تقنيات الحفر المتقدمة، حفر الآبار البحرية، حفر الضغط المدار (MPD)، والتعامل مع مشاكل استعصاء الأنابيب.",
      icon: "wrench",
      display_order: 4
    },
    {
      id: "sub-4-1-5",
      semester_id: "sem-4-1",
      name: "Eng. Ethics",
      name_en: "Eng. Ethics",
      name_ar: "أخلاقيات مهنة الهندسة",
      code: "PGE415",
      description: "المسؤولية المهنية والاجتماعية للمهندس، كودات السلوك الأخلاقي، السلامة العامة وحماية الملكية الفكرية.",
      icon: "shield-check",
      display_order: 5
    },
    {
      id: "sub-4-1-6",
      semester_id: "sem-4-1",
      name: "Project Planning & Management",
      name_en: "Project Planning & Management",
      name_ar: "تخطيط وإدارة المشاريع الهندسية",
      code: "PGE416",
      description: "جدولة المشاريع النفطية، إدارة المخاطر والتكاليف، مراقبة الجودة، واستخدام أسلوبي CPM و PERT في الإدارة.",
      icon: "calendar-check",
      display_order: 6
    },
    {
      id: "sub-4-1-7",
      semester_id: "sem-4-1",
      name: "Well Test",
      name_en: "Well Test",
      name_ar: "فحص واختبار الآبار",
      code: "PGE417",
      description: "اختبارات بناء وهبوط الضغط (Drawdown & Buildup)، تحديد معامل التضرر (Skin)، ونفاذية وضغط المكمن المتوسط.",
      icon: "gauge",
      display_order: 7
    },
    {
      id: "sub-4-1-8",
      semester_id: "sem-4-1",
      name: "Natural Gas",
      name_en: "Natural Gas",
      name_ar: "هندسة ومعالجة الغاز الطبيعي",
      code: "PGE418",
      description: "استخراج ومعالجة الغاز الطبيعي، إزالة مركبات الكبريت وتجفيف الغاز، ونقله وتخزينه وتسييله (LNG/LPG).",
      icon: "fuel",
      display_order: 8
    },

    // ==========================================
    // المرحلة الرابعة - الكورس الثاني (مادة واحدة مؤكدة)
    // ==========================================
    {
      id: "sub-4-2-1",
      semester_id: "sem-4-2",
      name: "Reservoir Management",
      name_en: "Reservoir Management",
      name_ar: "إدارة المكامن النفطية",
      code: "PGE421",
      description: "التخطيط الاستراتيجي المتكامل لتطوير الحقول، تتبع حركة السوائل، تعظيم القيمة الاستردادية وإطالة عمر الحقل.",
      icon: "briefcase",
      display_order: 1
    }
  ],

  // مواد دراسية حقيقية جاهزة للتحميل والمعاينة
  materials: [
    {
      id: "mat-1",
      subject_id: "sub-1-1-5", // Geology
      category: "lectures", // 'lectures', 'booklets', 'assignments', 'exams', 'resources'
      title: "Lecture 1: Introduction to Physical Geology & Earth Structure",
      description: "المحاضرة الأولى: مقدمة في الجيولوجيا الفيزيائية وتركيب طبقات الأرض الداخلية، القشرة والوشاح واللب.",
      file_path: "lectures/geology_lec1_intro.pdf",
      file_name: "Geology_Lecture_01_Introduction.pdf",
      file_size: "2.4 MB",
      file_type: "application/pdf",
      upload_date: "2026-10-10",
      lecture_number: 1
    },
    {
      id: "mat-2",
      subject_id: "sub-1-1-5", // Geology
      category: "lectures",
      title: "Lecture 2: Minerals & Rock-Forming Processes",
      description: "المحاضرة الثانية: المعادن المكونة للصخور، الخواص الفيزيائية والكيميائية للمعادن، ودورة الصخور.",
      file_path: "lectures/geology_lec2_minerals.pdf",
      file_name: "Geology_Lecture_02_Minerals.pdf",
      file_size: "3.1 MB",
      file_type: "application/pdf",
      upload_date: "2026-10-18",
      lecture_number: 2
    },
    {
      id: "mat-3",
      subject_id: "sub-1-1-5", // Geology
      category: "booklets",
      title: "Study Booklet: General Geology Lab Manual & Field Guide",
      description: "ملزمة المختبر العملي للجيولوجيا العامة: التعرف على العينات اليدوية للمعادن والصخور الرسوبية.",
      file_path: "booklets/geology_lab_handbook.pdf",
      file_name: "Geology_Lab_Manual_2026.pdf",
      file_size: "4.8 MB",
      file_type: "application/pdf",
      upload_date: "2026-10-05",
      lecture_number: null
    },
    {
      id: "mat-4",
      subject_id: "sub-1-1-5", // Geology
      category: "assignments",
      title: "Assignment 1: Plate Tectonics & Sedimentary Basins",
      description: "الواجب الدراسي الأول: دراسة حركة الصفائح التكتونية وعلاقتها بنشأة الأحواض الترسيبية في العراق.",
      file_path: "assignments/geology_assignment1.pdf",
      file_name: "Geology_Assignment_01.pdf",
      file_size: "1.2 MB",
      file_type: "application/pdf",
      upload_date: "2026-10-25",
      lecture_number: null
    },
    {
      id: "mat-5",
      subject_id: "sub-1-1-5", // Geology
      category: "exams",
      title: "Midterm Exam 2025-2026 with Solution Key",
      description: "أسئلة الامتحان النصفي للعام الدراسي الماضي مع الحلول النموذجية وتوزيع الدرجات.",
      file_path: "exams/geology_midterm_2025.pdf",
      file_name: "Geology_Midterm_Exam_Questions.pdf",
      file_size: "1.5 MB",
      file_type: "application/pdf",
      upload_date: "2026-11-02",
      lecture_number: null
    },
    {
      id: "mat-6",
      subject_id: "sub-2-1-4", // Reservoir Petrophysics
      category: "lectures",
      title: "Lecture 1: Reservoir Rock Properties & Core Porosity",
      description: "المحاضرة الأولى: الخواص البتروفيزيائية لصخور المكمن، المسامية الكلية والفعالة وطرق قياس اللباب الصخري.",
      file_path: "lectures/petrophysics_lec1.pdf",
      file_name: "Petrophysics_Lecture_01.pdf",
      file_size: "3.5 MB",
      file_type: "application/pdf",
      upload_date: "2026-10-12",
      lecture_number: 1
    },
    {
      id: "mat-7",
      subject_id: "sub-2-1-4", // Reservoir Petrophysics
      category: "lectures",
      title: "Lecture 2: Darcy's Law & Absolute Permeability Measurements",
      description: "المحاضرة الثانية: قانون دارسي في الجريان الخطي والشعاعي، قياس النفاذية المطلقة وتأثير كلينكنبرغ.",
      file_path: "lectures/petrophysics_lec2.pdf",
      file_name: "Petrophysics_Lecture_02.pdf",
      file_size: "2.9 MB",
      file_type: "application/pdf",
      upload_date: "2026-10-20",
      lecture_number: 2
    }
  ]
};

// فئات المواد الدراسية داخل صفحة المادة
const MATERIAL_CATEGORIES = [
  { id: "lectures", label_ar: "المحاضرات", label_en: "Lectures", icon: "book-open", hint: "المحاضرات النظرية والعلمية المرتبة تسلسلياً" },
  { id: "booklets", label_ar: "الملازم", label_en: "Study Booklets", icon: "file-text", hint: "الملازم المعتمدة والشروحات التلخيصية" },
  { id: "assignments", label_ar: "الواجبات", label_en: "Assignments", icon: "clipboard-list", hint: "الواجبات الهندسية ومشاريع التدريب" },
  { id: "exams", label_ar: "أسئلة الامتحانات", label_en: "Exam Questions", icon: "help-circle", hint: "نماذج الامتحانات الشهرية والنهائية السابقة" },
  { id: "resources", label_ar: "المصادر الإضافية", label_en: "Additional Resources", icon: "bookmark", hint: "الكتب والمراجع والمعايير العالمية API و SPE" }
];
