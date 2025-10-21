import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";
import Navigation from "@/components/Navigation";

const TestReminders = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

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

      let errorMessage = error.message || "Failed to test email reminders";

      // Provide more helpful error messages
      if (error.message?.includes("FunctionsRelayError") || error.message?.includes("Failed to fetch")) {
        errorMessage = "Edge function not deployed or not reachable. Please ensure the Supabase edge function is deployed.";
      } else if (error.message?.includes("unauthorized") || error.message?.includes("401")) {
        errorMessage = "Authentication error. Please check your Supabase configuration.";
      }

      toast({
        variant: "destructive",
        title: "Test failed",
        description: errorMessage
      });

      setResults({
        emailsSent: 0,
        error: errorMessage
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
                    {results.error && (
                      <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive font-medium">Error:</p>
                        <p className="text-sm text-muted-foreground mt-1">{results.error}</p>
                      </div>
                    )}
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

            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="text-base text-orange-900">Setup Required</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-orange-800 space-y-3">
                <p className="font-medium">For this feature to work, you need to:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Deploy the <code className="bg-orange-100 px-1 py-0.5 rounded">test-send-reminders</code> edge function to Supabase</li>
                  <li>Configure environment variables in Supabase dashboard:
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                      <li><code className="bg-orange-100 px-1 py-0.5 rounded">RESEND_API_KEY</code></li>
                      <li><code className="bg-orange-100 px-1 py-0.5 rounded">SUPABASE_URL</code></li>
                      <li><code className="bg-orange-100 px-1 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code></li>
                    </ul>
                  </li>
                  <li>Set up notification preferences and add exams with matching reminder days</li>
                </ol>
                <p className="text-xs mt-3 text-orange-700">
                  See <code className="bg-orange-100 px-1 py-0.5 rounded">README.md</code> for detailed setup instructions
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TestReminders;
