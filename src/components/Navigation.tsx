import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Activity, BarChart3, FileSpreadsheet, UserCircle, Settings, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";
import { useToast } from "@/hooks/use-toast";

export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, hasRole } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    toast({
      title: "กำลังออกจากระบบ",
      description: "กรุณารอสักครู่...",
    });

    try {
      await logout();
      toast({
        variant: "success",
        title: "ออกจากระบบสำเร็จ",
        description: "ระบบกำลังนำคุณไปยังหน้าแรก",
      });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกจากระบบได้ กรุณาลองอีกครั้ง",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const canAccessAdmin = hasRole(["admin"]);
  const canAccessDataEntry = hasRole(["officer"]);
  
  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">ระบบติดตาม NCDs</h1>
              <p className="text-xs text-muted-foreground">จังหวัดแพร่</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button 
                variant={isActive("/") ? "default" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                ภาพรวม
              </Button>
            </Link>
            <Link to="/detail">
              <Button 
                variant={isActive("/detail") ? "default" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <Activity className="w-4 h-4" />
                รายละเอียด
              </Button>
            </Link>
            {canAccessDataEntry && (
              <Link to="/ncd-entry">
                <Button
                  variant={isActive("/ncd-entry") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  บันทึกข้อมูล
                </Button>
              </Link>
            )}
            {canAccessAdmin && (
              <Link to="/admin">
                <Button 
                  variant={isActive("/admin") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  จัดการระบบ
                </Button>
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <div className="hidden md:flex flex-col items-end mr-2 text-right">
                  <span className="text-sm font-semibold text-foreground">{user?.name || user?.username}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  aria-busy={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button 
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <UserCircle className="w-4 h-4" />
                  เข้าสู่ระบบ
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
