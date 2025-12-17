import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  FileSpreadsheet,
  UserCircle,
  Settings,
  LogOut,
  Loader2,
  Menu,
  X,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, hasRole } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Mobile menu state

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
      setIsOpen(false);
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

  const MobileLink = ({ to, icon: Icon, children, onClick }: any) => (
    <Link
      to={to}
      onClick={() => {
        setIsOpen(false);
        if (onClick) onClick();
      }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors",
        isActive(to)
          ? "bg-primary/10 text-primary"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon className="h-5 w-5" />
      {children}
    </Link>
  );

  const canAccessAdmin = hasRole(["admin"]);
  const canAccessDataEntry = hasRole(["officer"]);

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <Link
            to="/"
            className="flex items-center gap-2 group transition-all duration-300 hover:opacity-100 hover:scale-[1.02]"
          >
            <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 group-hover:shadow-sm transition-all duration-300">
              <Activity className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none group-hover:text-primary transition-colors">
                NCDs Phrae
              </h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide text-muted-foreground uppercase group-hover:text-slate-600">
                Surveillance System
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/">
              <Button
                variant={isActive("/") ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2 h-9 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 hover:scale-[1.02] active:scale-95",
                  isActive("/") &&
                    "bg-slate-100 text-slate-900 font-semibold shadow-sm"
                )}
              >
                <Home className="w-4 h-4" />
                หน้าหลัก
              </Button>
            </Link>
            <Link to="/detail">
              <Button
                variant={isActive("/detail") ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2 h-9 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 hover:scale-[1.02] active:scale-95",
                  isActive("/detail") &&
                    "bg-slate-100 text-slate-900 font-semibold shadow-sm"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                รายงานละเอียด
              </Button>
            </Link>

            {canAccessDataEntry && (
              <Link to="/ncd-entry">
                <Button
                  variant={isActive("/ncd-entry") ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 h-9",
                    isActive("/ncd-entry") &&
                      "bg-slate-100 text-slate-900 font-semibold"
                  )}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  บันทึกข้อมูล
                </Button>
              </Link>
            )}

            <div className="mx-2 h-6 w-px bg-slate-200" />

            {/* User Profile / Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3 pl-2">
                <div className="flex flex-col items-end text-right leading-tight">
                  <span className="text-sm font-semibold text-slate-700">
                    {user?.name || user?.username}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    {user?.role}
                  </span>
                </div>
                {canAccessAdmin && (
                  <Link to="/admin">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-500 hover:text-slate-900"
                      title="ตั้งค่าระบบ"
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-9 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  <span className="hidden lg:inline">ออก</span>
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 h-9 shadow-sm"
                >
                  <UserCircle className="w-4 h-4" />
                  เข้าสู่ระบบ
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden flex items-center gap-2">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-slate-700"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[85vw] sm:w-[350px] p-0 flex flex-col"
              >
                <SheetHeader className="p-6 border-b bg-slate-50/50">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-bold text-slate-800">เมนูนำทาง</span>
                  </SheetTitle>
                  {isAuthenticated && (
                    <SheetDescription asChild>
                      <div className="text-left pt-2 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border text-slate-400">
                          <UserCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {user?.name || user?.username}
                          </div>
                          <div className="text-xs text-slate-500 uppercase font-medium bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                            {user?.role}
                          </div>
                        </div>
                      </div>
                    </SheetDescription>
                  )}{" "}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                  <div className="px-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Main
                  </div>
                  <MobileLink to="/" icon={Home}>
                    หน้าหลัก (Overview)
                  </MobileLink>
                  <MobileLink to="/detail" icon={BarChart3}>
                    รายงานละเอียด (Detail)
                  </MobileLink>

                  {canAccessDataEntry && (
                    <>
                      <div className="mt-6 px-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Operational
                      </div>
                      <MobileLink to="/ncd-entry" icon={FileSpreadsheet}>
                        บันทึกข้อมูล (Data Entry)
                      </MobileLink>
                    </>
                  )}

                  {canAccessAdmin && (
                    <>
                      <div className="mt-6 px-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        System
                      </div>
                      <MobileLink to="/admin" icon={Settings}>
                        จัดการระบบ (Admin)
                      </MobileLink>
                    </>
                  )}
                </div>

                <div className="p-4 border-t bg-slate-50/50">
                  {isAuthenticated ? (
                    <Button
                      variant="destructive"
                      className="w-full justify-start gap-2 shadow-sm"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                    >
                      {isLoggingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      ออกจากระบบ
                    </Button>
                  ) : (
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button className="w-full justify-start gap-2 shadow-sm">
                        <UserCircle className="w-4 h-4" />
                        เข้าสู่ระบบ
                      </Button>
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
