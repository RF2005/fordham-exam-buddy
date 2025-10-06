import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TestReminders = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleTestReminders = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-send-reminders');

      if (error) throw error;

      setResults(data);
      
      if (data.emailsSent > 0) {
        toast({
          title: "Test emails sent!",
          description: `Successfully sent ${data.emailsSent} reminder email(s). Check your inbox.`
        });
      } else {
        toast({
          title: "No emails sent",
          description: "No matching reminders found. Make sure your exam date matches a reminder day setting.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Test error:", error);
      toast({
        variant: "destructive",
        title: "Test failed",
        description: error.message || "Failed to test email reminders"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Test Email Reminders</CardTitle>
            <CardDescription>
              Manually trigger the reminder system to test if emails are sent correctly.
              This checks your current exams and sends reminders based on your notification preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">How it works:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Calculates days until each exam</li>
                <li>Checks if any match your reminder day settings</li>
                <li>Sends test emails to your configured @fordham.edu address</li>
              </ul>
            </div>

            <Button 
              onClick={handleTestReminders} 
              disabled={loading}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {loading ? 'Testing...' : 'Send Test Reminders Now'}
            </Button>

            {results && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">
                      Emails sent: {results.emailsSent}
                    </p>
                    {results.results && results.results.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {results.results.map((result: any, idx: number) => (
                          <div 
                            key={idx} 
                            className={`p-3 rounded border ${
                              result.success 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <p className="text-sm font-medium">{result.exam}</p>
                            <p className="text-xs text-muted-foreground">
                              To: {result.email} ({result.daysUntil} days)
                            </p>
                            {result.error && (
                              <p className="text-xs text-red-600 mt-1">{result.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TestReminders;
