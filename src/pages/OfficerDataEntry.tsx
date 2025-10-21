import Admin from "./Admin";

const OfficerDataEntry = () => (
  <Admin
    allowUserManagement={false}
    layoutVariant="officer"
    pageTitle="บันทึกข้อมูล NCD สำหรับพื้นที่ของคุณ"
    pageDescription="กรอกและอัปเดตข้อมูล NCD สำหรับอำเภอที่คุณรับผิดชอบ"
    loadingMessage="กำลังโหลดข้อมูลสำหรับเจ้าหน้าที่..."
  />
);

export default OfficerDataEntry;
