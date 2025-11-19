-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('pasien', 'petugas_administrasi', 'pemilik_klinik', 'dokter', 'petugas_apotek');

-- Create profiles table for users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger for profiles updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create patients table (extended info for pasien)
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth DATE,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  blood_type TEXT,
  allergies TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own data"
  ON public.patients FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Patients can update their own data"
  ON public.patients FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Medical staff can view patient data"
  ON public.patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('dokter', 'petugas_apotek', 'petugas_administrasi')
    )
  );

CREATE TRIGGER set_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Queue management table
CREATE TABLE public.patient_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  queue_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
  complaint TEXT NOT NULL,
  queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.patient_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own queue"
  ON public.patient_queue FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Patients can insert their own queue"
  ON public.patient_queue FOR INSERT
  WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Staff can view all queues"
  ON public.patient_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('dokter', 'petugas_administrasi')
    )
  );

CREATE POLICY "Staff can update queues"
  ON public.patient_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('dokter', 'petugas_administrasi')
    )
  );

CREATE TRIGGER set_patient_queue_updated_at
  BEFORE UPDATE ON public.patient_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Medical examinations table
CREATE TABLE public.examinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  queue_id UUID REFERENCES public.patient_queue(id),
  chief_complaint TEXT NOT NULL,
  physical_examination TEXT,
  diagnosis TEXT NOT NULL,
  notes TEXT,
  examination_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.examinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own examinations"
  ON public.examinations FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Doctors can view all examinations"
  ON public.examinations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'dokter'
    )
  );

CREATE POLICY "Doctors can insert examinations"
  ON public.examinations FOR INSERT
  WITH CHECK (
    doctor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'dokter'
    )
  );

CREATE POLICY "Doctors can update their own examinations"
  ON public.examinations FOR UPDATE
  USING (doctor_id = auth.uid());

CREATE POLICY "Pharmacy staff can view examinations"
  ON public.examinations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'petugas_apotek'
    )
  );

CREATE TRIGGER set_examinations_updated_at
  BEFORE UPDATE ON public.examinations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Prescriptions table
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examination_id UUID NOT NULL REFERENCES public.examinations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own prescriptions"
  ON public.prescriptions FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Doctors can manage prescriptions"
  ON public.prescriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'dokter'
    )
  );

CREATE POLICY "Pharmacy staff can view and update prescriptions"
  ON public.prescriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'petugas_apotek'
    )
  );

CREATE POLICY "Pharmacy staff can update prescription status"
  ON public.prescriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'petugas_apotek'
    )
  );

CREATE TRIGGER set_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Prescription items table
CREATE TABLE public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prescription items if they can view prescription"
  ON public.prescription_items FOR SELECT
  USING (
    prescription_id IN (
      SELECT id FROM public.prescriptions
    )
  );

CREATE POLICY "Doctors can manage prescription items"
  ON public.prescription_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'dokter'
    )
  );

-- Medicine stock table
CREATE TABLE public.medicine_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  expiry_date DATE,
  supplier TEXT,
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.medicine_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy staff can manage medicine stock"
  ON public.medicine_stock FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'petugas_apotek'
    )
  );

CREATE TRIGGER set_medicine_stock_updated_at
  BEFORE UPDATE ON public.medicine_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  examination_id UUID REFERENCES public.examinations(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own payments"
  ON public.payments FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Admin staff can manage payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'petugas_administrasi'
    )
  );

CREATE POLICY "Clinic owner can view all payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'pemilik_klinik'
    )
  );

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Patient feedback table
CREATE TABLE public.patient_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.patient_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can insert their own feedback"
  ON public.patient_feedback FOR INSERT
  WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Patients can view their own feedback"
  ON public.patient_feedback FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Clinic owner can view all feedback"
  ON public.patient_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'pemilik_klinik'
    )
  );

-- Function to auto-create patient record for new users with pasien role
CREATE OR REPLACE FUNCTION public.handle_new_patient_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'pasien' THEN
    INSERT INTO public.patients (profile_id)
    VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_patient_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_patient_user();