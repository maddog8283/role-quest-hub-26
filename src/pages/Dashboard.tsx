import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardPasien from "@/components/dashboards/DashboardPasien";
import DashboardDokter from "@/components/dashboards/DashboardDokter";
import DashboardAdministrasi from "@/components/dashboards/DashboardAdministrasi";
import DashboardApotek from "@/components/dashboards/DashboardApotek";
import DashboardPemilik from "@/components/dashboards/DashboardPemilik";

export default function Dashboard() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !profile) {
      navigate("/auth");
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) return null;

  switch (profile.role) {
    case "pasien":
      return <DashboardPasien />;
    case "dokter":
      return <DashboardDokter />;
    case "petugas_administrasi":
      return <DashboardAdministrasi />;
    case "petugas_apotek":
      return <DashboardApotek />;
    case "pemilik_klinik":
      return <DashboardPemilik />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Role tidak dikenali</p>
        </div>
      );
  }
}
