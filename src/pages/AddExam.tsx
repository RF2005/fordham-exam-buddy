import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Search, PenTool, ChevronDown, ChevronUp } from "lucide-react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import logo from '@/assets/logo.png';
import * as pdfjsLib from 'pdfjs-dist';

const examSchema = z.object({
  course: z.string().min(1, "Course is required").max(100),
  title: z.string().min(1, "Title is required").max(200),
  exam_date: z.string().min(1, "Date is required"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional()
});

const ReminderSection = ({ 
  reminderDays, 
  setReminderDays,
  idPrefix = "reminder"
}: { 
  reminderDays: string; 
  setReminderDays: (value: string) => void;
  idPrefix?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-muted/50">
        <CollapsibleTrigger asChild>
          <button 
            type="button"
            className="w-full p-4 flex items-center justify-between hover:bg-muted/70 transition-colors"
          >
            <h3 className="font-semibold text-sm">Exam Reminders (Optional)</h3>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Reminders will be sent to your registered Fordham email address.
            </p>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-days`}>Days before exam to send reminders</Label>
              <Input
                id={`${idPrefix}-days`}
                type="text"
                placeholder="e.g., 7, 3, 1"
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter numbers separated by commas (e.g., 7, 3, 1 for reminders 7 days, 3 days, and 1 day before)
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const AddExam = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    course: '',
    title: '',
    exam_date: '',
    start_time: '09:00',
    end_time: '11:00',
    location: '',
    notes: '',
    color: '#821537'
  });
  
  // Lookup state
  const [lookupSubject, setLookupSubject] = useState('');
  const [lookupCourse, setLookupCourse] = useState('');
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  
  // Syllabus parser state
  const [syllabusText, setSyllabusText] = useState('');
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [sectionNumber, setSectionNumber] = useState('');
  const [parsedExams, setParsedExams] = useState<any[]>([]);
  const [parseLoading, setParseLoading] = useState(false);

  // Reminder state
  const [reminderDays, setReminderDays] = useState<string>("");

  // Set up PDF.js worker on component mount
  useEffect(() => {
    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      if (editId) {
        fetchExam(editId);
      }
    };

    checkAuth();
  }, [navigate, editId]);

  const fetchExam = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        course: data.course,
        title: data.title,
        exam_date: data.exam_date,
        start_time: data.start_time || '09:00',
        end_time: data.end_time || '11:00',
        location: data.location || '',
        notes: data.notes || '',
        color: data.color || '#821537'
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading exam",
        description: error.message
      });
    }
  };

  const handleLookup = async () => {
    if (!lookupSubject || !lookupCourse) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter both subject and course number"
      });
      return;
    }

    setLookupLoading(true);
    try {
      const { data, error } = await supabase
        .from('final_exam_schedules')
        .select('*')
        .ilike('subject', lookupSubject)
        .ilike('course_number', lookupCourse);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No results found",
          description: "No scheduled finals found for this course. Try manual entry or syllabus upload."
        });
        setLookupResults([]);
      } else {
        setLookupResults(data);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lookup error",
        description: error.message
      });
    } finally {
      setLookupLoading(false);
    }
  };

  const selectLookupResult = (result: any) => {
    setFormData({
      course: `${result.subject} ${result.course_number}`,
      title: 'Final Exam',
      exam_date: result.exam_date,
      start_time: result.start_time || '09:00',
      end_time: result.end_time || '11:00',
      location: '',
      notes: result.notes || '',
      color: '#821537'
    });
    toast({
      title: "Exam details populated",
      description: "Review and submit to add to your schedule"
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyllabusFile(file);
    
    // Check if it's a PDF file
    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }
        
        setSyllabusText(fullText);
        toast({
          title: "PDF loaded",
          description: `Extracted text from ${pdf.numPages} page(s)`
        });
      } catch (error: any) {
        console.error('PDF parsing error:', error);
        toast({
          variant: "destructive",
          title: "PDF Error",
          description: error.message || "Failed to parse PDF. Please try copying the text directly."
        });
        // Clear the file input on error
        setSyllabusFile(null);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } else {
      // For non-PDF files, read as text
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          setSyllabusText(event.target?.result as string);
          toast({
            title: "File loaded",
            description: "Text extracted successfully"
          });
        };
        reader.onerror = () => {
          toast({
            variant: "destructive",
            title: "File Error",
            description: "Failed to read file"
          });
          setSyllabusFile(null);
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        };
        reader.readAsText(file);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "File Error",
          description: "Failed to read file"
        });
      }
    }
  };

  const handleParseSyllabus = async () => {
    if (!syllabusText.trim()) {
      toast({
        variant: "destructive",
        title: "No content",
        description: "Please paste syllabus text or upload a file"
      });
      return;
    }

    setParseLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-syllabus', {
        body: { 
          syllabusText,
          sectionNumber: sectionNumber.trim() || null
        }
      });

      if (error) throw error;

      if (!data.exams || data.exams.length === 0) {
        toast({
          title: "No exams found",
          description: "Could not find any exam dates in the syllabus. Try manual entry."
        });
        setParsedExams([]);
      } else {
        setParsedExams(data.exams);
        toast({
          title: "Exams extracted",
          description: `Found ${data.exams.length} exam(s) in the syllabus`
        });
      }
    } catch (error: any) {
      console.error("Parse error:", error);
      toast({
        variant: "destructive",
        title: "Parse error",
        description: error.message || "Failed to parse syllabus"
      });
    } finally {
      setParseLoading(false);
    }
  };

  const addParsedExam = async (exam: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from('exams')
        .insert([{
          course: formData.course || 'Unknown Course',
          title: exam.title,
          exam_date: exam.date,
          start_time: formData.start_time || '09:00',
          end_time: formData.end_time || '11:00',
          location: formData.location || null,
          notes: exam.notes || null,
          color: formData.color || '#821537',
          user_id: session.user.id
        }]);

      if (error) throw error;

      toast({
        title: "Exam added",
        description: `${exam.title} has been added to your schedule`
      });

      setParsedExams(parsedExams.filter(e => e !== exam));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding exam",
        description: error.message
      });
    }
  };

  const addAllParsedExams = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const examsToInsert = parsedExams.map(exam => ({
        course: formData.course || 'Unknown Course',
        title: exam.title,
        exam_date: exam.date,
        start_time: formData.start_time || '09:00',
        end_time: formData.end_time || '11:00',
        location: formData.location || null,
        notes: exam.notes || null,
        color: formData.color || '#821537',
        user_id: session.user.id
      }));

      const { error } = await supabase
        .from('exams')
        .insert(examsToInsert);

      if (error) throw error;

      toast({
        title: "All exams added",
        description: `${parsedExams.length} exam(s) have been added to your schedule`
      });

      setParsedExams([]);
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding exams",
        description: error.message
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = examSchema.parse(formData);
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      if (editId) {
        const { error } = await supabase
          .from('exams')
          .update(validatedData)
          .eq('id', editId);

        if (error) throw error;

        toast({
          title: "Exam updated",
          description: "Your exam has been updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('exams')
          .insert([{
            course: validatedData.course,
            title: validatedData.title,
            exam_date: validatedData.exam_date,
            start_time: validatedData.start_time || null,
            end_time: validatedData.end_time || null,
            location: validatedData.location || null,
            notes: validatedData.notes || null,
            color: validatedData.color || '#821537',
            user_id: session.user.id
          }]);

        if (error) throw error;

        toast({
          title: "Exam added",
          description: "Your exam has been added to your schedule"
        });
      }

      // Save reminder preferences if days are provided
      if (reminderDays.trim()) {
        await saveReminderPreferences(session.user.id);
      }

      navigate("/dashboard");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation error",
          description: error.errors[0].message
        });
      } else {
        toast({
          variant: "destructive",
          title: editId ? "Error updating exam" : "Error adding exam",
          description: error.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const saveReminderPreferences = async (userId: string) => {
    try {
      const daysArray = reminderDays
        .split(',')
        .map(d => parseInt(d.trim()))
        .filter(d => !isNaN(d) && d > 0 && d <= 365); // Reasonable limits

      if (daysArray.length === 0) return;

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          reminder_days: daysArray
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      toast({
        title: "Reminders set",
        description: "Email reminders have been configured successfully"
      });
    } catch (error: any) {
      console.error("Error saving reminder preferences:", error);
      toast({
        variant: "destructive",
        title: "Error setting reminders",
        description: error.message || "Could not save reminder preferences"
      });
    }
  };

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
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>{editId ? 'Edit Exam' : 'Add New Exam'}</CardTitle>
            <CardDescription>
              {editId ? 'Update your exam details' : 'Choose your preferred method to add an exam'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual">
                  <PenTool className="mr-2 h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="lookup">
                  <Search className="mr-2 h-4 w-4" />
                  Schedule Lookup
                </TabsTrigger>
                <TabsTrigger value="syllabus">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Syllabus
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="course">Course</Label>
                    <Input
                      id="course"
                      placeholder="e.g., CISC 1600"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Exam Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Midterm Exam"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exam_date">Exam Date</Label>
                    <Input
                      id="exam_date"
                      type="date"
                      value={formData.exam_date}
                      onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location (Optional)</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Room 201, McNally Hall"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional notes or reminders..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Exam Color</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        Choose a color to organize your exams
                      </span>
                    </div>
                  </div>

                  <ReminderSection 
                    reminderDays={reminderDays}
                    setReminderDays={setReminderDays}
                    idPrefix="manual"
                  />

                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? 'Saving...' : editId ? 'Update Exam' : 'Add Exam'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="lookup" className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="e.g., CISC"
                        value={lookupSubject}
                        onChange={(e) => setLookupSubject(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="courseNum">Course Number</Label>
                      <Input
                        id="courseNum"
                        placeholder="e.g., 1600"
                        value={lookupCourse}
                        onChange={(e) => setLookupCourse(e.target.value)}
                      />
                    </div>
                  </div>

                  <ReminderSection 
                    reminderDays={reminderDays}
                    setReminderDays={setReminderDays}
                    idPrefix="lookup"
                  />

                  <Button 
                    onClick={handleLookup} 
                    disabled={lookupLoading}
                    className="w-full"
                  >
                    {lookupLoading ? 'Searching...' : 'Search Schedule'}
                  </Button>

                  {lookupResults.length > 0 && (
                    <div className="space-y-2">
                      <Label>Select an exam schedule:</Label>
                      <div className="space-y-2">
                        {lookupResults.map((result) => (
                          <Card 
                            key={result.id} 
                            className="p-4 cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => selectLookupResult(result)}
                          >
                            <div className="font-semibold">
                              {result.subject} {result.course_number}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(result.exam_date).toLocaleDateString()} • {result.start_time} - {result.end_time}
                            </div>
                            {result.notes && (
                              <div className="text-sm mt-1">{result.notes}</div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {lookupResults.length > 0 && formData.exam_date && (
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="review-course">Course</Label>
                        <Input
                          id="review-course"
                          value={formData.course}
                          onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="review-title">Exam Title</Label>
                        <Input
                          id="review-title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="review-date">Exam Date</Label>
                        <Input
                          id="review-date"
                          type="date"
                          value={formData.exam_date}
                          onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="review-notes">Notes</Label>
                        <Textarea
                          id="review-notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                        />
                      </div>
                      
                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Saving...' : 'Add Exam'}
                      </Button>
                    </form>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="syllabus" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="syllabus-course">Course Name (for reference)</Label>
                    <Input
                      id="syllabus-course"
                      placeholder="e.g., CISC 1600"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="section-number">Section Number (optional)</Label>
                    <Input
                      id="section-number"
                      placeholder="e.g., L01, Section 2, etc."
                      value={sectionNumber}
                      onChange={(e) => setSectionNumber(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      If your syllabus has multiple sections, specify yours to get the correct exam times
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Upload Syllabus File (.txt, .pdf, .doc)</Label>
                    {syllabusFile ? (
                      <div className="flex items-center gap-2 p-3 border rounded-md bg-accent/50">
                        <span className="flex-1 text-sm truncate">{syllabusFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSyllabusFile(null);
                            setSyllabusText('');
                            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".txt,.pdf,.doc,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, TXT, DOC, DOCX
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="syllabus-text">Or Paste Syllabus Text</Label>
                    <Textarea
                      id="syllabus-text"
                      placeholder="Paste your syllabus content here..."
                      value={syllabusText}
                      onChange={(e) => setSyllabusText(e.target.value)}
                      rows={8}
                    />
                  </div>

                  <ReminderSection 
                    reminderDays={reminderDays}
                    setReminderDays={setReminderDays}
                    idPrefix="syllabus"
                  />

                  <Button
                    onClick={handleParseSyllabus} 
                    disabled={parseLoading}
                    className="w-full"
                  >
                    {parseLoading ? 'Parsing...' : 'Extract Exams from Syllabus'}
                  </Button>

                  {parsedExams.length > 0 && (
                    <div className="space-y-2">
                      <Label>Found {parsedExams.length} exam(s):</Label>
                      <div className="space-y-2">
                        {parsedExams.map((exam, idx) => (
                          <Card key={idx} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold">{exam.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {(() => {
                                    const [year, month, day] = exam.date.split('-').map(Number);
                                    const localDate = new Date(year, month - 1, day);
                                    return localDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                  })()}
                                </div>
                                {exam.notes && (
                                  <div className="text-sm mt-1">{exam.notes}</div>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => addParsedExam(exam)}
                              >
                                Add
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1" 
                          onClick={addAllParsedExams}
                        >
                          Add All Exams
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1" 
                          onClick={() => navigate('/dashboard')}
                        >
                          Done - Go to Dashboard
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AddExam;