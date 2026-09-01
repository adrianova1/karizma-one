import React, { useState } from 'react';
import { X, Plus, Edit3, Trash2, BookOpen, HelpCircle, FileText, Check, AlertCircle } from 'lucide-react';
import { Course, Chapter, Lesson, QuizQuestion } from '../data/academyData.js';

interface ManageAcademyModalProps {
  show: boolean;
  onClose: () => void;
  courses: Course[];
  onSaveCourses: (updated: Course[]) => void;
}

export default function ManageAcademyModal({
  show,
  onClose,
  courses,
  onSaveCourses
}: ManageAcademyModalProps) {
  const [activeTab, setActiveTab] = useState<'add_chapter' | 'add_lesson' | 'add_quiz'>('add_lesson');

  // Selected scope
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(courses[0]?.chapters[0]?.id || '');

  // Form states - Add Chapter
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // Form states - Add Lesson
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDuration, setLessonDuration] = useState('۸ دقیقه');
  const [lessonXP, setLessonXP] = useState(50);
  const [lessonContent, setLessonContent] = useState('');

  // Form states - Add Quiz
  const [quizQuestion, setQuizQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [opt4, setOpt4] = useState('');
  const [correctIdx, setCorrectIdx] = useState<number>(0);
  const [explanation, setExplanation] = useState('');

  if (!show) return null;

  const currentCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
  const currentChapter = currentCourse?.chapters.find(ch => ch.id === selectedChapterId) || currentCourse?.chapters[0];

  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) {
      alert('لطفاً عنوان فصل را وارد کنید.');
      return;
    }

    const updatedCourses = courses.map(course => {
      if (course.id === selectedCourseId) {
        const newChapter: Chapter = {
          id: `ch_custom_${Date.now()}`,
          title: newChapterTitle.trim(),
          lessons: [],
          quiz: []
        };
        return {
          ...course,
          chapters: [...course.chapters, newChapter]
        };
      }
      return course;
    });

    onSaveCourses(updatedCourses);
    setNewChapterTitle('');
    alert('فصل جدید با موفقیت اضافه شد!');
  };

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim() || !lessonContent.trim()) {
      alert('لطفاً عنوان و متن آموزش درس را کامل وارد نمایید.');
      return;
    }

    const newLesson: Lesson = {
      id: `les_custom_${Date.now()}`,
      title: lessonTitle.trim(),
      duration: lessonDuration.trim() || '۸ دقیقه',
      xp: Number(lessonXP) || 50,
      content: lessonContent.trim()
    };

    const updatedCourses = courses.map(course => {
      if (course.id === selectedCourseId) {
        const updatedChapters = course.chapters.map(ch => {
          if (ch.id === selectedChapterId) {
            return {
              ...ch,
              lessons: [...ch.lessons, newLesson]
            };
          }
          return ch;
        });
        return { ...course, chapters: updatedChapters };
      }
      return course;
    });

    onSaveCourses(updatedCourses);
    setLessonTitle('');
    setLessonContent('');
    alert('درس آموزشی جدید با موفقیت اضافه گردید.');
  };

  const handleAddQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizQuestion.trim() || !opt1.trim() || !opt2.trim() || !opt3.trim() || !opt4.trim()) {
      alert('لطفاً سوال و هر ۴ گزینه پاسخ را وارد کنید.');
      return;
    }

    const newQuiz: QuizQuestion = {
      id: `q_custom_${Date.now()}`,
      question: quizQuestion.trim(),
      options: [opt1.trim(), opt2.trim(), opt3.trim(), opt4.trim()],
      correctIdx: correctIdx,
      explanation: explanation.trim() || 'تحلیل پاسخ بر اساس اصول کاریزمای کلامی است.'
    };

    const updatedCourses = courses.map(course => {
      if (course.id === selectedCourseId) {
        const updatedChapters = course.chapters.map(ch => {
          if (ch.id === selectedChapterId) {
            return {
              ...ch,
              quiz: [...ch.quiz, newQuiz]
            };
          }
          return ch;
        });
        return { ...course, chapters: updatedChapters };
      }
      return course;
    });

    onSaveCourses(updatedCourses);
    setQuizQuestion('');
    setOpt1('');
    setOpt2('');
    setOpt3('');
    setOpt4('');
    setExplanation('');
    alert('سوال آزمون جدید با موفقیت ثبت شد.');
  };

  const handleDeleteLesson = (courseId: string, chapterId: string, lessonId: string) => {
    if (!confirm('آیا از حذف این درس اطمینان دارید؟')) return;
    const updated = courses.map(c => {
      if (c.id === courseId) {
        return {
          ...c,
          chapters: c.chapters.map(ch => {
            if (ch.id === chapterId) {
              return {
                ...ch,
                lessons: ch.lessons.filter(l => l.id !== lessonId)
              };
            }
            return ch;
          })
        };
      }
      return c;
    });
    onSaveCourses(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] overflow-y-auto" style={{ direction: 'rtl' }}>
      <div className="bg-[#0f1117] border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 relative shadow-2xl text-right my-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">مدیریت و افزودن محتوای آکادمی کاریزما</h2>
              <p className="text-[11px] text-slate-400">افزودن فصل، دروس مهارتی جدید و طراحی سوالات آزمون با پاسخ صحیح متغیر</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-800/80 pb-3 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('add_lesson')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'add_lesson'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>افزودن درس آموزشی</span>
          </button>

          <button
            onClick={() => setActiveTab('add_quiz')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'add_quiz'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>طراحی سوال آزمون</span>
          </button>

          <button
            onClick={() => setActiveTab('add_chapter')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'add_chapter'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>ایجاد فصل جدید</span>
          </button>
        </div>

        {/* Course & Chapter Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl shrink-0">
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">انتخاب دوره:</label>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                const cId = e.target.value;
                setSelectedCourseId(cId);
                const found = courses.find(c => c.id === cId);
                if (found && found.chapters.length > 0) {
                  setSelectedChapterId(found.chapters[0].id);
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">انتخاب فصل:</label>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              {currentCourse?.chapters.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.title} ({ch.lessons.length} درس)</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto space-y-6 pr-1 grow">
          
          {/* Tab: Add Chapter */}
          {activeTab === 'add_chapter' && (
            <form onSubmit={handleAddChapter} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">عنوان فصل جدید:</label>
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="مثلاً: فصل سوم: مدیریت بحران کلامی و مذاکره پیشرفته"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-3 rounded-xl cursor-pointer transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت فصل جدید در دوره انتخاب شده</span>
              </button>
            </form>
          )}

          {/* Tab: Add Lesson */}
          {activeTab === 'add_lesson' && (
            <form onSubmit={handleAddLesson} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-200 block mb-1">عنوان درس:</label>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="مثلاً: درس ششم: تکنیک لنگراندازی کلامی"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">مدت زمان مطالعه:</label>
                  <input
                    type="text"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    placeholder="مثلاً: ۸ دقیقه"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">امتیاز (XP):</label>
                <input
                  type="number"
                  value={lessonXP}
                  onChange={(e) => setLessonXP(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">محتوای کامل درس آموزشی:</label>
                <textarea
                  rows={6}
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  placeholder="محتوا و تکنیک‌های علمی درس را در اینجا بنویسید..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 rounded-xl cursor-pointer transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت درس آموزشی جدید</span>
              </button>
            </form>
          )}

          {/* Tab: Add Quiz */}
          {activeTab === 'add_quiz' && (
            <form onSubmit={handleAddQuiz} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">متن سوال آزمون:</label>
                <input
                  type="text"
                  value={quizQuestion}
                  onChange={(e) => setQuizQuestion(e.target.value)}
                  placeholder="مثلاً: در تکنیک لنگراندازی چه موردی اهمیت بیشتری دارد؟"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">گزینه الف (گزینه ۱):</label>
                  <input
                    type="text"
                    value={opt1}
                    onChange={(e) => setOpt1(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">گزینه ب (گزینه ۲):</label>
                  <input
                    type="text"
                    value={opt2}
                    onChange={(e) => setOpt2(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">گزینه ج (گزینه ۳):</label>
                  <input
                    type="text"
                    value={opt3}
                    onChange={(e) => setOpt3(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">گزینه د (گزینه ۴):</label>
                  <input
                    type="text"
                    value={opt4}
                    onChange={(e) => setOpt4(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Select Correct Option */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-amber-300 block">انتخاب گزینه صحیح برای این آزمون:</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[
                    { idx: 0, label: 'گزینه الف (۱)' },
                    { idx: 1, label: 'گزینه ب (۲)' },
                    { idx: 2, label: 'گزینه ج (۳)' },
                    { idx: 3, label: 'گزینه د (۴)' }
                  ].map((o) => (
                    <button
                      key={o.idx}
                      type="button"
                      onClick={() => setCorrectIdx(o.idx)}
                      className={`p-2 rounded-xl border text-center font-bold cursor-pointer transition ${
                        correctIdx === o.idx
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">تحلیل تشریحی پاسخ صحیح:</label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="علت درست بودن این گزینه را جهت آموزش کاربر بنویسید..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-3 rounded-xl cursor-pointer transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن این سوال به آزمون فصل</span>
              </button>
            </form>
          )}

          {/* Existing Lessons List in Current Chapter */}
          {currentChapter && (
            <div className="pt-6 border-t border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-300">دروس و سوالات آزمون ثبت‌شده در این فصل ({currentChapter.lessons.length} درس / {currentChapter.quiz.length} سوال):</h4>
              
              <div className="space-y-2">
                {currentChapter.lessons.map(les => (
                  <div key={les.id} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white block">{les.title}</span>
                      <span className="text-[10px] text-slate-400">{les.duration} | {les.xp} XP</span>
                    </div>
                    <button
                      onClick={() => handleDeleteLesson(selectedCourseId, selectedChapterId, les.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                      title="حذف درس"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
