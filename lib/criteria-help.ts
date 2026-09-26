// Short plain-language descriptions shown under every field in the New Bid wizard.
// Rating scale for every criterion: 0 = N/A · 1 = very poor … 5 = excellent (higher is always better for us).

export type Help = { en: string; ar: string }

export const PROFILE_HELP: Record<string, Help> = {
  name:           { en: 'Official tender / project name as it appears on the RFP.', ar: 'الاسم الرسمي للمناقصة كما يظهر في وثائق الطرح.' },
  location:       { en: 'City or region where the works will be executed.', ar: 'المدينة أو المنطقة التي سيتم تنفيذ الأعمال فيها.' },
  type:           { en: 'Building = vertical works · Infrastructure = roads, utilities, networks · Industrial = plants and facilities.', ar: 'مباني = أعمال رأسية · بنية تحتية = طرق وشبكات ومرافق · صناعي = مصانع ومنشآت.' },
  estValue:       { en: 'Our estimated tender price in Saudi Riyals (full amount, not millions).', ar: 'السعر التقديري للعطاء بالريال السعودي (المبلغ كاملاً وليس بالملايين).' },
  size:           { en: 'Scale class of the project per the company classification: Medium/Small, Large or Mega.', ar: 'فئة حجم المشروع حسب تصنيف الشركة: متوسط/صغير، كبير أو ضخم.' },
  duration:       { en: 'Contract execution period, e.g. "24 months".', ar: 'مدة تنفيذ العقد، مثال: "24 شهرًا".' },
  tenderType:     { en: 'Open = public tender · Limited = invited bidders only · Negotiated = direct award / negotiation.', ar: 'مفتوح = مناقصة عامة · محدود = مدعوون فقط · تفاوضي = ترسية مباشرة أو تفاوض.' },
  date:           { en: 'Tender submission date. Drives the monthly charts.', ar: 'تاريخ تقديم العطاء. يُستخدم في الرسوم الشهرية.' },
  clientCategory: { en: 'Government ministry/authority, private developer, or semi-government (e.g. PIF company).', ar: 'جهة حكومية، أو مطور خاص، أو شبه حكومي (مثل شركات صندوق الاستثمارات).' },
  consultant:     { en: 'Supervising / design consultant named in the tender.', ar: 'الاستشاري المشرف أو المصمم المذكور في المناقصة.' },
  mainCompetitor: { en: 'The contractor most likely to beat us on this tender.', ar: 'المقاول الأكثر احتمالاً للمنافسة على هذه المناقصة.' },
}

export const CRITERIA_HELP: Record<string, Help> = {
  // Competitive Position
  relStrength:     { en: 'How strong is our relationship with the client and consultant? 5 = long trusted partner.', ar: 'مدى قوة علاقتنا بالعميل والاستشاري؟ 5 = شريك موثوق منذ فترة طويلة.' },
  budgetKnown:     { en: 'Do we know the client’s budget and is it funded? 5 = confirmed and approved.', ar: 'هل نعرف ميزانية العميل وهل هي ممولة؟ 5 = مؤكدة ومعتمدة.' },
  competitors:     { en: 'Competition level. 5 = few / weak competitors, 1 = many strong bidders.', ar: 'مستوى المنافسة. 5 = منافسون قليلون أو ضعفاء، 1 = منافسون كثيرون وأقوياء.' },
  limitedInv:      { en: 'Is the tender limited to a short invited list? 5 = very short list including us.', ar: 'هل المناقصة محصورة بقائمة مدعوين قصيرة؟ 5 = قائمة قصيرة جداً تشملنا.' },
  similarExp:      { en: 'Have we delivered similar projects (type, size, client)? 5 = several recent references.', ar: 'هل نفذنا مشاريع مشابهة (النوع والحجم والعميل)؟ 5 = مراجع حديثة متعددة.' },
  noPriceBreakers: { en: 'Absence of bidders known to under-price. 5 = no aggressive price-breakers expected.', ar: 'غياب منافسين معروفين بكسر الأسعار. 5 = لا يُتوقع وجود كاسري أسعار.' },
  techAdv:         { en: 'Do we have a technical edge (method, equipment, know-how)? 5 = clear differentiator.', ar: 'هل لدينا ميزة تقنية (منهجية أو معدات أو خبرة)؟ 5 = ميزة واضحة.' },
  withinExpertise: { en: 'Is the scope within our core expertise? 5 = fully core business.', ar: 'هل النطاق ضمن خبرتنا الأساسية؟ 5 = ضمن نشاطنا الأساسي بالكامل.' },
  lowChanges:      { en: 'Likelihood of few variations / change orders. 5 = stable, well-defined scope.', ar: 'احتمالية قلة أوامر التغيير. 5 = نطاق مستقر ومحدد جيداً.' },
  goodLocation:    { en: 'Site convenience: logistics, labour access, distance from our bases. 5 = ideal.', ar: 'ملاءمة الموقع: اللوجستيات والعمالة والمسافة من قواعدنا. 5 = مثالي.' },
  // Company Load Factor
  teamAvail:       { en: 'Are qualified PM / engineering staff free to run it? 5 = team ready now.', ar: 'هل يتوفر فريق إدارة وهندسة مؤهل؟ 5 = الفريق جاهز الآن.' },
  equipAvail:      { en: 'Is the required plant and equipment available? 5 = owned and free.', ar: 'هل المعدات المطلوبة متاحة؟ 5 = مملوكة ومتاحة.' },
  cashFlow:        { en: 'Can we finance the project until payments flow? 5 = comfortable cash position.', ar: 'هل يمكننا تمويل المشروع حتى بدء الدفعات؟ 5 = وضع نقدي مريح.' },
  currWorkload:    { en: 'Current workload capacity. 5 = plenty of spare capacity, 1 = overloaded.', ar: 'الطاقة الاستيعابية الحالية. 5 = طاقة فائضة كبيرة، 1 = محمّلون بالكامل.' },
  noImpactRunning: { en: 'Winning will not hurt running projects. 5 = no impact at all.', ar: 'الفوز لن يؤثر على المشاريع الجارية. 5 = لا تأثير إطلاقاً.' },
  // Contractual Risk
  ld:              { en: 'Liquidated damages terms. 5 = low / capped LDs, 1 = severe uncapped penalties.', ar: 'شروط غرامات التأخير. 5 = منخفضة أو محددة بسقف، 1 = غرامات شديدة بلا سقف.' },
  apg:             { en: 'Advance-payment guarantee burden. 5 = light / not required.', ar: 'عبء ضمان الدفعة المقدمة. 5 = خفيف أو غير مطلوب.' },
  perfBond:        { en: 'Performance bond size and terms. 5 = standard terms, easy release.', ar: 'قيمة وشروط ضمان الأداء. 5 = شروط قياسية وسهل الإفراج.' },
  retention:       { en: 'Retention terms. 5 = low retention, released promptly.', ar: 'شروط المحتجزات. 5 = نسبة منخفضة تُفرج بسرعة.' },
  // Technical Risk
  newSystem:       { en: 'Does it need systems new to us? 5 = all proven systems we know.', ar: 'هل يتطلب أنظمة جديدة علينا؟ 5 = جميعها أنظمة مجربة نعرفها.' },
  complexMEP:      { en: 'MEP complexity. 5 = simple MEP we can self-perform, 1 = highly complex.', ar: 'تعقيد الأعمال الكهروميكانيكية. 5 = بسيطة ننفذها ذاتياً، 1 = معقدة جداً.' },
  specialAuth:     { en: 'Special authority approvals (civil defence, SEC, NWC…). 5 = none / routine.', ar: 'موافقات الجهات الخاصة (الدفاع المدني، الكهرباء، المياه…). 5 = لا يوجد أو روتينية.' },
  // Commercial & Financial
  clientRep:       { en: 'Client reputation for fairness and paying on time. 5 = excellent payer.', ar: 'سمعة العميل في العدالة والسداد في الوقت. 5 = ممتاز في السداد.' },
  clearDwgs:       { en: 'Quality and completeness of drawings and specs. 5 = clear, IFC-level.', ar: 'جودة واكتمال المخططات والمواصفات. 5 = واضحة وجاهزة للتنفيذ.' },
  advPayment:      { en: 'Is an advance payment offered? 5 = generous advance offered.', ar: 'هل تُمنح دفعة مقدمة؟ 5 = دفعة مقدمة سخية.' },
  payments:        { en: 'Interim payment terms. 5 = monthly and paid on time.', ar: 'شروط الدفعات المرحلية. 5 = شهرية وتُدفع في موعدها.' },
  finDuration:     { en: 'Is the financial exposure period short? 5 = short duration / low exposure.', ar: 'هل فترة الانكشاف المالي قصيرة؟ 5 = مدة قصيرة وانكشاف منخفض.' },
}

export const GROUP_HELP: Record<string, Help> = {
  competitive: { en: 'How well-placed we are to win against the competition.', ar: 'مدى قدرتنا على الفوز أمام المنافسين.' },
  load:        { en: 'Whether we have the capacity to deliver right now.', ar: 'مدى توفر الطاقة لدينا للتنفيذ الآن.' },
  contractual: { en: 'How fair the contract conditions are. Higher = lower risk.', ar: 'مدى عدالة الشروط التعاقدية. أعلى = مخاطر أقل.' },
  technical:   { en: 'How technically risky the scope is. Higher = lower risk.', ar: 'مدى المخاطر التقنية في النطاق. أعلى = مخاطر أقل.' },
  commercial:  { en: 'Payment and financial health of the deal. Below the flag threshold triggers a commercial review warning.', ar: 'الصحة المالية وشروط الدفع. أقل من حد التنبيه يُظهر تحذير مراجعة تجارية.' },
}
