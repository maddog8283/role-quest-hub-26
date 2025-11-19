import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Users, Activity, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardPemilik() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPatients: 0,
    totalExaminations: 0,
    averageRating: 0,
  });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentPayments();
    fetchFeedbacks();
  }, []);

  const fetchStats = async () => {
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "completed");

    const { data: patients } = await supabase.from("patients").select("id");

    const { data: examinations } = await supabase.from("examinations").select("id");

    const { data: feedbackData } = await supabase.from("patient_feedback").select("rating");

    const totalRevenue = payments?.reduce(
      (sum, p) => sum + parseFloat(String(p.amount || 0)),
      0
    ) || 0;

    const averageRating = feedbackData && feedbackData.length > 0
      ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length
      : 0;

    setStats({
      totalRevenue,
      totalPatients: patients?.length || 0,
      totalExaminations: examinations?.length || 0,
      averageRating,
    });
  };

  const fetchRecentPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*, patients(*, profiles(full_name))")
      .eq("status", "completed")
      .order("paid_at", { ascending: false })
      .limit(10);

    setRecentPayments(data || []);
  };

  const fetchFeedbacks = async () => {
    const { data } = await supabase
      .from("patient_feedback")
      .select("*, patients(*, profiles(full_name))")
      .order("created_at", { ascending: false })
      .limit(10);

    setFeedbacks(data || []);
  };

  return (
    <DashboardLayout title="Dashboard Pemilik Klinik">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {stats.totalRevenue.toLocaleString("id-ID")}
              </div>
              <p className="text-xs text-muted-foreground">Pendapatan keseluruhan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pasien</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPatients}</div>
              <p className="text-xs text-muted-foreground">Pasien terdaftar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pemeriksaan</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExaminations}</div>
              <p className="text-xs text-muted-foreground">Pemeriksaan dilakukan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating Rata-rata</CardTitle>
              <Star className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageRating.toFixed(1)} / 5
              </div>
              <p className="text-xs text-muted-foreground">Kepuasan pasien</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Keuangan Terkini</CardTitle>
              <CardDescription>10 transaksi pembayaran terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Belum ada transaksi</p>
              ) : (
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">
                          {payment.patients?.profiles?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.paid_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          Rp {parseFloat(payment.amount).toLocaleString("id-ID")}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {payment.payment_method}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feedback Pasien</CardTitle>
              <CardDescription>Ulasan terkini dari pasien</CardDescription>
            </CardHeader>
            <CardContent>
              {feedbacks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Belum ada feedback</p>
              ) : (
                <div className="space-y-3">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="font-semibold text-sm">
                          {feedback.patients?.profiles?.full_name}
                        </p>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          <span className="text-sm font-medium">{feedback.rating}</span>
                        </div>
                      </div>
                      {feedback.feedback_text && (
                        <p className="text-sm text-muted-foreground">{feedback.feedback_text}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(feedback.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
