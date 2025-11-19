import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, FileText, AlertCircle } from "lucide-react";

export default function DashboardApotek() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [medicineForm, setMedicineForm] = useState({
    medicine_name: "",
    quantity: "",
    unit: "",
    price: "",
    supplier: "",
    expiry_date: "",
  });

  useEffect(() => {
    fetchMedicines();
    fetchPrescriptions();
  }, []);

  const fetchMedicines = async () => {
    const { data } = await supabase
      .from("medicine_stock")
      .select("*")
      .order("medicine_name", { ascending: true });

    setMedicines(data || []);
  };

  const fetchPrescriptions = async () => {
    const { data } = await supabase
      .from("prescriptions")
      .select(`
        *,
        patients(*, profiles(full_name)),
        profiles!prescriptions_doctor_id_fkey(full_name),
        prescription_items(*)
      `)
      .order("created_at", { ascending: false });

    setPrescriptions(data || []);
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("medicine_stock").insert({
      medicine_name: medicineForm.medicine_name,
      quantity: parseInt(medicineForm.quantity),
      unit: medicineForm.unit,
      price: parseFloat(medicineForm.price),
      supplier: medicineForm.supplier || null,
      expiry_date: medicineForm.expiry_date || null,
    });

    if (error) {
      toast.error("Gagal menambah stok obat");
    } else {
      toast.success("Stok obat berhasil ditambahkan!");
      setMedicineForm({
        medicine_name: "",
        quantity: "",
        unit: "",
        price: "",
        supplier: "",
        expiry_date: "",
      });
      fetchMedicines();
    }
  };

  const handleFillPrescription = async (prescriptionId: string) => {
    const { error } = await supabase
      .from("prescriptions")
      .update({ status: "filled" })
      .eq("id", prescriptionId);

    if (error) {
      toast.error("Gagal mengisi resep");
    } else {
      toast.success("Resep berhasil diisi!");
      fetchPrescriptions();
    }
  };

  const getLowStockMedicines = () => {
    return medicines.filter((m) => m.quantity < 10);
  };

  return (
    <DashboardLayout title="Dashboard Apotek">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Obat</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{medicines.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getLowStockMedicines().length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resep Pending</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {prescriptions.filter((p) => p.status === "pending").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="prescriptions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prescriptions">Resep</TabsTrigger>
            <TabsTrigger value="stock">Stok Obat</TabsTrigger>
          </TabsList>

          <TabsContent value="prescriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Resep</CardTitle>
                <CardDescription>Kelola resep dari dokter</CardDescription>
              </CardHeader>
              <CardContent>
                {prescriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Tidak ada resep</p>
                ) : (
                  <div className="space-y-3">
                    {prescriptions.map((prescription) => (
                      <div key={prescription.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">
                              {prescription.patients?.profiles?.full_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Dokter: {prescription.profiles?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(prescription.created_at).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                prescription.status === "pending" ? "default" : "secondary"
                              }
                            >
                              {prescription.status === "pending" ? "Pending" : "Terisi"}
                            </Badge>
                            {prescription.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => handleFillPrescription(prescription.id)}
                              >
                                Isi Resep
                              </Button>
                            )}
                          </div>
                        </div>
                        {prescription.prescription_items && (
                          <div className="mt-2 space-y-1">
                            <p className="text-sm font-medium">Obat:</p>
                            {prescription.prescription_items.map((item: any) => (
                              <div key={item.id} className="text-sm text-muted-foreground pl-4">
                                • {item.medicine_name} - {item.dosage} ({item.frequency},{" "}
                                {item.duration})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tambah Stok Obat</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMedicine} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nama Obat *</Label>
                      <Input
                        value={medicineForm.medicine_name}
                        onChange={(e) =>
                          setMedicineForm({ ...medicineForm, medicine_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Jumlah *</Label>
                      <Input
                        type="number"
                        value={medicineForm.quantity}
                        onChange={(e) =>
                          setMedicineForm({ ...medicineForm, quantity: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Satuan *</Label>
                      <Input
                        value={medicineForm.unit}
                        onChange={(e) =>
                          setMedicineForm({ ...medicineForm, unit: e.target.value })
                        }
                        placeholder="tablet, kapsul, botol"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Harga (Rp) *</Label>
                      <Input
                        type="number"
                        value={medicineForm.price}
                        onChange={(e) =>
                          setMedicineForm({ ...medicineForm, price: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Supplier</Label>
                      <Input
                        value={medicineForm.supplier}
                        onChange={(e) =>
                          setMedicineForm({ ...medicineForm, supplier: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tanggal Kadaluarsa</Label>
                      <Input
                        type="date"
                        value={medicineForm.expiry_date}
                        onChange={(e) =>
                          setMedicineForm({ ...medicineForm, expiry_date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <Button type="submit">Tambah Stok</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stok Obat</CardTitle>
                <CardDescription>
                  {getLowStockMedicines().length > 0 && (
                    <span className="text-warning">
                      {getLowStockMedicines().length} obat dengan stok rendah
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {medicines.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Belum ada stok obat</p>
                ) : (
                  <div className="space-y-2">
                    {medicines.map((medicine) => (
                      <div
                        key={medicine.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">{medicine.medicine_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Rp {parseFloat(medicine.price).toLocaleString("id-ID")} /{" "}
                            {medicine.unit}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-semibold ${
                              medicine.quantity < 10 ? "text-warning" : ""
                            }`}
                          >
                            {medicine.quantity} {medicine.unit}
                          </p>
                          {medicine.expiry_date && (
                            <p className="text-xs text-muted-foreground">
                              Exp: {new Date(medicine.expiry_date).toLocaleDateString("id-ID")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
