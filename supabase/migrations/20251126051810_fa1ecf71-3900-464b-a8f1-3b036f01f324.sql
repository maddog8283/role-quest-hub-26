-- Create trigger to automatically create patient record when user with role 'pasien' signs up
CREATE TRIGGER on_new_patient_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_patient_user();