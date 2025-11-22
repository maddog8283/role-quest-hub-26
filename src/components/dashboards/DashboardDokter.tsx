import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, ClipboardList, FileText, Stethoscope } from "lucide-react";

export default function DashboardDokter() {
  const { profile } = useAuth();
  const [queues, setQueues] = useState<any[]>([]);
  const [examinations, setExaminations] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    physical_examination: "",
    diagnosis: "",
    notes: "",
  });
  const [prescriptionItems, setPrescriptionItems] = useState<any[]>([
    { medicine_name: "", dosage: "", frequency: "", duration: "", instructions: "" },
  ]);

  useEffect(() => {
    fetchQueues();
    fetchExaminations();
  }, []);

  const fetchQueues = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("patient_queue")
      .select("*, patients(*, profiles(full_name, email))")
      .eq("queue_date", today)
      .in("status", ["waiting", "in_progress"])
      .order("queue_number", { ascending: true });

    setQueues(data || []);
  };

  const fetchExaminations = async () => {
    const { data } = await supabase
      .from("examinations")
      .select("*, patients(*, profiles(full_name))")
      .eq("doctor_id", profile!.id)
      .order("examination_date", { ascending: false })
      .limit(10);

    setExaminations(data || []);
  };

  const handleStartExamination = async (queue: any) => {
    const { error } = await supabase
      .from("patient_queue")
      .update({ status: "in_progress" })
      .eq("id", queue.id);

    if (error) {
      toast.error("Gagal memulai pemeriksaan");
    } else {
      setSelectedQueue(queue);
      setIsDialogOpen(true);
      fetchQueues();
    }
  };

  const handleSubmitExamination = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: examData, error: examError } = await supabase
      .from("examinations")
      .insert({
        patient_id: selectedQueue.patient_id,
        doctor_id: profile!.id,
        queue_id: selectedQueue.id,
        chief_complaint: selectedQueue.complaint,
        physical_examination: examForm.physical_examination,
        diagnosis: examForm.diagnosis,
        notes: examForm.notes,
      })
      .select()
      .single();

    if (examError) {
      toast.error("Gagal menyimpan hasil pemeriksaan");
      return;
    }

    const validItems = prescriptionItems.filter((item) => item.medicine_name);
    if (validItems.length > 0) {
      const { data: prescriptionData, error: prescError } = await supabase
        .from("prescriptions")
        .insert({
          examination_id: examData.id,
          patient_id: selectedQueue.patient_id,
          doctor_id: profile!.id,
        })
        .select()
        .single();

      if (!prescError && prescriptionData) {
        const items = validItems.map((item) => ({
          prescription_id: prescriptionData.id,
          ...item,
        }));

        await supabase.from("prescription_items").insert(items);
      }
    }

    // Create payment record
    await supabase.from("payments").insert({
      patient_id: selectedQueue.patient_id,
      examination_id: examData.id,
      amount: 0,
      payment_method: "cash",
      status: "pending",
    });

    await supabase
      .from("patient_queue")
      .update({ status: "completed" })
      .eq("id", selectedQueue.id);

    toast.success("Pemeriksaan berhasil disimpan!");
    setIsDialogOpen(false);
    setSelectedQueue(null);
    setExamForm({ physical_examination: "", diagnosis: "", notes: "" });
    setPrescriptionItems([
      { medicine_name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
    fetchQueues();
    fetchExaminations();
  };

  const addPrescriptionItem = () => {
    setPrescriptionItems([
      ...prescriptionItems,
      { medicine_name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  return (
    <DashboardLayout title="Dashboard Dokter">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Antrian Hari Ini</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queues.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pemeriksaan</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{examinations.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Antrian Pasien</CardTitle>
            <CardDescription>Daftar pasien yang menunggu pemeriksaan</CardDescription>
          </CardHeader>
          <CardContent>
            {queues.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Tidak ada antrian</p>
            ) : (
              <div className="space-y-3">
                {queues.map((queue) => (
                  <div key={queue.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg">#{queue.queue_number}</span>
                        <div>
                          <p className="font-semibold">{queue.patients?.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{queue.complaint}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={queue.status === "waiting" ? "default" : "secondary"}>
                        {queue.status === "waiting" ? "Menunggu" : "Sedang Diperiksa"}
                      </Badge>
                      {queue.status === "waiting" && (
                        <Button onClick={() => handleStartExamination(queue)}>
                          Mulai Pemeriksaan
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pemeriksaan Terkini</CardTitle>
          </CardHeader>
          <CardContent>
            {examinations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Belum ada riwayat</p>
            ) : (
              <div className="space-y-3">
                {examinations.map((exam) => (
                  <div key={exam.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{exam.patients?.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(exam.examination_date).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <Badge>Selesai</Badge>
                    </div>
                    <p className="text-sm mb-1">
                      <span className="font-medium">Diagnosis:</span> {exam.diagnosis}
                    </p>
                    <p className="text-sm text-muted-foreground">{exam.chief_complaint}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pemeriksaan Pasien</DialogTitle>
              <DialogDescription>
                {selectedQueue?.patients?.profiles?.full_name} - {selectedQueue?.complaint}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitExamination} className="space-y-4">
              <div className="space-y-2">
                <Label>Pemeriksaan Fisik</Label>
                <Textarea
                  value={examForm.physical_examination}
                  onChange={(e) =>
                    setExamForm({ ...examForm, physical_examination: e.target.value })
                  }
                  placeholder="Hasil pemeriksaan fisik..."
                />
              </div>

              <div className="space-y-2">
                <Label>Diagnosis *</Label>
                <Input
                  value={examForm.diagnosis}
                  onChange={(e) => setExamForm({ ...examForm, diagnosis: e.target.value })}
                  placeholder="Diagnosis penyakit..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Catatan</Label>
                <Textarea
                  value={examForm.notes}
                  onChange={(e) => setExamForm({ ...examForm, notes: e.target.value })}
                  placeholder="Catatan tambahan..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Resep Obat</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPrescriptionItem}>
                    Tambah Obat
                  </Button>
                </div>
                {prescriptionItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                    <Input
                      placeholder="Nama obat"
                      value={item.medicine_name}
                      onChange={(e) => {
                        const updated = [...prescriptionItems];
                        updated[index].medicine_name = e.target.value;
                        setPrescriptionItems(updated);
                      }}
                    />
                    <Input
                      placeholder="Dosis"
                      value={item.dosage}
                      onChange={(e) => {
                        const updated = [...prescriptionItems];
                        updated[index].dosage = e.target.value;
                        setPrescriptionItems(updated);
                      }}
                    />
                    <Input
                      placeholder="Frekuensi (3x sehari)"
                      value={item.frequency}
                      onChange={(e) => {
                        const updated = [...prescriptionItems];
                        updated[index].frequency = e.target.value;
                        setPrescriptionItems(updated);
                      }}
                    />
                    <Input
                      placeholder="Durasi (7 hari)"
                      value={item.duration}
                      onChange={(e) => {
                        const updated = [...prescriptionItems];
                        updated[index].duration = e.target.value;
                        setPrescriptionItems(updated);
                      }}
                    />
                    <Input
                      className="col-span-2"
                      placeholder="Instruksi"
                      value={item.instructions}
                      onChange={(e) => {
                        const updated = [...prescriptionItems];
                        updated[index].instructions = e.target.value;
                        setPrescriptionItems(updated);
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan Pemeriksaan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
