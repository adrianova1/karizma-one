import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, BookOpen, CheckCircle2, ChevronLeft, ArrowRight,
  Sparkles, Award, Play, Check, Clock, AlertCircle
} from 'lucide-react';
import { DEFAULT_COURSES, Course, Chapter, Lesson, QuizQuestion } from '../data/academyData.js';
import { parseSafeJson } from '../lib/api.js';

interface AcademyViewProps {
  token: string;
}

export default function AcademyView({ token }: AcademyViewProps) {
  const [courses, setCourses] = useState<Course[]>(DEFAULT_COURSES);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('karizma_completed_lessons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markLessonComplete = (lessonId: string) => {
    if (!completedLessons.includes(lessonId)) {
      const updated = [...completedLessons, lessonId];
      setCompletedLessons(updated);
      localStorage.setItem('karizma_completed_lessons', JSON.stringify(updated));
    }
  };

  const handleSelectQuizOption = (qIdx: number, optIdx: number) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const calculateScore = () => {
    if (!activeQuiz) return 0;
    let score = 0;
    activeQuiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIdx) {
        score++;
      }
    });
    return score;
  };

  // 1. Viewing a Specific Lesson
  if (selectedLesson) {
    const isDone = completedLessons.includes(selectedLesson.id);
    return (
      <div className="flex-1 overflow-y-auto h-full p-4 space-y-4 text-right dir-rtl select-none" style={{ direction: 'rtl' }}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            onClick={() => setSelectedLesson(null)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به سرفصل‌ها</span>
          </button>
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{selectedLesson.duration}</span>
          </span>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-black text-white">{selectedLesson.title}</h2>
          <div className="text-xs text-slate-300 leading-relaxed space-y-3 whitespace-pre-line">
            {selectedLesson.content}
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
              <Award className="w-4 h-4 text-amber-400" />
              <span>+{selectedLesson.xp} امتیاز کاریزما (XP)</span>
            </div>
            <button
              onClick={() => markLessonComplete(selectedLesson.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isDone 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isDone ? 'تکمیل شده ✓' : 'علامت‌گذاری به عنوان پایان درس'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Viewing a Chapter Quiz
  if (activeQuiz) {
    const score = calculateScore();
    return (
      <div className="flex-1 overflow-y-auto h-full p-4 space-y-4 text-right dir-rtl select-none" style={{ direction: 'rtl' }}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            onClick={() => {
              setActiveQuiz(null);
              setQuizAnswers({});
              setQuizSubmitted(false);
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به دوره‌ها</span>
          </button>
          <span className="text-xs font-bold text-indigo-400">آزمون پایان فصل</span>
        </div>

        <div className="space-y-4">
          {activeQuiz.map((q, idx) => {
            const isUserSelected = quizAnswers[idx] !== undefined;
            return (
              <div key={idx} className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white">
                  {idx + 1}. {q.question}
                </h4>
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = quizAnswers[idx] === optIdx;
                    const isCorrect = optIdx === q.correctIdx;
                    let btnStyle = 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700';

                    if (quizSubmitted) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold';
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'bg-red-500/20 border-red-500/50 text-red-300';
                      }
                    } else if (isSelected) {
                      btnStyle = 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold';
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectQuizOption(idx, optIdx)}
                        className={`w-full text-right p-3 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {quizSubmitted && isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {quizSubmitted && q.explanation && (
                  <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                    💡 <span className="font-bold text-slate-300">تحلیل:</span> {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-[#0b0f19] border border-slate-800 rounded-2xl flex items-center justify-between">
          {!quizSubmitted ? (
            <button
              onClick={() => setQuizSubmitted(true)}
              disabled={Object.keys(quizAnswers).length < activeQuiz.length}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
            >
              ثبت پاسخ‌ها و مشاهده نتیجه
            </button>
          ) : (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-black text-white">
                امتیاز شما: {score} از {activeQuiz.length} پاسخ صحیح
              </span>
              <button
                onClick={() => {
                  setActiveQuiz(null);
                  setQuizAnswers({});
                  setQuizSubmitted(false);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                تکمیل آزمون
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Viewing a Single Course Chapters
  if (selectedCourse) {
    return (
      <div className="flex-1 overflow-y-auto h-full p-4 space-y-4 text-right dir-rtl select-none" style={{ direction: 'rtl' }}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            onClick={() => setSelectedCourse(null)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به فهرست دوره‌ها</span>
          </button>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            {selectedCourse.difficulty}
          </span>
        </div>

        <div className="bg-gradient-to-b from-[#0f172a] to-[#0b0f19] border border-slate-800 rounded-2xl p-4 space-y-2">
          <h2 className="text-sm font-black text-white">{selectedCourse.title}</h2>
          <p className="text-xs text-slate-300 leading-relaxed">{selectedCourse.description}</p>
        </div>

        <div className="space-y-3">
          {selectedCourse.chapters.map((chapter) => (
            <div key={chapter.id} className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>{chapter.title}</span>
              </h3>

              <div className="divide-y divide-slate-800/60">
                {chapter.lessons.map((lesson) => {
                  const isDone = completedLessons.includes(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className="py-2.5 flex items-center justify-between hover:bg-slate-900/50 rounded-xl px-2 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-600" />
                        )}
                        <span className="text-xs text-slate-200">{lesson.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{lesson.duration}</span>
                    </div>
                  );
                })}
              </div>

              {chapter.quiz && chapter.quiz.length > 0 && (
                <button
                  onClick={() => {
                    setActiveQuiz(chapter.quiz);
                    setQuizAnswers({});
                    setQuizSubmitted(false);
                  }}
                  className="w-full mt-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>آزمون سنجش این فصل ({chapter.quiz.length} سوال)</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. Main Courses Listing
  return (
    <div className="flex-1 overflow-y-auto h-full p-4 space-y-4 text-right dir-rtl select-none pb-24" style={{ direction: 'rtl' }}>
      <div className="bg-gradient-to-b from-[#0f172a] to-[#0b0f19] border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-lg">
        <div className="flex items-center gap-2 text-emerald-400">
          <GraduationCap className="w-5 h-5" />
          <h2 className="text-sm font-black text-white">آکادمی مهارت‌های کاریزما و جذابیت</h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          مسیرهای آموزشی گام‌به‌گام با سناریوهای کاربردی، آزمون‌های تعاملی و تمرین‌های روانشناسی رفتاری.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {courses.map((course) => (
          <div
            key={course.id}
            onClick={() => setSelectedCourse(course)}
            className="bg-[#0b0f19] border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 space-y-3 transition cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                {course.difficulty}
              </span>
              <span className="text-[10px] text-slate-400">
                {course.chapters.length} فصل آموزشی
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xs font-extrabold text-white group-hover:text-emerald-300 transition">
                {course.title}
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                {course.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-bold">
              <span>ورود به دوره و شروع مطالعه</span>
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
