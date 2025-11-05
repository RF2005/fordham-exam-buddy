import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, PenTool, Upload } from "lucide-react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { parseSyllabusFile, ExtractedExam } from "@/utils/syllabusParser";
import { parseWithBestAvailableAI, getParserName } from "@/utils/hybridAiParser";

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

  // Syllabus upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedExams, setExtractedExams] = useState<ExtractedExam[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [sectionNumber, setSectionNumber] = useState('');
  const [activeTab, setActiveTab] = useState('manual');

  useEffect(() => {
    if (editId) {
      fetchExam(editId);
    }
  }, [editId]);

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


  const processFile = async (file: File) => {
    console.log('File uploaded:', file.name, 'Type:', file.type, 'Size:', file.size);
    setUploadedFile(file);
    toast({
      title: "File uploaded",
      description: `${file.name} uploaded successfully`
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileUpload called');
    const file = event.target.files?.[0];
    console.log('Selected file:', file);
    if (!file) {
      console.log('No file selected');
      return;
    }
    console.log('Calling processFile...');
    await processFile(file);
  };

  // Unified parse handler for both PDF and pasted text
  const handleParse = async () => {
    // Check if we have either a file or pasted text
    if (!uploadedFile && !pastedText.trim()) {
      toast({
        variant: "destructive",
        title: "Nothing to parse",
        description: "Please upload a PDF or paste syllabus text first"
      });
      return;
    }

    setUploadLoading(true);

    try {
      let text = '';

      // Extract text from PDF if uploaded
      if (uploadedFile) {
        text = await parseSyllabusFile(uploadedFile);
        console.log('Extracted text from file, length:', text.length);
      } else {
        // Use pasted text
        text = pastedText;
      }

      // Use parser to extract exams
      const result = await parseWithBestAvailableAI(text, sectionNumber);
      console.log('Parsed exams:', result);

      if (result.exams.length === 0) {
        toast({
          title: "No exams found",
          description: "Could not find any exam dates. Try manual entry instead."
        });
      } else {
        // Convert to ExtractedExam format
        const convertedExams: ExtractedExam[] = result.exams.map(exam => ({
          title: exam.title,
          date: exam.date,
          type: exam.type,
          notes: exam.notes
        }));

        setExtractedExams(convertedExams);
        toast({
          title: "Parsing complete",
          description: `Found ${result.exams.length} exam date(s) in your syllabus`
        });
      }
    } catch (error: any) {
      console.error('Error processing:', error);
      toast({
        variant: "destructive",
        title: "Error parsing",
        description: error.message || "Failed to parse the syllabus"
      });
      setExtractedExams([]);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    // Only accept PDF files
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: `Please upload a PDF file only. Got: ${file.name}`
      });
      return;
    }

    await processFile(file);
  };

  const handleBulkAddExams = async () => {
    if (extractedExams.length === 0) return;
    if (!selectedCourse.trim()) {
      toast({
        variant: "destructive",
        title: "Course required",
        description: "Please enter the course name before adding exams"
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const examRecords = extractedExams.map(exam => ({
        course: selectedCourse,
        title: exam.title,
        exam_date: exam.date,
        start_time: null,
        end_time: null,
        location: null,
        notes: exam.notes || null,
        color: '#821537',
        user_id: session.user.id
      }));

      const { error } = await supabase
        .from('exams')
        .insert(examRecords);

      if (error) throw error;

      toast({
        title: "Exams added successfully",
        description: `Added ${extractedExams.length} exam(s) to your schedule`
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding exams",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-6 lg:px-8 py-8 lg:py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-8 lg:mb-12 animate-slide-down">
          <h1 className="text-4xl lg:text-5xl font-bold mb-3 tracking-tight">
            {editId ? 'Edit Exam' : 'Add New Exam'}
          </h1>
          <p className="text-base text-muted-foreground">
            {editId ? 'Update your exam details below' : 'Choose your preferred method to add an exam to your schedule'}
          </p>
        </div>

        <Card className="animate-slide-up">
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual">
                  <PenTool className="mr-2 h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="lookup">
                  <Search className="mr-2 h-4 w-4" />
                  Schedule Lookup
                </TabsTrigger>
                <TabsTrigger value="upload">
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

              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Upload your course syllabus PDF or paste text directly to automatically extract exam dates
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scanned PDFs are supported
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="course-name">Course Name</Label>
                      <Input
                        id="course-name"
                        placeholder="e.g., CISC 1600"
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Course code or name
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="section-number">Section Number (Optional)</Label>
                      <Input
                        id="section-number"
                        placeholder="e.g., 01, 02, A, B"
                        value={sectionNumber}
                        onChange={(e) => setSectionNumber(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        For recurring quizzes/tests
                      </p>
                    </div>
                  </div>

                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center space-y-4 transition-all cursor-pointer ${
                      isDragging
                        ? 'border-primary bg-primary/5 scale-[1.02]'
                        : 'border-border hover:border-primary/50 hover:bg-accent/5'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="space-y-2">
                      <div>
                        <span className="text-base font-semibold">Click to Upload or Drag and Drop</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        PDF files only
                      </p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {uploadedFile && (
                      <p className="text-sm text-primary font-medium">
                        Uploaded: {uploadedFile.name}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or paste text directly
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="syllabus-text">Paste Syllabus Text</Label>
                      <Textarea
                        id="syllabus-text"
                        placeholder="Paste your syllabus text here...

Example:
Midterm Exam - October 15, 2024
Final Exam - December 10, 2024"
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Copy and paste text from your syllabus PDF or document
                      </p>
                    </div>
                  </div>

                  {/* Unified parse button at the bottom */}
                  {!extractedExams.length && (
                    <Button
                      onClick={handleParse}
                      disabled={uploadLoading || (!uploadedFile && !pastedText.trim())}
                      className="w-full"
                      size="lg"
                    >
                      {uploadLoading ? 'Parsing Syllabus...' : 'Parse Syllabus'}
                    </Button>
                  )}

                  {uploadLoading && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Extracting exam dates from your syllabus...</p>
                    </div>
                  )}

                  {extractedExams.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Extracted Exam Dates ({extractedExams.length})</Label>
                      </div>

                      <div className="space-y-2 max-h-96 overflow-y-auto bg-white p-2 rounded-lg border">
                        {extractedExams.map((exam, index) => (
                          <Card key={index} className="p-4 bg-white border-border/50">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 flex-1">
                                <div className="font-semibold">
                                  {exam.title}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(exam.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                                {exam.notes && (
                                  <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                    {exam.notes}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    // Switch to manual tab and pre-fill form
                                    setActiveTab('manual');
                                    setFormData({
                                      ...formData,
                                      course: selectedCourse,
                                      title: exam.title,
                                      exam_date: exam.date,
                                      notes: exam.notes || ''
                                    });
                                    // Remove from extracted list
                                    setExtractedExams(extractedExams.filter((_, i) => i !== index));
                                  }}
                                  className="h-8 w-8"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                    <path d="m15 5 4 4"/>
                                  </svg>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setExtractedExams(extractedExams.filter((_, i) => i !== index));
                                  }}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18"/>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                    <line x1="10" x2="10" y1="11" y2="17"/>
                                    <line x1="14" x2="14" y1="11" y2="17"/>
                                  </svg>
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      <Button
                        onClick={handleBulkAddExams}
                        disabled={loading || !selectedCourse.trim()}
                        className="w-full"
                        size="lg"
                      >
                        {loading ? 'Adding Exams...' : `Add All ${extractedExams.length} Exam(s) to Schedule`}
                      </Button>
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