import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, LogOut, Plus, Trash2, Edit } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import logo from '@/assets/logo.png';

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
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
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
      <nav className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={logo} 
              alt="Exam Planner" 
              className="h-12 cursor-pointer" 
              onClick={() => navigate("/dashboard")}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/calendar")}>
              <Calendar className="mr-2 h-4 w-4" />
              Calendar View
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Upcoming Exams</h2>
            <p className="text-muted-foreground">
              Logged in as {user?.email}
            </p>
          </div>
          <Button onClick={() => navigate("/add-exam")} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Exam
          </Button>
        </div>

        {exams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground mb-4">
                No exams scheduled yet
              </p>
              <Button onClick={() => navigate("/add-exam")}>
                Add Your First Exam
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="w-full space-y-3">
            {Object.keys(exams.reduce((acc, exam) => ({ ...acc, [exam.course]: true }), {})).map((course) => (
              <AccordionItem key={course} value={course} className="border rounded-lg px-4 bg-card shadow-sm">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline py-4">
                  {editingCourse === course ? (
                    <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={newCourseName}
                        onChange={(e) => setNewCourseName(e.target.value)}
                        className="flex-1 px-3 py-1 border rounded text-base"
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
                    <div className="flex items-center gap-2 w-full">
                      <span>{course} Exams</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingCourse(course);
                        }}
                        className="ml-2"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 pt-2">
                    {exams.filter(exam => exam.course === course).map((exam) => (
                       <Card key={exam.id} className="hover:shadow-md transition-shadow" style={{ borderLeft: `4px solid ${exam.color || '#821537'}` }}>
                         <CardHeader className="p-4 pb-2">
                           <div className="flex items-start justify-between">
                             <div className="flex items-start gap-2">
                               <div 
                                 className="w-3 h-3 rounded-full mt-1 flex-shrink-0" 
                                 style={{ backgroundColor: exam.color || '#821537' }}
                               />
                               <div>
                                 <CardTitle className="text-lg">{exam.title}</CardTitle>
                                 <CardDescription className="text-sm">{exam.course}</CardDescription>
                               </div>
                             </div>
                             <div className="flex gap-1">
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="h-8 w-8"
                                 onClick={() => navigate(`/add-exam?edit=${exam.id}`)}
                               >
                                 <Edit className="h-3.5 w-3.5" />
                               </Button>
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="h-8 w-8"
                                 onClick={() => deleteExam(exam.id)}
                               >
                                 <Trash2 className="h-3.5 w-3.5 text-destructive" />
                               </Button>
                             </div>
                           </div>
                         </CardHeader>
                         <CardContent className="p-4 pt-0">
                           <div className="flex items-center gap-2 text-sm">
                             <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                             <span className="font-medium">
                               {format(new Date(exam.exam_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                             </span>
                           </div>
                           {exam.notes && (
                             <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                               {exam.notes}
                             </p>
                           )}
                         </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </main>
    </div>
  );
};

export default Dashboard;