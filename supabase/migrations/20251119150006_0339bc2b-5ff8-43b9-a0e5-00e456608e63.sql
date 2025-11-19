-- Fix search_path for handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix search_path for handle_new_patient_user function
CREATE OR REPLACE FUNCTION public.handle_new_patient_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'pasien' THEN
    INSERT INTO public.patients (profile_id)
    VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$;