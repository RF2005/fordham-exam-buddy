import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, LayoutDashboard, Plus, LogOut, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from '@/assets/logo.png';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl shadow-sm">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/dashboard")}
          >
            <img
              src={logo}
              alt="Fordham Exam Planner"
              className="h-14 transition-transform group-hover:scale-105"
            />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-foreground">Exam Planner</h1>
              <p className="text-xs text-muted-foreground">Fordham University</p>
            </div>
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant={isActive("/dashboard") ? "default" : "ghost"}
              size="default"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={isActive("/calendar") ? "default" : "ghost"}
              size="default"
              onClick={() => navigate("/calendar")}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </Button>
            <Button
              variant={isActive("/test-reminders") ? "default" : "ghost"}
              size="default"
              onClick={() => navigate("/test-reminders")}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Reminders
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="default"
              onClick={() => navigate("/add-exam")}
              className="gap-2 hidden md:flex"
            >
              <Plus className="h-4 w-4" />
              Add Exam
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/add-exam")}
              className="md:hidden"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="hidden md:flex"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2 pb-4 overflow-x-auto">
          <Button
            variant={isActive("/dashboard") ? "default" : "outline"}
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="gap-2 flex-1"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Button>
          <Button
            variant={isActive("/calendar") ? "default" : "outline"}
            size="sm"
            onClick={() => navigate("/calendar")}
            className="gap-2 flex-1"
          >
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </Button>
          <Button
            variant={isActive("/test-reminders") ? "default" : "outline"}
            size="sm"
            onClick={() => navigate("/test-reminders")}
            className="gap-2 flex-1"
          >
            <Bell className="h-3.5 w-3.5" />
            Reminders
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
