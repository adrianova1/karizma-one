import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { trackEvent } from '../lib/tracking';
import { 
  GraduationCap, BookOpen, Trophy, Award, CheckCircle2, 
  HelpCircle, ChevronRight, PlayCircle, Star, ArrowLeft, Heart, 
  Sparkles, Flame, UserCheck, Check, AlertCircle, FileText, Plus, Edit3,
  Send, ExternalLink, Bot, Copy, Search, Filter, MessageSquare, Lightbulb, Bookmark, Zap
} from 'lucide-react';
import { DEFAULT_COURSES, Course, Chapter, Lesson, QuizQuestion } from '../data/academyData.js';
import { VIRTUAL_STARTER_EXAMPLES, VirtualStarterExample } from '../data/starterCourseData.js';
import ManageAcademyModal from './ManageAcademyModal.js';

interface AcademyViewProps {
  token: string;
}

export default function AcademyView({ token }: AcademyViewProps) {
  const [userXP, setUserXP] = useState(350);
  const [completedLessons, setCompletedLessons] = useState<string[]>(['c1_ch1_l1']);
  
  // Courses state with local storage persistence and auto-merge
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const saved = localStorage.getItem('karizma_academy_courses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasStarterCourse = parsed.some((c: Course) => c.id === 'course_starter_academy');
          if (!hasStarterCourse) {
            return DEFAULT_COURSES;
          }
          // Always keep starter academy course updated with latest lessons
          return parsed.map((c: Course) => {
            if (c.id === 'course_starter_academy') {
              const latestStarter = DEFAULT_COURSES.find(dc => dc.id === 'course_starter_academy');
              return latestStarter || c;
            }
            return c;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load saved courses:', err);
    }
    return DEFAULT_COURSES;
  });

  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeCourseTab, setActiveCourseTab] = useState<'syllabus' | 'starters'>('syllabus');
  
  // Search and filter state
  const [globalSearch, setGlobalSearch] = useState('');
  const [starterSearch, setStarterSearch] = useState('');
  const [selectedStarterCategory, setSelectedStarterCategory] = useState<string>('all');
  const [copiedStarterId, setCopiedStarterId] = useState<number | null>(null);
  const [copiedLessonText, setCopiedLessonText] = useState(false);
  
  // Quiz state
  const [activeQuizChapter, setActiveQuizChapter] = useState<Chapter | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswerIdx, setSelectedAnswerIdx] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [showCertificate, setShowCertificate] = useState(false);

  const handleSaveCourses = (newCourses: Course[]) => {
    setCourses(newCourses);
    try {
      localStorage.setItem('karizma_academy_courses', JSON.stringify(newCourses));
    } catch (e) {
      console.error('Failed to save academy courses:', e);
    }

    if (selectedCourse) {
      const updatedSel = newCourses.find(c => c.id === selectedCourse.id);
      if (updatedSel) setSelectedCourse(updatedSel);
    }
  };

  const renderBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'BookOpen': return <BookOpen className="w-5 h-5 text-amber-400" />;
      case 'Flame': return <Flame className="w-5 h-5 text-amber-400" />;
      case 'Trophy': return <Trophy className="w-5 h-5 text-amber-400" />;
      default: return <Award className="w-5 h-5 text-amber-400" />;
    }
  };

  const getUserLevelInfo = (xp: number) => {
    if (xp < 250) return { level: 1, title: 'نوآموز کاریزما', minXP: 0, maxXP: 250, color: 'text-slate-300', badge: 'نوآموز' };
    if (xp < 600) return { level: 2, title: 'برنز - کلام روان', minXP: 250, maxXP: 600, color: 'text-amber-500', badge: 'برنز' };
    if (xp < 1200) return { level: 3, title: 'نقره - نفوذ اجتماعی', minXP: 600, maxXP: 1200, color: 'text-slate-200', badge: 'نقره' };
    if (xp < 2500) return { level: 4, title: 'طلایی - استاد گفتگو', minXP: 1200, maxXP: 2500, color: 'text-amber-400', badge: 'طلایی' };
    if (xp < 5000) return { level: 5, title: 'پلاتین - کاریزمای مطلق', minXP: 2500, maxXP: 5000, color: 'text-cyan-400', badge: 'پلاتین' };
    return { level: 6, title: 'الماس - استاد بزرگ ارتباطات', minXP: 5000, maxXP: 10000, color: 'text-purple-400', badge: 'الماس' };
  };

  const levelInfo = getUserLevelInfo(userXP);
  const levelProgress = Math.min(100, Math.max(0, ((userXP - levelInfo.minXP) / (levelInfo.maxXP - levelInfo.minXP)) * 100));

  const getUsername = () => {
    try {
      const savedUser = localStorage.getItem('karizma_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        return parsed.username || 'کاربر کاریزما';
      }
    } catch {}
    return 'کاربر کاریزما';
  };

  const handleLessonComplete = (lesson: Lesson) => {
    if (!completedLessons.includes(lesson.id)) {
      setCompletedLessons(prev => [...prev, lesson.id]);
      setUserXP(prev => prev + lesson.xp);
      trackEvent('academy_lesson_completion', 'academy', {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        xpGained: lesson.xp
      });

      if (token) {
        fetch('/api/skill-reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            skillId: lesson.id,
            skillTitle: lesson.title,
            score: 100,
            status: 'completed',
            notes: `تکمیل موفق درس آموزشی: ${lesson.title}`
          })
        }).catch(err => console.error('Skill report save error:', err));
      }
    }
  };

  const handleStartQuiz = (chapter: Chapter) => {
    setActiveQuizChapter(chapter);
    setCurrentQuestionIdx(0);
    setSelectedAnswerIdx(null);
    setQuizSubmitted(false);
    setQuizScore(0);
    trackEvent('academy_quiz_started', 'academy', { chapterId: chapter.id, chapterTitle: chapter.title });
  };

  const handleAnswerSelect = (idx: number) => {
    if (quizSubmitted) return;
    setSelectedAnswerIdx(idx);
  };

  const handleQuizSubmit = () => {
    if (selectedAnswerIdx === null || !activeQuizChapter) return;
    setQuizSubmitted(true);
    const isCorrect = selectedAnswerIdx === activeQuizChapter.quiz[currentQuestionIdx].correctIdx;
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    if (!activeQuizChapter) return;
    if (currentQuestionIdx < activeQuizChapter.quiz.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedAnswerIdx(null);
      setQuizSubmitted(false);
    } else {
      const earnedXP = quizScore * 20;
      setUserXP(prev => prev + earnedXP);
      trackEvent('academy_quiz_completed', 'academy', { 
        chapterId: activeQuizChapter.id, 
        score: quizScore, 
        total: activeQuizChapter.quiz.length,
        xpEarned: earnedXP
      });
      setActiveQuizChapter(null);
    }
  };

  const handleCopyStarter = (starter: VirtualStarterExample) => {
    navigator.clipboard.writeText(starter.content);
    setCopiedStarterId(starter.id);
    setTimeout(() => setCopiedStarterId(null), 2000);
  };

  const handleCopyLesson = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedLessonText(true);
    setTimeout(() => setCopiedLessonText(false), 2000);
  };

  // Filter virtual starters
  const starterCategories = [
    'all',
    'طنز و شوخ‌طبعی',
    'کنایی و فانتزی',
    'تمجید خلاقانه',
    'نقش‌آفرینی و سناریو',
    'استعاری و ورزشی',
    'ادبی و تمثیلی',
    'مدیریت رد شدن و اعتماد به نفس',
    'شوک و غلو',
    'جسورانه و بااعتمادبه‌نفس'
  ];

  const filteredStarters = VIRTUAL_STARTER_EXAMPLES.filter(s => {
    const matchesCat = selectedStarterCategory === 'all' || s.category === selectedStarterCategory;
    const query = starterSearch.trim().toLowerCase();
    const matchesQuery = !query || 
      s.title.toLowerCase().includes(query) ||
      s.content.toLowerCase().includes(query) ||
      s.tags.some(t => t.toLowerCase().includes(query)) ||
      (s.notes && s.notes.toLowerCase().includes(query));
    return matchesCat && matchesQuery;
  });

  // Global courses filter
  const filteredCourses = courses.filter(c => {
    if (!globalSearch.trim()) return true;
    const q = globalSearch.trim().toLowerCase();
    return c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.chapters.some(ch => 
        ch.title.toLowerCase().includes(q) || 
        ch.lessons.some(l => l.title.toLowerCase().includes(q) || l.content.toLowerCase().includes(q))
      );
  });

  return (
    <div id="academy-root-view" className="space-y-8 animate-fade-in pb-12">
      
      {/* Header & User Level Status */}
      <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-tr from-sky-500/20 to-purple-500/20 rounded-2xl border border-sky-500/30 text-sky-400 shadow-inner">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white">آکادمی تخصصی کاریزما و فن بیان</h1>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                  آموزش‌های کاربردی
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">دوره جامع استارتر مجازی، روان‌شناسی اوپنر، زبان بدن و روتین‌های پیشرفته</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-mono">رتبه و سطح علمی</span>
              <span className={`text-xs font-bold ${levelInfo.color}`}>{levelInfo.title}</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-left font-mono">
              <span className="text-[10px] text-slate-400 block">امتیاز کسب‌شده (XP)</span>
              <span className="text-xs font-bold text-amber-400">{userXP} XP</span>
            </div>
          </div>
        </div>

        {/* Progress to Next Level */}
        <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">پیشرفت تا ارتقا به سطح بعد ({levelInfo.badge})</span>
            <span className="font-mono text-slate-300 font-bold">{Math.round(levelProgress)}%</span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all" style={{ width: `${levelProgress}%` }} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* Certificate Modal */}
        {showCertificate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[60] overflow-y-auto"
            onClick={() => setShowCertificate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0f1115] border-4 border-[#c5a880] max-w-2xl w-full p-8 md:p-12 text-center rounded-3xl relative shadow-2xl space-y-8 font-sans"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-2 left-2 right-2 bottom-2 border border-[#c5a880]/40 rounded-2xl pointer-events-none" />
              <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-dashed border-[#c5a880]/20 rounded-xl pointer-events-none" />

              <div className="space-y-2">
                <span className="text-[#c5a880] text-xs font-mono font-bold tracking-[0.3em] block">CERTIFICATE OF CHARISMA</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">گواهی‌نامه رسمی مهارت گفتگو</h2>
              </div>

              <div className="py-6 space-y-4">
                <span className="text-slate-400 text-xs block">بدین‌وسیله تایید می‌گردد که کاربر با نام کاربری:</span>
                <span className="text-2xl font-bold text-[#c5a880] block font-mono border-b border-[#c5a880]/30 pb-2 max-w-xs mx-auto">
                  {getUsername()}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed max-w-lg mx-auto">
                  با گذراندن موفقیت‌آمیز دوره‌های پیشرفته <strong className="text-white">کاریزما، خودباوری کلامی، استارترهای مجازی و شروع مکالمه</strong> کاریزما سنتر و با کسب امتیاز علمی لازم، شایستگی لازم جهت مدیریت هوشمند گفتگوها و ارتباطات موثر اجتماعی را دارا می‌باشد.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-900">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">تاریخ صدور:</span>
                  <span className="text-xs font-bold text-slate-300 font-mono">1405/04/17</span>
                </div>
                <div className="text-left space-y-1">
                  <span className="text-[10px] text-slate-500 block">امضای ناظر:</span>
                  <span className="text-xs font-bold text-[#c5a880] italic block font-mono">Charisma Director</span>
                </div>
              </div>

              <button
                onClick={() => setShowCertificate(false)}
                className="bg-[#c5a880] hover:bg-[#b29772] text-black font-bold text-xs py-2.5 px-6 rounded-xl transition cursor-pointer"
              >
                بستن و ذخیره گواهی
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Active Quiz View */}
        {activeQuizChapter ? (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="glass-card rounded-3xl p-6 md:p-8 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">آزمون مهارتی فصل: {activeQuizChapter.title}</h2>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                سوال {currentQuestionIdx + 1} از {activeQuizChapter.quiz.length}
              </span>
            </div>

            <div className="space-y-5">
              <h3 className="text-sm md:text-base font-semibold text-slate-100">
                {activeQuizChapter.quiz[currentQuestionIdx].question}
              </h3>

              <div className="space-y-2.5">
                {activeQuizChapter.quiz[currentQuestionIdx].options.map((opt, oIdx) => {
                  const optionLetters = ['الف', 'ب', 'ج', 'د'];
                  const isSelected = selectedAnswerIdx === oIdx;
                  let optStyle = "bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-900";
                  
                  if (isSelected) {
                    optStyle = "bg-sky-500/10 text-sky-400 border-sky-500/30 font-semibold";
                  }
                  
                  if (quizSubmitted) {
                    const isCorrect = oIdx === activeQuizChapter.quiz[currentQuestionIdx].correctIdx;
                    if (isCorrect) {
                      optStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold";
                    } else if (isSelected) {
                      optStyle = "bg-red-500/15 text-red-400 border-red-500/30";
                    } else {
                      optStyle = "bg-slate-900/20 text-slate-500 border-slate-900";
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleAnswerSelect(oIdx)}
                      disabled={quizSubmitted}
                      className={`w-full text-right p-3.5 sm:p-4 rounded-xl text-xs border transition flex items-center justify-between gap-3 ${optStyle} ${!quizSubmitted ? 'cursor-pointer active:scale-99' : 'cursor-default'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0 font-sans">
                          {optionLetters[oIdx] || oIdx + 1}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {quizSubmitted && oIdx === activeQuizChapter.quiz[currentQuestionIdx].correctIdx && (
                        <Check className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {quizSubmitted && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <AlertCircle className="w-4 h-4 text-sky-400" />
                    <span>تحلیل پاسخ علمی تشریحی:</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeQuizChapter.quiz[currentQuestionIdx].explanation}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                {!quizSubmitted ? (
                  <button
                    onClick={handleQuizSubmit}
                    disabled={selectedAnswerIdx === null}
                    className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs py-3 px-6 rounded-xl cursor-pointer"
                  >
                    ثبت پاسخ نهایی
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuizQuestion}
                    className="bg-gradient-to-r from-sky-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white font-bold text-xs py-3 px-6 rounded-xl cursor-pointer"
                  >
                    {currentQuestionIdx < activeQuizChapter.quiz.length - 1 ? 'سوال بعدی' : 'پایان آزمون فصل'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : selectedLesson ? (
          /* Active Lesson Content View */
          <motion.div
            key="lesson"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="glass-card rounded-3xl p-6 md:p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedLesson(null)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white cursor-pointer transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>بازگشت به سرفصل‌های دوره</span>
              </button>

              <button
                onClick={() => handleCopyLesson(selectedLesson.content)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedLessonText ? 'متن کپی شد!' : 'کپی کل متن درس'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2.5 py-0.5 rounded-full border border-sky-500/20 font-mono font-bold">
                  آموزش جامع متنی
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-mono">
                  {selectedLesson.xp} XP
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white">{selectedLesson.title}</h2>
              <div className="text-[11px] text-slate-400 flex items-center gap-4">
                <span>مدت زمان تقریبی: {selectedLesson.duration}</span>
                <span>وضعیت: {completedLessons.includes(selectedLesson.id) ? 'تکمیل‌شده' : 'در حال مطالعه'}</span>
              </div>
            </div>

            {/* Content Display */}
            <div className="bg-slate-950/60 border border-slate-800/80 p-6 md:p-8 rounded-2xl text-xs md:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line space-y-4 shadow-inner">
              {selectedLesson.content}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-900">
              <span className="text-xs text-slate-400">پس از مطالعه کامل درس، با ثبت تایید امتیاز علمی خود را دریافت کنید.</span>
              <button
                onClick={() => {
                  handleLessonComplete(selectedLesson);
                  setSelectedLesson(null);
                }}
                className="w-full md:w-auto bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-xs py-3 px-8 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span>مطالعه کردم، تایید درس و دریافت امتیاز</span>
              </button>
            </div>
          </motion.div>
        ) : selectedCourse ? (
          /* Chapters & Syllabus / Starters Reference View */
          <motion.div
            key="course-detail"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-card rounded-3xl p-6 md:p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedCourse(null)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white cursor-pointer transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>بازگشت به لیست دوره‌های آکادمی</span>
              </button>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-3 py-1.5 flex items-center gap-2">
                {renderBadgeIcon(selectedCourse.badgeIconName)}
                <span className="text-[11px] font-bold text-slate-300">مدال: {selectedCourse.badgeName}</span>
              </div>
            </div>

            <div className="space-y-3 border-b border-slate-900 pb-5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-md font-bold font-mono">
                  {selectedCourse.difficulty}
                </span>
                <span className="text-xs text-slate-400">
                  {selectedCourse.chapters.length} فصل | {selectedCourse.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)} درس کامل
                </span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black text-white">{selectedCourse.title}</h2>
                {selectedCourse.id === 'course_starter_academy' && (
                  <span className="text-[11px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md font-mono">
                    #مخصوص_آقایان
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">{selectedCourse.description}</p>
            </div>

            {/* Navigation Tabs for Starter Course */}
            {selectedCourse.id === 'course_starter_academy' && (
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveCourseTab('syllabus')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeCourseTab === 'syllabus'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>سرفصل‌ها و دروس آموزشی (۱۹ درس اصلی + آزمون‌ها)</span>
                </button>

                <button
                  onClick={() => setActiveCourseTab('starters')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeCourseTab === 'starters'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>بانک ۲۹ نمونه استارتر مجازی و متریال تمرینی (Virtual Starter Reference)</span>
                </button>
              </div>
            )}

            {/* Tab 1: Syllabus / Chapters */}
            {activeCourseTab === 'syllabus' ? (
              <div className="space-y-6">
                {selectedCourse.chapters.map((chapter) => (
                  <div key={chapter.id} className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-sky-400" />
                        <h3 className="text-sm font-bold text-white">{chapter.title}</h3>
                      </div>
                      {chapter.quiz && chapter.quiz.length > 0 && (
                        <button
                          onClick={() => handleStartQuiz(chapter)}
                          className="text-[11px] bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20 rounded-xl px-3.5 py-1.5 cursor-pointer transition font-medium flex items-center gap-1.5"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>آزمون این فصل ({chapter.quiz.length} سوال | ۴۰ امتیاز)</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {chapter.lessons.map((lesson) => {
                        const isCompleted = completedLessons.includes(lesson.id);
                        return (
                          <div
                            key={lesson.id}
                            className={`p-4 rounded-xl border flex justify-between items-center transition-all ${
                              isCompleted 
                                ? 'bg-emerald-500/5 border-emerald-500/10' 
                                : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <button
                                onClick={() => setSelectedLesson(lesson)}
                                className={`p-2 rounded-xl cursor-pointer shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-400'}`}
                              >
                                <PlayCircle className="w-5 h-5" />
                              </button>
                              <div className="truncate">
                                <h4 className="text-xs font-bold text-slate-100 truncate">{lesson.title}</h4>
                                <span className="text-[10px] text-slate-500">طول درس: {lesson.duration} | {lesson.xp} XP</span>
                              </div>
                            </div>

                            {isCompleted ? (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 shrink-0">
                                <Check className="w-3 h-3" /> پاس شده
                              </span>
                            ) : (
                              <button
                                onClick={() => setSelectedLesson(lesson)}
                                className="text-[10px] text-sky-400 hover:underline cursor-pointer shrink-0"
                              >
                                مطالعه درس
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Tab 2: Virtual Starter Reference and Practice Material */
              <div className="space-y-6">
                <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>بانک استارترهای مجازی و تمرین آموزشی (۲۹ نمونه معتبر)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        نمونه‌های کاربردی برای الگوبرداری و تمرین باز کردن سر صحبت در چت، دایرکت و شبکه‌های اجتماعی
                      </p>
                    </div>

                    <div className="relative w-full md:w-72">
                      <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="جستجو در متن یا تگ‌های ۲۹ استارتر..."
                        value={starterSearch}
                        onChange={e => setStarterSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                      />
                    </div>
                  </div>

                  {/* Category Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0 ml-1">
                      <Filter className="w-3 h-3" /> دسته‌بندی:
                    </span>
                    {starterCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedStarterCategory(cat)}
                        className={`px-3 py-1 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                          selectedStarterCategory === cat
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {cat === 'all' ? 'همه موارد' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Starters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStarters.map(item => (
                    <div
                      key={item.id}
                      className="bg-slate-900/40 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-mono">
                            {item.category}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">#{item.id}</span>
                        </div>

                        <h4 className="text-xs font-extrabold text-white">{item.title}</h4>

                        <div className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-xl text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                          {item.content}
                        </div>

                        {item.notes && (
                          <div className="bg-sky-500/5 border border-sky-500/10 p-2.5 rounded-lg flex items-start gap-2 text-[11px] text-sky-300">
                            <Lightbulb className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                            <span>نکته آموزشی: {item.notes}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded-md">
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={() => handleCopyStarter(item)}
                          className="text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedStarterId === item.id ? 'کپی شد!' : 'کپی متن'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* Courses Showcase Grid (Main view) */
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Search Courses & Lessons */}
            <div className="relative">
              <Search className="w-4 h-4 absolute right-4 top-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="جستجو در تمام دوره‌ها، سرفصل‌ها، دروس آموزشی و اوپنرها..."
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl pr-11 pl-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
            </div>

            {/* Certificate Request Banner */}
            <div className="bg-gradient-to-r from-purple-900/20 to-sky-900/20 border border-purple-500/20 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl shrink-0">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">دریافت گواهی‌نامه رسمی مهارت کاریزما</h3>
                    <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                      سطح برنز به بالا (۶۰۰+ XP)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">با رسیدن به سطح برنز (کسب حداقل ۶۰۰ امتیاز) و قبولی در آزمون سرفصل‌ها می‌توانید گواهی رسمی کاریزما سنتر را دریافت نمایید.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCertificate(true)}
                disabled={userXP < 600}
                className="w-full md:w-auto bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs py-3 px-6 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-98"
              >
                <FileText className="w-4 h-4" />
                <span>{userXP >= 600 ? 'مشاهده و صدور مدرک' : 'نیازمند ۶۰۰ امتیاز (قفل)'}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
              <span className="text-xs font-bold text-slate-400 block">مسیرهای آموزشی فعال آکادمی کاریزما سنتر (شامل سرفصل‌ها، دروس جامع و آزمون)</span>
              <button
                onClick={() => setShowManageModal(true)}
                className="bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer transition flex items-center gap-1.5 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>مدیریت / افزودن فصل و درس جدید</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCourses.map(course => (
                <div
                  key={course.id}
                  className={`glass-card rounded-3xl p-5 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-5 ${
                    course.id === 'course_starter_academy' ? 'border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-900 text-sky-400 border border-slate-800 px-2 py-0.5 rounded-md font-bold font-mono">
                          {course.difficulty}
                        </span>
                        {course.id === 'course_starter_academy' && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <Flame className="w-3 h-3 text-amber-400" /> دوره جامع و عملی
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">مدال دوره: {course.badgeName}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-white">{course.title}</h3>
                      {course.id === 'course_starter_academy' && (
                        <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md font-mono">
                          #مخصوص_آقایان
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-900/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 text-xs">
                      <BookOpen className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-400">سیلابس: {course.chapters.length} فصل ({course.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)} درس کامل)</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedCourse(course);
                        setActiveCourseTab('syllabus');
                      }}
                      className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                    >
                      ورود به دوره
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <ManageAcademyModal
        show={showManageModal}
        onClose={() => setShowManageModal(false)}
        courses={courses}
        onSaveCourses={handleSaveCourses}
      />

    </div>
  );
}
