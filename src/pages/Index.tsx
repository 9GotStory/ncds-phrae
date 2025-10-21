import { useNavigate } from "react-router-dom";
import { Activity, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Activity className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">ยินดีต้อนรับสู่ระบบติดตาม NCDs</CardTitle>
          <CardDescription>
            จังหวัดแพร่
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            ระบบติดตามและจัดการข้อมูลโรคไม่ติดต่อเรื้อรัง (NCDs) สำหรับจังหวัดแพร่
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate("/")} 
              className="flex-1 gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              ดูภาพรวม
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
