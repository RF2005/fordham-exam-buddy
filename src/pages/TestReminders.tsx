import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";

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
      <Navigation />

      <main className="container mx-auto px-6 lg:px-8 py-8 lg:py-12 max-w-3xl">
        {/* Header */}
        <div className="mb-8 lg:mb-12 animate-slide-down">
          <h1 className="text-4xl lg:text-5xl font-bold mb-3 tracking-tight">
            Test Reminders
          </h1>
          <p className="text-base text-muted-foreground">
            Manually trigger the reminder system to test email notifications
          </p>
        </div>

        <Card className="animate-slide-up">
          <CardContent className="pt-6 space-y-6">
            <div className="bg-muted/50 p-6 rounded-xl space-y-3 border">
              <p className="text-sm font-semibold">How it works:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2">
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
              <Card className="bg-accent/30 animate-fade-in">
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
