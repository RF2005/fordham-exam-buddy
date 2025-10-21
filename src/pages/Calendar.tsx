import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar as BigCalendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import Navigation from "@/components/Navigation";
import { downloadICSFile } from "@/utils/calendarExport";

const localizer = momentLocalizer(moment);

type Exam = Database['public']['Tables']['exams']['Row'];

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Exam;
}

const Calendar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [date, setDate] = useState(new Date());
  const [courseMap, setCourseMap] = useState<Map<string, string>>(new Map());
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // TEMPORARY: Bypass auth check for local development
      // if (!session) {
      //   navigate("/auth");
      //   return;
      // }
      await fetchCourses();
      fetchExams();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('course_number, course_name');

      if (error) throw error;

      const map = new Map<string, string>();
      (data || []).forEach((course) => {
        // Store with original case, uppercase, and lowercase for case-insensitive lookup
        map.set(course.course_number, course.course_name);
        map.set(course.course_number.toUpperCase(), course.course_name);
        map.set(course.course_number.toLowerCase(), course.course_name);
      });
      setCourseMap(map);
    } catch (error: any) {
      console.error('Error loading courses:', error);
    }
  };

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('exam_date', { ascending: true });

      if (error) throw error;

      setExams(data || []);

      const calendarEvents: CalendarEvent[] = (data || []).map((exam) => {
        // Parse date as local date to avoid timezone shifts
        const [year, month, day] = exam.exam_date.split('-').map(Number);
        const examDate = new Date(year, month - 1, day);
        let start = examDate;
        let end = examDate;

        // If start_time and end_time exist, create Date objects with those times
        if (exam.start_time && exam.end_time) {
          const [startHour, startMin] = exam.start_time.split(':').map(Number);
          const [endHour, endMin] = exam.end_time.split(':').map(Number);
          
          start = new Date(year, month - 1, day, startHour, startMin, 0);
          end = new Date(year, month - 1, day, endHour, endMin, 0);
        }

        // Get full course name from course map (case-insensitive), fallback to exam.course
        const courseName = courseMap.get(exam.course) || courseMap.get(exam.course.toUpperCase()) || courseMap.get(exam.course.toLowerCase()) || exam.course;

        return {
          id: exam.id,
          title: `${courseName}: ${exam.title}`,
          start,
          end,
          resource: exam
        };
      });

      setEvents(calendarEvents);
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


  const handleSelectEvent = (event: CalendarEvent) => {
    navigate(`/add-exam?edit=${event.id}`);
  };

  const handleSelectSlot = (slotInfo: any) => {
    // Only allow slot selection in month view
    if (view === 'month') {
      navigate(`/add-exam?date=${slotInfo.start.toISOString().split('T')[0]}`);
    }
  };

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = new Date(date);
    
    if (action === 'TODAY') {
      setDate(new Date());
      return;
    }
    
    if (view === 'month') {
      if (action === 'PREV') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
    } else if (view === 'week') {
      if (action === 'PREV') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
    } else if (view === 'day') {
      if (action === 'PREV') {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
    } else if (view === 'agenda') {
      if (action === 'PREV') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
    }
    
    setDate(newDate);
  };

  const getDateRangeLabel = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    
    if (view === 'month' || view === 'agenda') {
      return date.toLocaleDateString('en-US', options);
    } else if (view === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

const CustomEvent = ({ event, courseMap }: { event: CalendarEvent; courseMap: Map<string, string> }) => {
  const exam = event.resource;
  
  // Extract exam type from title
  const getExamType = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('quiz')) return 'Quiz';
    if (lowerTitle.includes('midterm')) return 'Midterm';
    if (lowerTitle.includes('final')) return 'Final';
    if (lowerTitle.includes('presentation')) return 'Presentation';
    if (lowerTitle.includes('project')) return 'Project';
    if (lowerTitle.includes('exam')) return 'Exam';
    return 'Exam'; // default
  };
  
  const examType = getExamType(exam.title);
  const courseName = courseMap.get(exam.course) || courseMap.get(exam.course.toUpperCase()) || exam.course;
  
  return (
    <span className="text-xs">
      <strong>{courseName}</strong>
      <span className="event-type-badge"> | {examType}</span>
    </span>
  );
};

const CustomAgenda = ({ events, date, courseMap }: { events: CalendarEvent[], date: Date, courseMap: Map<string, string> }) => {
  // Filter events for the agenda month
  const startOfMonth = moment(date).startOf('month').toDate();
  const endOfMonth = moment(date).endOf('month').toDate();
  
  const filteredEvents = events
    .filter(event => event.start >= startOfMonth && event.start <= endOfMonth)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (filteredEvents.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No exams scheduled for this month
      </div>
    );
  }

  return (
    <div className="agenda-view-custom">
      <table className="rbc-agenda-table">
        <thead>
          <tr>
            <th className="rbc-header">DATE</th>
            <th className="rbc-header">TIME</th>
            <th className="rbc-header">EVENT</th>
            <th className="rbc-header">LOCATION</th>
          </tr>
        </thead>
        <tbody>
          {filteredEvents.map((event, idx) => {
            const exam = event.resource;
            const startTime = exam.start_time ? moment(exam.start_time, 'HH:mm').format('h:mm a') : '';
            const endTime = exam.end_time ? moment(exam.end_time, 'HH:mm').format('h:mm a') : '';
            const timeRange = startTime && endTime ? `${startTime} – ${endTime}` : 'All Day';
            const courseName = courseMap.get(exam.course) || courseMap.get(exam.course.toUpperCase()) || exam.course;
            
            return (
              <tr 
                key={idx} 
                className="cursor-pointer hover:bg-accent/50"
                onClick={() => navigate(`/add-exam?edit=${event.id}`)}
              >
                <td className="rbc-agenda-date-cell">
                  {moment(event.start).format('ddd MMM DD')}
                </td>
                <td className="rbc-agenda-time-cell">
                  {timeRange}
                </td>
                <td className="rbc-agenda-event-cell">
                  <div className="font-semibold">{courseName}: {exam.title}</div>
                </td>
                <td className="rbc-agenda-location-cell">
                  {exam.location || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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

      <main className="container mx-auto px-6 lg:px-8 py-8 lg:py-12 max-w-7xl animate-fade-in">
        {/* Header */}
        <div className="mb-8 lg:mb-12 animate-slide-down">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-3 tracking-tight">
                Calendar
              </h1>
              <p className="text-base text-muted-foreground">
                View your exam schedule in calendar format
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

        {/* Calendar controls */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleNavigate('TODAY')}
            >
              Today
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate('PREV')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <span className="text-xl font-semibold min-w-[250px] text-center">
                {getDateRangeLabel()}
              </span>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate('NEXT')}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              Week
            </Button>
            <Button
              variant={view === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('day')}
            >
              Day
            </Button>
            <Button
              variant={view === 'agenda' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('agenda')}
            >
              Agenda
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-lg overflow-hidden animate-slide-up" style={{ height: 'calc(100vh - 350px)', minHeight: '500px' }}>
          {view === 'agenda' ? (
            <CustomAgenda events={events} date={date} courseMap={courseMap} />
          ) : (
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              views={['month', 'week', 'day']}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              step={30}
              timeslots={2}
              min={new Date(0, 0, 0, 0, 0, 0)}
              max={new Date(0, 0, 0, 23, 59, 59)}
              scrollToTime={new Date(0, 0, 0, 8, 0, 0)}
              style={{ height: '100%' }}
              toolbar={false}
              messages={{
                date: 'DATE',
                time: 'TIME',
                event: 'EVENT',
              }}
              components={{
                event: (props) => <CustomEvent {...props} courseMap={courseMap} />
              }}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: event.resource.color || '#821537',
                  borderColor: event.resource.color || '#821537',
                }
              })}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Calendar;
