import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Activity, Users, Stethoscope, Pill, TrendingUp } from "lucide-react";

export default function Index() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile) {
      navigate("/dashboard");
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-2xl">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Klinik Sentosa</h1>
              <p className="text-sm text-muted-foreground">Sistem Manajemen Klinik</p>
            </div>
          </div>
          <Button onClick={() => navigate("/auth")} size="lg">
            Masuk / Daftar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <section className="py-20 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-5xl font-bold tracking-tight">
              Sistem Informasi Klinik Modern
            </h2>
            <p className="text-xl text-muted-foreground">
              Platform manajemen klinik yang terintegrasi untuk meningkatkan efisiensi pelayanan
              kesehatan
            </p>
            <div className="flex gap-4 justify-center pt-6">
              <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
                <Activity className="w-5 h-5" />
                Mulai Sekarang
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20">
          <h3 className="text-3xl font-bold text-center mb-12">Fitur Sistem</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="p-6 border rounded-xl bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Manajemen Pasien</h4>
              <p className="text-muted-foreground">
                Pendaftaran online, antrian digital, dan riwayat medis lengkap
              </p>
            </div>

            <div className="p-6 border rounded-xl bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Pemeriksaan Digital</h4>
              <p className="text-muted-foreground">
                Pencatatan hasil pemeriksaan dan resep digital untuk dokter
              </p>
            </div>

            <div className="p-6 border rounded-xl bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
                <Pill className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Manajemen Apotek</h4>
              <p className="text-muted-foreground">
                Kelola stok obat dan resep dengan sistem terintegrasi
              </p>
            </div>

            <div className="p-6 border rounded-xl bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Laporan Keuangan</h4>
              <p className="text-muted-foreground">
                Laporan keuangan real-time untuk pemilik klinik
              </p>
            </div>

            <div className="p-6 border rounded-xl bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Multi-Role Access</h4>
              <p className="text-muted-foreground">
                Dashboard khusus untuk setiap role: Dokter, Admin, Apotek, Pemilik
              </p>
            </div>

            <div className="p-6 border rounded-xl bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Feedback Pasien</h4>
              <p className="text-muted-foreground">
                Sistem rating dan feedback untuk peningkatan layanan
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h3 className="text-3xl font-bold">Siap Meningkatkan Pelayanan Klinik Anda?</h3>
            <p className="text-xl text-muted-foreground">
              Bergabunglah dengan sistem manajemen klinik modern yang memudahkan operasional
              sehari-hari
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              <Activity className="w-5 h-5" />
              Mulai Sekarang
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 Klinik Sentosa. Sistem Informasi Manajemen Klinik.</p>
        </div>
      </footer>
    </div>
  );
}
