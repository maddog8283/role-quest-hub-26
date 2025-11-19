import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Users, CreditCard } from "lucide-react";

export default function DashboardAdministrasi() {
  const [payments, setPayments] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "cash",
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*, patients(*, profiles(full_name))")
      .order("created_at", { ascending: false });

    if (data) {
      setPayments(data);
      const total = data
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0);
      setTotalRevenue(total);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from("payments")
      .update({
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        status: "completed",
        paid_at: new Date().toISOString(),
      })
      .eq("id", selectedPayment.id);

    if (error) {
      toast.error("Gagal memproses pembayaran");
    } else {
      toast.success("Pembayaran berhasil diproses!");
      setIsDialogOpen(false);
      setSelectedPayment(null);
      setPaymentForm({ amount: "", payment_method: "cash" });
      fetchPayments();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      pending: "default",
      completed: "secondary",
      cancelled: "outline",
    };
    const labels: Record<string, string> = {
      pending: "Belum Lunas",
      completed: "Lunas",
      cancelled: "Dibatalkan",
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <DashboardLayout title="Dashboard Administrasi">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {totalRevenue.toLocaleString("id-ID")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pembayaran Pending</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payments.filter((p) => p.status === "pending").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Manajemen Pembayaran</CardTitle>
            <CardDescription>Kelola pembayaran pasien</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Tidak ada data pembayaran</p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{payment.patients?.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.amount
                          ? `Rp ${parseFloat(payment.amount).toLocaleString("id-ID")}`
                          : "Belum ditentukan"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(payment.status)}
                      {payment.status === "pending" && (
                        <Button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setIsDialogOpen(true);
                          }}
                        >
                          Proses Bayar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Proses Pembayaran</DialogTitle>
              <DialogDescription>
                Pasien: {selectedPayment?.patients?.profiles?.full_name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div className="space-y-2">
                <Label>Jumlah Pembayaran (Rp) *</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Metode Pembayaran *</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value) =>
                    setPaymentForm({ ...paymentForm, payment_method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Kredit</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
