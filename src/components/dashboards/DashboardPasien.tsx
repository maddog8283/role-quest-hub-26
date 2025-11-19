import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, Calendar, MessageSquare, FileText } from "lucide-react";

export default function DashboardPasien() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [queues, setQueues] = useState<any[]>([]);
  const [examinations, setExaminations] = useState<any[]>([]);
  const [complaint, setComplaint] = useState("");
  const [feedback, setFeedback] = useState({ rating: 5, text: "" });

  useEffect(() => {
    if (profile) {
      fetchQueues();
      fetchExaminations();
    }
  }, [profile]);

  const fetchQueues = async () => {
    const { data: patientData } = await supabase
      .from("patients")
      .select("id")
      .eq("profile_id", profile!.id)
      .single();

    if (patientData) {
      const { data } = await supabase
        .from("patient_queue")
        .select("*")
        .eq("patient_id", patientData.id)
        .order("created_at", { ascending: false });

      setQueues(data || []);
    }
  };

  const fetchExaminations = async () => {
    const { data: patientData } = await supabase
      .from("patients")
      .select("id")
      .eq("profile_id", profile!.id)
      .single();

    if (patientData) {
      const { data } = await supabase
        .from("examinations")
        .select("*, profiles!examinations_doctor_id_fkey(full_name)")
        .eq("patient_id", patientData.id)
        .order("examination_date", { ascending: false });

      setExaminations(data || []);
    }
  };

  const handleRegisterQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: patientData } = await supabase
      .from("patients")
      .select("id")
      .eq("profile_id", profile!.id)
      .single();

    if (!patientData) {
      toast.error("Data pasien tidak ditemukan");
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: todayQueues } = await supabase
      .from("patient_queue")
      .select("queue_number")
      .eq("queue_date", today)
      .order("queue_number", { ascending: false })
      .limit(1);

    const nextNumber = todayQueues && todayQueues.length > 0 ? todayQueues[0].queue_number + 1 : 1;

    const { error } = await supabase.from("patient_queue").insert({
      patient_id: patientData.id,
      queue_number: nextNumber,
      complaint,
      queue_date: today,
    });

    if (error) {
      toast.error("Gagal mendaftar antrian", { description: error.message });
    } else {
      toast.success("Berhasil mendaftar antrian!", {
        description: `Nomor antrian Anda: ${nextNumber}`,
      });
      setComplaint("");
      fetchQueues();
    }

    setLoading(false);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: patientData } = await supabase
      .from("patients")
      .select("id")
      .eq("profile_id", profile!.id)
      .single();

    if (!patientData) {
      toast.error("Data pasien tidak ditemukan");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("patient_feedback").insert({
      patient_id: patientData.id,
      rating: feedback.rating,
      feedback_text: feedback.text,
    });

    if (error) {
      toast.error("Gagal mengirim feedback", { description: error.message });
    } else {
      toast.success("Terima kasih atas feedback Anda!");
      setFeedback({ rating: 5, text: "" });
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      waiting: "default",
      in_progress: "secondary",
      completed: "outline",
      cancelled: "outline",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status === "waiting" && "Menunggu"}
        {status === "in_progress" && "Sedang Diperiksa"}
        {status === "completed" && "Selesai"}
        {status === "cancelled" && "Dibatalkan"}
      </Badge>
    );
  };

  return (
    <DashboardLayout title="Dashboard Pasien">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Kunjungan</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{examinations.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Antrian Aktif</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {queues.filter((q) => q.status === "waiting").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="register" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="register">Daftar Antrian</TabsTrigger>
            <TabsTrigger value="history">Riwayat</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Antrian Baru</CardTitle>
                <CardDescription>Daftarkan diri Anda untuk pemeriksaan hari ini</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterQueue} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="complaint">Keluhan</Label>
                    <Textarea
                      id="complaint"
                      placeholder="Jelaskan keluhan Anda..."
                      value={complaint}
                      onChange={(e) => setComplaint(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Memproses..." : "Daftar Antrian"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Antrian Hari Ini</CardTitle>
              </CardHeader>
              <CardContent>
                {queues.filter((q) => q.queue_date === new Date().toISOString().split("T")[0])
                  .length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Belum ada antrian</p>
                ) : (
                  <div className="space-y-3">
                    {queues
                      .filter((q) => q.queue_date === new Date().toISOString().split("T")[0])
                      .map((queue) => (
                        <div
                          key={queue.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-semibold">Nomor Antrian: {queue.queue_number}</p>
                            <p className="text-sm text-muted-foreground">{queue.complaint}</p>
                          </div>
                          {getStatusBadge(queue.status)}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Pemeriksaan</CardTitle>
              </CardHeader>
              <CardContent>
                {examinations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Belum ada riwayat</p>
                ) : (
                  <div className="space-y-3">
                    {examinations.map((exam) => (
                      <div key={exam.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{exam.diagnosis}</p>
                            <p className="text-sm text-muted-foreground">
                              Dokter: {exam.profiles?.full_name}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(exam.examination_date).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                        <p className="text-sm">{exam.chief_complaint}</p>
                        {exam.notes && (
                          <p className="text-sm text-muted-foreground">Catatan: {exam.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Berikan Feedback</CardTitle>
                <CardDescription>Bagikan pengalaman Anda menggunakan layanan kami</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rating">Rating (1-5)</Label>
                    <Input
                      id="rating"
                      type="number"
                      min="1"
                      max="5"
                      value={feedback.rating}
                      onChange={(e) =>
                        setFeedback({ ...feedback, rating: parseInt(e.target.value) })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback-text">Komentar</Label>
                    <Textarea
                      id="feedback-text"
                      placeholder="Tuliskan feedback Anda..."
                      value={feedback.text}
                      onChange={(e) => setFeedback({ ...feedback, text: e.target.value })}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Mengirim..." : "Kirim Feedback"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
