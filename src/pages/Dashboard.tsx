import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { format, isWithinInterval, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Calendar, Plus, Trash2, Edit, Clock, AlertCircle, TrendingUp, Download } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import Navigation from "@/components/Navigation";
import { downloadICSFile } from "@/utils/calendarExport";

type Exam = Database['public']['Tables']['exams']['Row'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [newCourseName, setNewCourseName] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // TEMPORARY: Bypass auth check to see new UI locally
      // if (!session) {
      //   navigate("/auth");
      //   return;
      // }
      setUser(session?.user || { email: 'demo@fordham.edu' });
      fetchExams();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate("/auth");
      }
      if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('exam_date', { ascending: true });

      if (error) throw error;
      setExams(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading exams",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const getExamStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const upcomingExams = exams.filter(exam => {
      const examDate = new Date(exam.exam_date + 'T00:00:00');
      return examDate >= today;
    });

    const thisWeek = upcomingExams.filter(exam => {
      const examDate = new Date(exam.exam_date + 'T00:00:00');
      return isWithinInterval(examDate, { start: startOfWeek(now), end: endOfWeek(now) });
    });

    const thisMonth = upcomingExams.filter(exam => {
      const examDate = new Date(exam.exam_date + 'T00:00:00');
      return isWithinInterval(examDate, { start: startOfMonth(now), end: endOfMonth(now) });
    });

    const urgent = upcomingExams.filter(exam => {
      const examDate = new Date(exam.exam_date + 'T00:00:00');
      const daysUntil = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7 && daysUntil >= 0;
    });

    return {
      upcoming: upcomingExams.length,
      thisWeek: thisWeek.length,
      thisMonth: thisMonth.length,
      urgent: urgent.length
    };
  };

  const getDaysUntilExam = (examDate: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const exam = new Date(examDate + 'T00:00:00');
    const daysUntil = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil;
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return "text-muted-foreground";
    if (daysUntil <= 3) return "text-destructive";
    if (daysUntil <= 7) return "text-orange-500";
    return "text-muted-foreground";
  };

  const stats = getExamStats();


  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const deleteExam = async (id: string) => {
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Exam deleted",
        description: "The exam has been removed from your schedule"
      });

      fetchExams();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting exam",
        description: error.message
      });
    }
  };

  const startEditingCourse = (courseName: string) => {
    setEditingCourse(courseName);
    setNewCourseName(courseName);
  };

  const cancelEditingCourse = () => {
    setEditingCourse(null);
    setNewCourseName('');
  };

  const saveCourseName = async (oldCourseName: string) => {
    if (!newCourseName.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid course name",
        description: "Course name cannot be empty"
      });
      return;
    }

    if (newCourseName === oldCourseName) {
      cancelEditingCourse();
      return;
    }

    try {
      const { error } = await supabase
        .from('exams')
        .update({ course: newCourseName.trim() })
        .eq('course', oldCourseName);

      if (error) throw error;

      toast({
        title: "Course renamed",
        description: `All exams in "${oldCourseName}" have been updated to "${newCourseName.trim()}"`
      });

      cancelEditingCourse();
      fetchExams();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error renaming course",
        description: error.message
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-6 lg:px-8 py-8 lg:py-12 max-w-7xl">
        {/* Header */}
        <div className="mb-8 lg:mb-12 animate-slide-down">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-3 tracking-tight">
                Your Exams
              </h1>
              <p className="text-base text-muted-foreground">
                {user?.email && `Logged in as ${user.email}`}
              </p>
            </div>
            {exams.length > 0 && (
              <Button
                onClick={() => downloadICSFile(exams)}
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export to Calendar
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-12">
          <Card className="animate-slide-up hover:scale-[1.02] transition-transform">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Total Upcoming
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">{stats.upcoming}</p>
              <p className="text-xs text-muted-foreground mt-2">exams scheduled</p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up hover:scale-[1.02] transition-transform" style={{ animationDelay: '50ms' }}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  This Week
                </CardTitle>
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">{stats.thisWeek}</p>
              <p className="text-xs text-muted-foreground mt-2">coming up soon</p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up hover:scale-[1.02] transition-transform" style={{ animationDelay: '100ms' }}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  This Month
                </CardTitle>
                <Clock className="h-5 w-5 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">{stats.thisMonth}</p>
              <p className="text-xs text-muted-foreground mt-2">in the next 30 days</p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up hover:scale-[1.02] transition-transform border-destructive/50" style={{ animationDelay: '150ms' }}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-destructive">
                  Urgent
                </CardTitle>
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-destructive">{stats.urgent}</p>
              <p className="text-xs text-muted-foreground mt-2">within 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Empty State or Exams List */}
        {exams.length === 0 ? (
          <Card className="animate-fade-in">
            <CardContent className="py-16 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-accent rounded-full flex items-center justify-center">
                <Calendar className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">No exams scheduled yet</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Get started by adding your first exam. You can enter it manually, look it up from the schedule, or upload your syllabus.
              </p>
              <Button onClick={() => navigate("/add-exam")} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Exam
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <Accordion type="multiple" className="w-full space-y-4">
              {Object.keys(exams.reduce((acc, exam) => ({ ...acc, [exam.course]: true }), {})).map((course, idx) => (
                <AccordionItem key={course} value={course} className="border-none" style={{ animationDelay: `${idx * 50}ms` }}>
                  <Card className="animate-slide-up hover:shadow-2xl transition-all">
                    <AccordionTrigger className="px-8 py-6 text-xl font-semibold hover:no-underline hover:bg-accent/30 transition-colors rounded-t-2xl">
                      {editingCourse === course ? (
                        <div className="flex items-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={newCourseName}
                            onChange={(e) => setNewCourseName(e.target.value)}
                            className="flex-1 px-4 py-2 border-2 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveCourseName(course);
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditingCourse();
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 w-full">
                          <span className="flex-1 text-left">{course}</span>
                          <span className="text-sm font-normal text-muted-foreground">
                            {exams.filter(e => e.course === course).length} {exams.filter(e => e.course === course).length === 1 ? 'exam' : 'exams'}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingCourse(course);
                            }}
                            className="h-9 w-9"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </AccordionTrigger>
                    <AccordionContent className="px-8 pb-8">
                      <div className="grid gap-4 pt-4">
                        {exams.filter(exam => exam.course === course).map((exam) => {
                          const daysUntil = getDaysUntilExam(exam.exam_date);
                          const urgencyColor = getUrgencyColor(daysUntil);

                          return (
                            <Card key={exam.id} className="hover:shadow-lg transition-all group relative overflow-hidden" style={{ borderLeft: `6px solid ${exam.color || '#821537'}` }}>
                              <CardHeader className="pb-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                      <CardTitle className="text-xl">{exam.title}</CardTitle>
                                      {daysUntil >= 0 && daysUntil <= 7 && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                          daysUntil <= 3 ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'
                                        }`}>
                                          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                      <Calendar className="h-4 w-4" />
                                      <span className="font-medium">
                                        {format(new Date(exam.exam_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                                      </span>
                                      {exam.start_time && exam.end_time && (
                                        <>
                                          <span className="text-muted-foreground/50">•</span>
                                          <Clock className="h-4 w-4" />
                                          <span>{exam.start_time} - {exam.end_time}</span>
                                        </>
                                      )}
                                    </div>
                                    {exam.location && (
                                      <p className="text-sm text-muted-foreground">
                                        📍 {exam.location}
                                      </p>
                                    )}
                                    {exam.notes && (
                                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                        {exam.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => navigate(`/add-exam?edit=${exam.id}`)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => deleteExam(exam.id)}
                                      className="hover:bg-destructive hover:text-destructive-foreground"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                            </Card>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </Card>
              </AccordionItem>
            ))}
          </Accordion>
          </div>
        )}
      </main>

      {/* Floating Action Button for Mobile */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl md:hidden z-40"
        onClick={() => navigate("/add-exam")}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default Dashboard;