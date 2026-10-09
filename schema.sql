SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "compute";


ALTER SCHEMA "compute" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "deployments";


ALTER SCHEMA "deployments" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "email";


ALTER SCHEMA "email" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "functions";


ALTER SCHEMA "functions" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "memory";


ALTER SCHEMA "memory" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "payments";


ALTER SCHEMA "payments" OWNER TO "postgres";




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "schedules";


ALTER SCHEMA "schedules" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "system";


ALTER SCHEMA "system" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."audit_adherence_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
            BEGIN
                IF NEW.status IS DISTINCT FROM OLD.status THEN
                    INSERT INTO medication_adherence_audit (
                        adherence_id, old_status, new_status, changed_at
                    ) VALUES (
                        NEW.adherence_id, OLD.status, NEW.status, CURRENT_TIMESTAMP
                    );
                END IF;
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION "public"."audit_adherence_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_create_adherence_records"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
                DECLARE
                  medicine_record JSONB;
                  v_medicine_name TEXT;
                  dosage_times TEXT[];
                  time_slot TEXT;
                  curr_date DATE;
                  end_date DATE;
                  duration_days INTEGER;
                  duration_text TEXT;
                BEGIN
                  IF NEW.sent_to_patient = TRUE AND (OLD IS NULL OR OLD.sent_to_patient IS DISTINCT FROM TRUE) THEN
                    FOR medicine_record IN SELECT * FROM jsonb_array_elements(NEW.medicines)
                    LOOP
                      v_medicine_name := medicine_record->>'name';
                      dosage_times := ARRAY(
                        SELECT jsonb_array_elements_text(medicine_record->'times')
                      );
                      duration_text := LOWER(TRIM(medicine_record->>'duration'));
                      duration_days := CASE
                        WHEN duration_text ~ '^\d+\s*day'   THEN (regexp_match(duration_text, '(\d+)'))[1]::INTEGER
                        WHEN duration_text ~ '^\d+\s*week'  THEN (regexp_match(duration_text, '(\d+)'))[1]::INTEGER * 7
                        WHEN duration_text ~ '^\d+\s*month' THEN (regexp_match(duration_text, '(\d+)'))[1]::INTEGER * 30
                        WHEN duration_text ~ '^\d+\s*year'  THEN (regexp_match(duration_text, '(\d+)'))[1]::INTEGER * 365
                        ELSE 7
                      END;
                      IF dosage_times IS NULL OR array_length(dosage_times, 1) IS NULL THEN
                        DECLARE
                          freq_text TEXT := LOWER(TRIM(medicine_record->>'frequency'));
                        BEGIN
                          IF freq_text ~ 'twice' OR freq_text ~ '2 times' OR freq_text ~ 'morning.*night' OR freq_text ~ 'morning.*evening' THEN
                            dosage_times := ARRAY['09:00', '21:00'];
                          ELSIF freq_text ~ 'thrice' OR freq_text ~ '3 times' OR freq_text ~ 'morning.*afternoon.*night' THEN
                            dosage_times := ARRAY['09:00', '14:00', '21:00'];
                          ELSIF freq_text ~ '4 times' OR freq_text ~ 'four times' THEN
                            dosage_times := ARRAY['08:00', '12:00', '16:00', '20:00'];
                          ELSIF freq_text ~ 'bedtime' OR freq_text ~ 'night' THEN
                            dosage_times := ARRAY['22:00'];
                          ELSIF freq_text ~ 'afternoon' OR freq_text ~ 'lunch' THEN
                            dosage_times := ARRAY['14:00'];
                          ELSIF freq_text ~ 'morning' OR freq_text ~ 'breakfast' THEN
                            dosage_times := ARRAY['08:00'];
                          ELSE
                            dosage_times := ARRAY['09:00'];
                          END IF;
                        END;
                      END IF;
                      curr_date := CURRENT_DATE;
                      end_date := curr_date + duration_days;
                      IF dosage_times IS NOT NULL AND array_length(dosage_times, 1) > 0 THEN
                        WHILE curr_date < end_date LOOP
                          FOREACH time_slot IN ARRAY dosage_times LOOP
                            INSERT INTO medication_adherence
                              (prescription_id, pid, medicine_name, scheduled_date, scheduled_time, is_taken, is_skipped, synced)
                            VALUES
                              (NEW.prescription_id, NEW.pid, v_medicine_name, curr_date, time_slot::TIME, false, false, false)
                            ON CONFLICT (prescription_id, medicine_name, scheduled_date, scheduled_time)
                            DO NOTHING;
                          END LOOP;
                          curr_date := curr_date + 1;
                        END LOOP;
                      END IF;
                    END LOOP;
                  END IF;
                  RETURN NEW;
                END;
                $$;


ALTER FUNCTION "public"."auto_create_adherence_records"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_create_adherence_records"() IS 'Auto-creates medication adherence tracking records when a prescription is sent to a patient';



CREATE OR REPLACE FUNCTION "public"."auto_generate_receipt"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_patient_name TEXT; v_doctor_name TEXT;
BEGIN
    SELECT u.name INTO v_patient_name FROM patients p JOIN users u ON u.uid = p.uid WHERE p.pid = NEW.pid;
    SELECT u.name INTO v_doctor_name FROM doctors d JOIN users u ON u.uid = d.uid WHERE d.did = NEW.did;
    INSERT INTO receipts (transaction_id, receipt_date, pid, did, patient_name, doctor_name,
        consultation_fee, tax_amount, discount_amount, total_amount, payment_method, razorpay_payment_id)
    VALUES (NEW.transaction_id, CURRENT_DATE, NEW.pid, NEW.did,
        COALESCE(v_patient_name,'Patient'), COALESCE(v_doctor_name,'Doctor'),
        COALESCE(NEW.doctor_net_amount,NEW.amount), 0, 0, NEW.amount,
        NEW.payment_method, NEW.razorpay_payment_id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_generate_receipt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_insert_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.role = 'patient' THEN
        INSERT INTO patients (uid)
        VALUES (NEW.uid)
        ON CONFLICT (uid) DO NOTHING;
    ELSIF NEW.role = 'doctor' THEN
        INSERT INTO doctors (uid)
        VALUES (NEW.uid)
        ON CONFLICT (uid) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_insert_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_manage_user_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.role = 'patient' THEN
        INSERT INTO patients (uid)
        VALUES (NEW.uid)
        ON CONFLICT (uid) DO NOTHING;
    END IF;

    IF NEW.role = 'doctor' THEN
        INSERT INTO doctors (uid)
        VALUES (NEW.uid)
        ON CONFLICT (uid) DO NOTHING;
    END IF;

    IF NEW.role = 'clinic' THEN
        INSERT INTO clinics (uid, clinic_name)
        VALUES (NEW.uid, COALESCE(NEW.name, 'Unnamed Clinic'))
        ON CONFLICT (uid) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_manage_user_roles"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_manage_user_roles"() IS 'Ensures role-specific table records exist when users are created or roles change';



CREATE OR REPLACE FUNCTION "public"."auto_skip_pending_medications"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
            BEGIN
                UPDATE medication_adherence
                SET is_skipped = true,
                    skip_reason = 'Auto-skipped (6 hours passed)',
                    updated_at = CURRENT_TIMESTAMP
                WHERE is_taken = false 
                  AND is_skipped = false
                  AND (scheduled_date + scheduled_time) < CURRENT_TIMESTAMP - interval '6 hours';
            END;
            $$;


ALTER FUNCTION "public"."auto_skip_pending_medications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_doctor_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM users WHERE uid = NEW.uid;

    IF user_role IS NULL THEN
        RETURN NEW;
    END IF;

    IF user_role != 'doctor' THEN
        RAISE EXCEPTION 'User % does not have the doctor role (current role: %)', NEW.uid, user_role;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_doctor_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_patient_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM users WHERE uid = NEW.uid;

    IF user_role IS NULL THEN
        RETURN NEW;
    END IF;

    IF user_role != 'patient' THEN
        RAISE EXCEPTION 'User % does not have the patient role (current role: %)', NEW.uid, user_role;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_patient_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_receipt_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
        NEW.receipt_number := 'RCP-' ||
                             TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
                             LPAD(nextval('receipt_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_receipt_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_token_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    next_token INTEGER;
BEGIN
    IF NEW.mode IN ('offline', 'in_person') AND NEW.token_number IS NULL THEN
        SELECT COALESCE(MAX(token_number), 0) + 1
        INTO next_token
        FROM appointments
        WHERE did = NEW.did
          AND scheduled_date = NEW.scheduled_date
          AND mode IN ('offline', 'in_person');

        NEW.token_number := next_token;
        NEW.queue_position := next_token;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_token_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_adherence_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY adherence_progress_summary;
    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW adherence_progress_summary;
        RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_adherence_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_doctor_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  target_did uuid := COALESCE(NEW.did, OLD.did);
BEGIN
  UPDATE public.doctors d
  SET
    avg_rating = (SELECT ROUND(AVG(r.rating)::numeric, 2) FROM public.reviews r WHERE r.did = target_did AND r.is_published = true),
    total_reviews = (SELECT COUNT(*) FROM public.reviews r WHERE r.did = target_did AND r.is_published = true)
  WHERE d.did = target_did;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_doctor_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_appointment_completed_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    NEW.completed_at := COALESCE(NEW.call_ended_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_appointment_completed_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_appointment_payment_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.status = 'paid' AND NEW.aid IS NOT NULL THEN
        UPDATE appointments
        SET payment_status       = 'paid',
            payment_id           = NEW.razorpay_payment_id,
            razorpay_order_id    = NEW.razorpay_order_id,
            razorpay_payment_id  = NEW.razorpay_payment_id
        WHERE aid = NEW.aid AND payment_status != 'paid';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_appointment_payment_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_clinic_doctor_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE clinics SET
        total_doctors = (SELECT COUNT(*) FROM doctors WHERE clinic_id = COALESCE(NEW.clinic_id, OLD.clinic_id))
    WHERE clinic_id = COALESCE(NEW.clinic_id, OLD.clinic_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_clinic_doctor_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_clinic_name_to_doctors"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE doctors
    SET clinic_name = NEW.clinic_name
    WHERE clinic_id = NEW.clinic_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_clinic_name_to_doctors"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_doctor_verification_to_user"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
        UPDATE users SET is_verified = NEW.is_verified WHERE uid = NEW.uid;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_doctor_verification_to_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_treated_patients"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE doctors SET
        treated_patient_uids = (
            SELECT ARRAY_AGG(DISTINCT u.uid)
            FROM appointments a JOIN patients p ON p.pid = a.pid JOIN users u ON u.uid = p.uid
            WHERE a.did = NEW.did AND a.status != 'cancelled'
        )
    WHERE did = NEW.did;

    UPDATE patients SET
        connected_doctor_uids = (
            SELECT ARRAY_AGG(DISTINCT u.uid)
            FROM appointments a JOIN doctors d ON d.did = a.did JOIN users u ON u.uid = d.uid
            WHERE a.pid = NEW.pid AND a.status != 'cancelled'
        )
    WHERE pid = NEW.pid;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_treated_patients"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_role_tables"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.role = 'patient' THEN
        INSERT INTO patients (uid)
        VALUES (NEW.uid)
        ON CONFLICT (uid) DO NOTHING;

        DELETE FROM doctors WHERE uid = NEW.uid;
    END IF;

    IF NEW.role = 'doctor' THEN
        INSERT INTO doctors (uid)
        VALUES (NEW.uid)
        ON CONFLICT (uid) DO NOTHING;

        DELETE FROM patients WHERE uid = NEW.uid;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_role_tables"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_appointment_aggregates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE patients SET
        total_appointments_count = (SELECT COUNT(*) FROM appointments WHERE pid = NEW.pid),
        last_appointment_date    = (SELECT MAX(scheduled_date) FROM appointments WHERE pid = NEW.pid AND status = 'completed')
    WHERE pid = NEW.pid;

    UPDATE doctors SET
        total_consultations = (SELECT COUNT(*) FROM appointments WHERE did = NEW.did AND status = 'completed')
    WHERE did = NEW.did;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_appointment_aggregates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_doctor_patient_relationship"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO doctor_patient_relationships (did, pid, first_appointment_date, last_appointment_date, total_appointments)
    VALUES (
        NEW.did,
        NEW.pid,
        NEW.scheduled_date,
        NEW.scheduled_date,
        1
    )
    ON CONFLICT (did, pid) DO UPDATE
    SET
        last_appointment_date = GREATEST(doctor_patient_relationships.last_appointment_date, NEW.scheduled_date),
        total_appointments = doctor_patient_relationships.total_appointments + 1,
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_doctor_patient_relationship"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_user_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.role NOT IN ('patient', 'doctor', 'admin', 'clinic') THEN
        RAISE EXCEPTION 'Invalid role: %', NEW.role;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_user_role_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "schedules"."build_http_headers"("headers_jsonb" "jsonb") RETURNS "public"."http_header"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  v_headers http_header[] := ARRAY[]::http_header[];
  v_key TEXT;
BEGIN
  IF headers_jsonb IS NULL THEN
    RETURN v_headers;
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(headers_jsonb)
  LOOP
    v_headers := array_append(
      v_headers,
      http_header(v_key, headers_jsonb ->> v_key)
    );
  END LOOP;

  RETURN v_headers;
END;
$$;


ALTER FUNCTION "schedules"."build_http_headers"("headers_jsonb" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "schedules"."cleanup_job_logs"("p_batch_size" integer DEFAULT 1000) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_retention_days INT;
  v_cutoff TIMESTAMPTZ;
  v_deleted_count INT := 0;
  v_total_deleted INT := 0;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size <= 0 THEN
    RAISE WARNING 'schedules.cleanup_job_logs received invalid batch size: %', p_batch_size;
    RETURN 0;
  END IF;

  SELECT retention_days INTO v_retention_days
  FROM schedules.config LIMIT 1;
  
  IF v_retention_days IS NULL OR v_retention_days <= 0 THEN
    RETURN 0;
  END IF;
  
  v_cutoff := NOW() - (v_retention_days || ' days')::INTERVAL;
  
  LOOP
    WITH deleted AS (
      DELETE FROM schedules.job_logs
      WHERE id IN (
        SELECT id FROM schedules.job_logs
        WHERE executed_at < v_cutoff
        ORDER BY executed_at ASC
        LIMIT p_batch_size
      )
      RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;
    
    v_total_deleted := v_total_deleted + v_deleted_count;
    
    EXIT WHEN v_deleted_count < p_batch_size;
  END LOOP;
  
  RETURN v_total_deleted;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'schedules.cleanup_job_logs failed: %', SQLERRM;
  RETURN v_total_deleted;
END;
$$;


ALTER FUNCTION "schedules"."cleanup_job_logs"("p_batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "schedules"."decrypt_headers"("p_encrypted_headers" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_key TEXT;
  v_decrypted TEXT;
BEGIN
  IF p_encrypted_headers IS NULL OR p_encrypted_headers = '' THEN
    RETURN '{}'::JSONB;
  END IF;

  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Encryption key app.encryption_key is not set';
  END IF;

  -- Try to decode and decrypt
  BEGIN
    v_decrypted := pgp_sym_decrypt(decode(p_encrypted_headers, 'base64'), v_key);
    RETURN v_decrypted::JSONB;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'Decryption failed for value: %, error: %', left(p_encrypted_headers, 50), SQLERRM;
    RAISE;  -- Re-raise so execute_job logs the actual failure reason
  END;
END;
$$;


ALTER FUNCTION "schedules"."decrypt_headers"("p_encrypted_headers" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "schedules"."delete_job"("p_job_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_cron_job_id BIGINT;
BEGIN
  SELECT cron_job_id INTO v_cron_job_id
  FROM schedules.jobs WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Job not found';
    RETURN;
  END IF;

  IF v_cron_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_cron_job_id);
  END IF;

  DELETE FROM schedules.jobs WHERE id = p_job_id;

  RETURN QUERY SELECT TRUE, 'Cron job deleted successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$;


ALTER FUNCTION "schedules"."delete_job"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "schedules"."disable_job"("p_job_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_cron_job_id BIGINT;
BEGIN
  SELECT cron_job_id INTO v_cron_job_id
  FROM schedules.jobs WHERE id = p_job_id;

  IF v_cron_job_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No cron job found for this job';
    RETURN;
  END IF;

  PERFORM cron.unschedule(v_cron_job_id);

  UPDATE schedules.jobs
  SET cron_job_id = NULL, is_active = FALSE, updated_at = NOW()
  WHERE id = p_job_id;

  RETURN QUERY SELECT TRUE, 'Cron job disabled successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$;


ALTER FUNCTION "schedules"."disable_job"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "schedules"."enable_job"("p_job_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_job RECORD;
  v_new_cron_id BIGINT;
  v_function_call TEXT;
BEGIN
  SELECT id, cron_schedule, function_url
  INTO v_job
  FROM schedules.jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Job not found';
    RETURN;
  END IF;

  v_function_call := format('SELECT schedules.execute_job(%L::UUID)', p_job_id);
  SELECT cron.schedule(v_job.cron_schedule, v_function_call) INTO v_new_cron_id;

  UPDATE schedules.jobs
  SET cron_job_id = v_new_cron_id,
      is_active = TRUE,
      updated_at = NOW()
  WHERE id = p_job_id;

  RETURN QUERY SELECT TRUE, 'Cron job enabled successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$;


ALTER FUNCTION "schedules"."enable_job"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "schedules"."encrypt_headers"("p_headers" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_key TEXT;
  v_encrypted TEXT;
BEGIN
  IF p_headers IS NULL OR p_headers = '{}'::JSONB THEN
    RETURN NULL;
  END IF;

  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Encryption key app.encryption_key is not set';
  END IF;

  -- pgp_sym_encrypt returns bytea; encode to base64 for TEXT storage
  v_encrypted := encode(pgp_sym_encrypt(p_headers::TEXT, v_key), 'base64');

  RETURN v_encrypted;
END;
$$;


ALTER FUNCTION "schedules"."encrypt_headers"("p_headers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "schedules"."execute_job"("p_job_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_job RECORD;
  v_http_request http_request;
  v_http_response http_response;
  v_success BOOLEAN;
  v_status INT;
  v_body TEXT;
  v_decrypted_headers JSONB;
  v_final_body JSONB;
  v_start_time TIMESTAMP := clock_timestamp();
  v_end_time TIMESTAMP;
  v_duration_ms BIGINT;
  v_error_message TEXT;
BEGIN
  -- Bound the per-call HTTP timeout. http_set_curlopt is per-session;
  -- pg_cron may reuse a session across ticks but the values are stable so
  -- repeated calls are harmless.
  PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', '300000');
  PERFORM http_set_curlopt('CURLOPT_CONNECTTIMEOUT_MS', '5000');

  SELECT
    j.id,
    j.name,
    j.function_url,
    j.http_method,
    j.body,
    j.encrypted_headers
  INTO v_job
  FROM schedules.jobs AS j
  WHERE j.id = p_job_id;

  IF NOT FOUND THEN
    PERFORM schedules.log_job_execution(p_job_id, 'unknown', FALSE, 404, 0, 'Job not found');
    RETURN;
  END IF;

  BEGIN
    -- Decrypt headers
    v_decrypted_headers := schedules.decrypt_headers(v_job.encrypted_headers);

    -- Build the final request body
    v_final_body := COALESCE(v_job.body, '{}'::JSONB);

    -- Construct HTTP request
    v_http_request := (
      v_job.http_method::http_method,
      v_job.function_url,
      schedules.build_http_headers(v_decrypted_headers),
      'application/json',
      v_final_body::TEXT
    );
    v_start_time := clock_timestamp();
    -- Execute HTTP call (synchronous; bounded by curl timeouts set above)
    v_http_response := http(v_http_request);
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    v_status := v_http_response.status;
    v_body := v_http_response.content;
    v_success := v_status BETWEEN 200 AND 299;

    -- Log execution
    v_error_message := CASE WHEN v_success THEN 'Success' ELSE 'HTTP ' || v_status END;
    PERFORM schedules.log_job_execution(v_job.id, v_job.name, v_success, v_status, v_duration_ms, v_error_message);

  EXCEPTION WHEN OTHERS THEN
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    PERFORM schedules.log_job_execution(v_job.id, v_job.name, FALSE, 500, v_duration_ms, SQLERRM);
  END;
END;
$$;


ALTER FUNCTION "schedules"."execute_job"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "schedules"."log_job_execution"("p_job_id" "uuid", "p_job_name" "text", "p_success" boolean, "p_response_status" integer, "p_duration_ms" bigint, "p_message" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO schedules.job_logs (
    job_id,
    executed_at,
    status_code,
    success,
    duration_ms,
    message
  ) VALUES (
    p_job_id,
    NOW(),
    p_response_status,
    p_success,
    p_duration_ms,
    p_message
  );

  -- Update last_executed_at in jobs table
  UPDATE schedules.jobs
  SET last_executed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;


ALTER FUNCTION "schedules"."log_job_execution"("p_job_id" "uuid", "p_job_name" "text", "p_success" boolean, "p_response_status" integer, "p_duration_ms" bigint, "p_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "schedules"."upsert_job"("p_job_id" "uuid", "p_name" "text", "p_cron_expression" "text", "p_http_method" "text", "p_function_url" "text", "p_headers_template" "jsonb", "p_resolved_headers" "jsonb", "p_body" "jsonb") RETURNS TABLE("cron_job_id" bigint, "success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_existing_cron_id BIGINT;
  v_new_cron_id BIGINT;
  v_function_call TEXT;
  v_encrypted_headers TEXT;
BEGIN
  -- Encrypt resolved headers (with actual secret values) before storing
  v_encrypted_headers := schedules.encrypt_headers(p_resolved_headers);

  -- Unschedule any existing job for this schedule to prevent duplicates
  SELECT j.cron_job_id INTO v_existing_cron_id
  FROM schedules.jobs AS j
  WHERE j.id = p_job_id;

  IF v_existing_cron_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_cron_id);
  END IF;

  -- Schedule the new cron job
  v_function_call := format('SELECT schedules.execute_job(%L::UUID)', p_job_id);
  SELECT cron.schedule(p_cron_expression, v_function_call) INTO v_new_cron_id;

  -- Insert or update the job record
  -- headers = original template (safe to display)
  -- encrypted_headers = resolved values (used at runtime)
  INSERT INTO schedules.jobs (
    id, name, cron_schedule, function_url, http_method, encrypted_headers, headers, body, cron_job_id, is_active, created_at, updated_at
  ) VALUES (
    p_job_id,
    p_name,
    p_cron_expression,
    p_function_url,
    p_http_method,
    v_encrypted_headers,
    p_headers_template,
    p_body,
    v_new_cron_id,
    TRUE,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    cron_schedule = EXCLUDED.cron_schedule,
    function_url = EXCLUDED.function_url,
    http_method = EXCLUDED.http_method,
    encrypted_headers = EXCLUDED.encrypted_headers,
    headers = EXCLUDED.headers,
    body = EXCLUDED.body,
    cron_job_id = EXCLUDED.cron_job_id,
    is_active = TRUE,
    updated_at = NOW();

  RETURN QUERY SELECT v_new_cron_id, TRUE, 'Cron job scheduled successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::BIGINT, FALSE, SQLERRM;
END;
$$;


ALTER FUNCTION "schedules"."upsert_job"("p_job_id" "uuid", "p_name" "text", "p_cron_expression" "text", "p_http_method" "text", "p_function_url" "text", "p_headers_template" "jsonb", "p_resolved_headers" "jsonb", "p_body" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "system"."is_exposed_schema"("p_schema" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    p_schema IS NOT NULL
    AND p_schema NOT LIKE 'pg\_%'
    AND p_schema <> 'information_schema'
    AND p_schema <> ALL (
      -- Comma-separated GUC; strip any incidental whitespace before splitting.
      string_to_array(
        regexp_replace(
          coalesce(
            nullif(current_setting('insforge.internal_schemas', true), ''),
            'ai,auth,compute,deployments,email,functions,memory,payments,realtime,schedules,storage,system'
          ),
          '\s', '', 'g'
        ),
        ','
      )
    )
    -- Extension-managed schemas are infrastructure, not developer data.
    AND NOT EXISTS (
      SELECT 1
      FROM pg_depend d
      JOIN pg_namespace n ON n.oid = d.objid
      WHERE d.classid = 'pg_namespace'::regclass
        AND d.refclassid = 'pg_extension'::regclass
        AND d.deptype = 'e'
        AND n.nspname = p_schema
    );
$$;


ALTER FUNCTION "system"."is_exposed_schema"("p_schema" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "system"."on_schema_ddl"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'pg_temp'
    AS $$
BEGIN
  PERFORM system.sync_postgrest_exposed_schemas();
END;
$$;


ALTER FUNCTION "system"."on_schema_ddl"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "system"."reassign_public_objects_to_project_admin"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  object_record record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'project_admin') THEN
    RETURN;
  END IF;

  FOR object_record IN
    SELECT
      CASE c.relkind
        WHEN 'r' THEN 'TABLE'
        WHEN 'p' THEN 'TABLE'
        WHEN 'v' THEN 'VIEW'
        WHEN 'm' THEN 'MATERIALIZED VIEW'
        WHEN 'S' THEN 'SEQUENCE'
        WHEN 'f' THEN 'FOREIGN TABLE'
      END AS object_type,
      n.nspname AS schema_name,
      c.relname AS object_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
      AND pg_get_userbyid(c.relowner) <> 'project_admin'
      -- Table-owned and identity sequences inherit ownership from ALTER TABLE.
      -- PostgreSQL rejects changing them directly while linked to a table.
      AND NOT (
        c.relkind = 'S'
        AND EXISTS (
          SELECT 1
          FROM pg_depend d
          WHERE d.objid = c.oid
            AND d.deptype IN ('a', 'i')
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        WHERE d.objid = c.oid
          AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format(
      'ALTER %s %I.%I OWNER TO project_admin',
      object_record.object_type,
      object_record.schema_name,
      object_record.object_name
    );
  END LOOP;

  FOR object_record IN
    SELECT
      CASE p.prokind
        WHEN 'p' THEN 'PROCEDURE'
        WHEN 'a' THEN 'AGGREGATE'
        ELSE 'FUNCTION'
      END AS object_type,
      n.nspname AS schema_name,
      p.proname AS object_name,
      pg_get_function_identity_arguments(p.oid) AS arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND pg_get_userbyid(p.proowner) <> 'project_admin'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        WHERE d.objid = p.oid
          AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format(
      'ALTER %s %I.%I(%s) OWNER TO project_admin',
      object_record.object_type,
      object_record.schema_name,
      object_record.object_name,
      object_record.arguments
    );
  END LOOP;

  FOR object_record IN
    SELECT
      n.nspname AS schema_name,
      t.typname AS object_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    LEFT JOIN pg_class type_class ON type_class.oid = t.typrelid
    WHERE n.nspname = 'public'
      AND t.typtype IN ('c', 'd', 'e', 'm', 'r')
      AND pg_get_userbyid(t.typowner) <> 'project_admin'
      -- Relation row types inherit ownership from ALTER TABLE/VIEW above.
      -- User-created composite types are backed by relkind = 'c' and are safe.
      AND (t.typrelid = 0 OR type_class.relkind = 'c')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        WHERE d.objid = t.oid
          AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format(
      'ALTER TYPE %I.%I OWNER TO project_admin',
      object_record.schema_name,
      object_record.object_name
    );
  END LOOP;
END;
$$;


ALTER FUNCTION "system"."reassign_public_objects_to_project_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "system"."reload_postgrest_schema"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NOTIFY pgrst, 'reload schema';
    RAISE NOTICE 'PostgREST schema reload notification sent';
END
$$;


ALTER FUNCTION "system"."reload_postgrest_schema"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "system"."sync_postgrest_exposed_schemas"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'pg_temp'
    AS $$
DECLARE
  v_list text;
BEGIN
  -- `public` sorts first so it stays the default profile (no Accept-Profile).
  SELECT string_agg(n.nspname, ', ' ORDER BY (n.nspname <> 'public'), n.nspname)
  INTO v_list
  FROM pg_namespace n
  WHERE system.is_exposed_schema(n.nspname);

  v_list := coalesce(v_list, 'public');

  EXECUTE format('ALTER ROLE CURRENT_USER SET pgrst.db_schemas = %L', v_list);

  -- Order matters: re-read config (new db_schemas) before re-introspecting.
  PERFORM pg_notify('pgrst', 'reload config');
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;


ALTER FUNCTION "system"."sync_postgrest_exposed_schemas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "system"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "system"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "compute"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "port" integer DEFAULT 8080 NOT NULL,
    "cpu" "text" DEFAULT 'shared-1x'::"text" NOT NULL,
    "memory" integer DEFAULT 512 NOT NULL,
    "env_vars_encrypted" "text",
    "region" "text" DEFAULT 'iad'::"text" NOT NULL,
    "provider_app_id" "text",
    "provider_instance_id" "text",
    "status" "text" DEFAULT 'creating'::"text" NOT NULL,
    "endpoint_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "protocol" "text" DEFAULT 'http'::"text" NOT NULL,
    "scale_to_zero" boolean DEFAULT true NOT NULL,
    "provider" "text" NOT NULL,
    "ingress" "text" DEFAULT 'none'::"text" NOT NULL,
    CONSTRAINT "chk_compute_services_protocol" CHECK (("protocol" = ANY (ARRAY['http'::"text", 'tcp'::"text"]))),
    CONSTRAINT "compute_services_ingress_check" CHECK (("ingress" = ANY (ARRAY['none'::"text", 'port'::"text", 'host'::"text"]))),
    CONSTRAINT "compute_services_provider_check" CHECK (("provider" = ANY (ARRAY['fly'::"text", 'docker'::"text"]))),
    CONSTRAINT "services_port_check" CHECK ((("port" >= 1) AND ("port" <= 65535))),
    CONSTRAINT "services_status_check" CHECK (("status" = ANY (ARRAY['creating'::"text", 'deploying'::"text", 'running'::"text", 'stopped'::"text", 'failed'::"text", 'destroying'::"text"])))
);


ALTER TABLE "compute"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "deployments"."files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deployment_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "sha" "text" NOT NULL,
    "size_bytes" integer NOT NULL,
    "uploaded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "files_sha_check" CHECK (("sha" ~ '^[a-f0-9]{40}$'::"text")),
    CONSTRAINT "files_size_bytes_check" CHECK (("size_bytes" >= 0))
);


ALTER TABLE "deployments"."files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "deployments"."runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" DEFAULT 'vercel'::"text" NOT NULL,
    "provider_deployment_id" "text",
    "status" "text" DEFAULT 'WAITING'::"text" NOT NULL,
    "url" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "deployments"."runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "email"."config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "host" "text" DEFAULT ''::"text" NOT NULL,
    "port" integer DEFAULT 465 NOT NULL,
    "username" "text" DEFAULT ''::"text" NOT NULL,
    "password_encrypted" "text" DEFAULT ''::"text" NOT NULL,
    "sender_email" "text" DEFAULT ''::"text" NOT NULL,
    "sender_name" "text" DEFAULT ''::"text" NOT NULL,
    "min_interval_seconds" integer DEFAULT 60 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "email"."config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "email"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_type" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body_html" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "email"."templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "functions"."definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "code" "text" NOT NULL,
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deployed_at" timestamp with time zone
);


ALTER TABLE "functions"."definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "functions"."deployments" (
    "id" "text" NOT NULL,
    "project_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "url" "text",
    "function_count" integer,
    "functions" "jsonb",
    "error_message" "text",
    "build_logs" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "functions"."deployments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "memory"."memories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scope" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536) NOT NULL,
    "embedding_model" "text" DEFAULT 'openai/text-embedding-3-small'::"text" NOT NULL,
    "source" "text",
    "content_tsv" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", (("title" || ' '::"text") || "content"))) STORED,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "memories_kind_check" CHECK (("kind" = ANY (ARRAY['fact'::"text", 'decision'::"text", 'preference'::"text", 'reference'::"text"])))
);


ALTER TABLE "memory"."memories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."customer_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "environment" "text" NOT NULL,
    "subject_type" "text" NOT NULL,
    "subject_id" "text" NOT NULL,
    "provider_customer_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_mappings_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "customer_mappings_provider_check" CHECK (("provider" ~ '^[a-z][a-z0-9_]*$'::"text"))
);


ALTER TABLE "payments"."customer_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "email" "text",
    "name" "text",
    "phone" "text",
    "deleted" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider" "text" NOT NULL,
    "provider_customer_id" "text" NOT NULL,
    "provider_created_at" timestamp with time zone,
    CONSTRAINT "chk_payments_customers_provider_format" CHECK (("provider" ~ '^[a-z][a-z0-9_]*$'::"text")),
    CONSTRAINT "customers_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"])))
);


ALTER TABLE "payments"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."provider_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "environment" "text" NOT NULL,
    "status" "text" DEFAULT 'unconfigured'::"text" NOT NULL,
    "provider_account_id" "text",
    "account_email" "text",
    "account_name" "text",
    "account_livemode" boolean,
    "webhook_endpoint_id" "text",
    "webhook_endpoint_url" "text",
    "webhook_configured_at" timestamp with time zone,
    "last_synced_at" timestamp with time zone,
    "last_sync_status" "text",
    "last_sync_error" "text",
    "last_sync_counts" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_connections_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "provider_connections_last_sync_status_check" CHECK ((("last_sync_status" IS NULL) OR ("last_sync_status" = ANY (ARRAY['succeeded'::"text", 'failed'::"text"])))),
    CONSTRAINT "provider_connections_provider_check" CHECK (("provider" ~ '^[a-z][a-z0-9_]*$'::"text")),
    CONSTRAINT "provider_connections_status_check" CHECK (("status" = ANY (ARRAY['unconfigured'::"text", 'connected'::"text", 'error'::"text"])))
);


ALTER TABLE "payments"."provider_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."razorpay_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "item_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "amount" bigint,
    "unit_amount" bigint,
    "currency" "text" NOT NULL,
    "type" "text",
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "provider_created_at" timestamp with time zone,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "razorpay_items_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"])))
);


ALTER TABLE "payments"."razorpay_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."razorpay_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "status" "text" DEFAULT 'initialized'::"text" NOT NULL,
    "subject_type" "text",
    "subject_id" "text",
    "customer_name" "text",
    "customer_email" "text",
    "customer_contact" "text",
    "order_id" "text",
    "receipt" "text",
    "amount" bigint NOT NULL,
    "amount_paid" bigint,
    "amount_due" bigint,
    "currency" "text" NOT NULL,
    "attempts" integer,
    "verified_payment_id" "text",
    "verified_at" timestamp with time zone,
    "description" "text",
    "callback_url" "text",
    "notes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "razorpay_orders_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "razorpay_orders_status_check" CHECK (("status" = ANY (ARRAY['initialized'::"text", 'created'::"text", 'attempted'::"text", 'paid'::"text", 'failed'::"text"])))
);


ALTER TABLE "payments"."razorpay_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."razorpay_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "plan_id" "text" NOT NULL,
    "item_id" "text" NOT NULL,
    "period" "text" NOT NULL,
    "interval" integer NOT NULL,
    "amount" bigint,
    "unit_amount" bigint,
    "currency" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "notes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "provider_created_at" timestamp with time zone,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "razorpay_plans_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"])))
);


ALTER TABLE "payments"."razorpay_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."razorpay_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "subscription_id" "text" NOT NULL,
    "plan_id" "text" NOT NULL,
    "customer_id" "text",
    "subject_type" "text",
    "subject_id" "text",
    "status" "text" NOT NULL,
    "current_start" timestamp with time zone,
    "current_end" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "quantity" bigint,
    "charge_at" timestamp with time zone,
    "start_at" timestamp with time zone,
    "end_at" timestamp with time zone,
    "total_count" bigint,
    "auth_attempts" bigint,
    "paid_count" bigint,
    "remaining_count" bigint,
    "short_url" "text",
    "has_scheduled_changes" boolean DEFAULT false NOT NULL,
    "change_scheduled_at" timestamp with time zone,
    "offer_id" "text",
    "authorization_payment_id" "text",
    "authorization_verified_at" timestamp with time zone,
    "notes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "provider_created_at" timestamp with time zone,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "razorpay_subscriptions_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "razorpay_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['created'::"text", 'authenticated'::"text", 'active'::"text", 'pending'::"text", 'halted'::"text", 'cancelled'::"text", 'completed'::"text", 'expired'::"text", 'paused'::"text"])))
);


ALTER TABLE "payments"."razorpay_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."stripe_checkout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "mode" "text" NOT NULL,
    "status" "text" DEFAULT 'initialized'::"text" NOT NULL,
    "payment_status" "text",
    "subject_type" "text",
    "subject_id" "text",
    "customer_email" "text",
    "line_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "success_url" "text" NOT NULL,
    "cancel_url" "text" NOT NULL,
    "idempotency_key" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "checkout_session_id" "text",
    "customer_id" "text",
    "payment_intent_id" "text",
    "subscription_id" "text",
    "url" "text",
    "last_error" "text",
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "request_hash" "text",
    CONSTRAINT "checkout_sessions_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "checkout_sessions_line_items_check" CHECK (("jsonb_typeof"("line_items") = 'array'::"text")),
    CONSTRAINT "checkout_sessions_mode_check" CHECK (("mode" = ANY (ARRAY['payment'::"text", 'subscription'::"text"]))),
    CONSTRAINT "checkout_sessions_payment_status_check" CHECK ((("payment_status" IS NULL) OR ("payment_status" = ANY (ARRAY['paid'::"text", 'unpaid'::"text", 'no_payment_required'::"text"])))),
    CONSTRAINT "checkout_sessions_status_check" CHECK (("status" = ANY (ARRAY['initialized'::"text", 'open'::"text", 'completed'::"text", 'expired'::"text", 'failed'::"text"])))
);


ALTER TABLE "payments"."stripe_checkout_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."stripe_customer_portal_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "status" "text" DEFAULT 'initialized'::"text" NOT NULL,
    "subject_type" "text" NOT NULL,
    "subject_id" "text" NOT NULL,
    "customer_id" "text",
    "return_url" "text",
    "configuration_id" "text",
    "url" "text",
    "last_error" "text",
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_portal_sessions_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "customer_portal_sessions_status_check" CHECK (("status" = ANY (ARRAY['initialized'::"text", 'created'::"text", 'failed'::"text"])))
);


ALTER TABLE "payments"."stripe_customer_portal_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."stripe_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "price_id" "text" NOT NULL,
    "product_id" "text",
    "active" boolean NOT NULL,
    "currency" "text" NOT NULL,
    "unit_amount" bigint,
    "unit_amount_decimal" "text",
    "type" "text" NOT NULL,
    "lookup_key" "text",
    "billing_scheme" "text",
    "tax_behavior" "text",
    "recurring_interval" "text",
    "recurring_interval_count" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "prices_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"])))
);


ALTER TABLE "payments"."stripe_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."stripe_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "product_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "active" boolean NOT NULL,
    "default_price_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "products_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"])))
);


ALTER TABLE "payments"."stripe_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."stripe_subscription_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "subscription_item_id" "text" NOT NULL,
    "subscription_id" "text" NOT NULL,
    "product_id" "text",
    "price_id" "text",
    "quantity" bigint,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscription_items_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"])))
);


ALTER TABLE "payments"."stripe_subscription_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."stripe_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "subscription_id" "text" NOT NULL,
    "customer_id" "text" NOT NULL,
    "subject_type" "text",
    "subject_id" "text",
    "status" "text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "cancel_at" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "latest_invoice_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"])))
);


ALTER TABLE "payments"."stripe_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "environment" "text" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "subject_type" "text",
    "subject_id" "text",
    "provider_customer_id" "text",
    "customer_email_snapshot" "text",
    "provider_object_type" "text",
    "provider_object_id" "text",
    "provider_parent_object_type" "text",
    "provider_parent_object_id" "text",
    "related_object_ids" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "amount" bigint,
    "amount_refunded" bigint DEFAULT 0 NOT NULL,
    "currency" "text",
    "description" "text",
    "paid_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "refunded_at" timestamp with time zone,
    "provider_created_at" timestamp with time zone,
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transactions_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "transactions_provider_check" CHECK (("provider" ~ '^[a-z][a-z0-9_]*$'::"text")),
    CONSTRAINT "transactions_status_check" CHECK (("status" = ANY (ARRAY['succeeded'::"text", 'failed'::"text", 'pending'::"text", 'refunded'::"text", 'partially_refunded'::"text"]))),
    CONSTRAINT "transactions_type_check" CHECK (("type" = ANY (ARRAY['one_time_payment'::"text", 'subscription_invoice'::"text", 'refund'::"text", 'failed_payment'::"text"])))
);


ALTER TABLE "payments"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payments"."webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "livemode" boolean NOT NULL,
    "object_type" "text",
    "object_id" "text",
    "processing_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "payload" "jsonb" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider" "text" NOT NULL,
    "provider_event_id" "text" NOT NULL,
    "provider_account_id" "text",
    CONSTRAINT "chk_payments_webhook_events_provider_format" CHECK (("provider" ~ '^[a-z][a-z0-9_]*$'::"text")),
    CONSTRAINT "webhook_events_environment_check" CHECK (("environment" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "webhook_events_processing_status_check" CHECK (("processing_status" = ANY (ARRAY['pending'::"text", 'processed'::"text", 'failed'::"text", 'ignored'::"text"])))
);


ALTER TABLE "payments"."webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medication_adherence" (
    "adherence_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prescription_id" "uuid" NOT NULL,
    "pid" "uuid" NOT NULL,
    "medicine_name" character varying(255) NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "scheduled_time" time without time zone NOT NULL,
    "taken_at" timestamp with time zone,
    "is_taken" boolean DEFAULT false,
    "is_skipped" boolean DEFAULT false,
    "skip_reason" "text",
    "synced" boolean DEFAULT false,
    "device_timestamp" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "skipped_at" timestamp with time zone,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "scheduled_at" timestamp with time zone,
    "auto_skipped" boolean DEFAULT false,
    "snooze_count" integer DEFAULT 0,
    "reminder_snoozed_until" timestamp with time zone,
    "doctor_id" "uuid",
    "snooze_until" timestamp with time zone
);


ALTER TABLE "public"."medication_adherence" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."adherence_progress" AS
 SELECT "pid",
    "prescription_id",
    "medicine_name",
    "count"(*) AS "total_doses",
    "sum"(
        CASE
            WHEN "is_taken" THEN 1
            ELSE 0
        END) AS "taken_doses",
    "sum"(
        CASE
            WHEN "is_skipped" THEN 1
            ELSE 0
        END) AS "skipped_doses",
    "round"(((("sum"(
        CASE
            WHEN "is_taken" THEN 1
            ELSE 0
        END))::numeric / (NULLIF("count"(*), 0))::numeric) * (100)::numeric), 2) AS "adherence_percentage"
   FROM "public"."medication_adherence"
  GROUP BY "pid", "prescription_id", "medicine_name";


ALTER VIEW "public"."adherence_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescriptions" (
    "prescription_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aid" "uuid",
    "pid" "uuid" NOT NULL,
    "did" "uuid" NOT NULL,
    "diagnosis" "text" NOT NULL,
    "symptoms" "text"[],
    "medicines" "jsonb" NOT NULL,
    "instructions" "text",
    "diet_advice" "text",
    "follow_up_date" "date",
    "follow_up_notes" "text",
    "ai_generated" boolean DEFAULT false,
    "ai_suggestions" "jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "sent_to_patient" boolean DEFAULT false,
    "sent_at" timestamp with time zone,
    "medicine_system" "text"
);


ALTER TABLE "public"."prescriptions" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."adherence_progress_summary" AS
 SELECT "ma"."pid",
    "ma"."prescription_id",
    "p"."did",
    "ma"."medicine_name",
    "count"(*) AS "total_doses",
    "sum"(
        CASE
            WHEN "ma"."is_taken" THEN 1
            ELSE 0
        END) AS "taken_doses",
    "sum"(
        CASE
            WHEN "ma"."is_skipped" THEN 1
            ELSE 0
        END) AS "skipped_doses",
    "round"(((("sum"(
        CASE
            WHEN "ma"."is_taken" THEN 1
            ELSE 0
        END))::numeric / (NULLIF("count"(*), 0))::numeric) * (100)::numeric), 2) AS "adherence_percentage",
    "min"("ma"."scheduled_date") AS "start_date",
    "max"("ma"."scheduled_date") AS "end_date",
    "max"("ma"."updated_at") AS "last_updated"
   FROM ("public"."medication_adherence" "ma"
     JOIN "public"."prescriptions" "p" ON (("ma"."prescription_id" = "p"."prescription_id")))
  WHERE ("p"."is_active" = true)
  GROUP BY "ma"."pid", "ma"."prescription_id", "p"."did", "ma"."medicine_name"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."adherence_progress_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_storage_buckets" (
    "bucket_key" "text" NOT NULL,
    "provider_name" character varying(50) DEFAULT 'insfoge'::character varying NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "max_upload_file_size" bigint DEFAULT 5242880 NOT NULL,
    "min_upload_file_size" bigint DEFAULT 1 NOT NULL,
    "cache_control" character varying(100) DEFAULT 'max-age=3600'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."app_storage_buckets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "aid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pid" "uuid" NOT NULL,
    "did" "uuid" NOT NULL,
    "mode" character varying(20) NOT NULL,
    "status" character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "scheduled_time" time without time zone NOT NULL,
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "duration_minutes" integer,
    "token_number" integer,
    "queue_position" integer,
    "estimated_wait_minutes" integer,
    "meeting_link" "text",
    "meeting_id" character varying(255),
    "meeting_password" character varying(100),
    "chief_complaint" "text" NOT NULL,
    "symptoms" "text"[],
    "doctor_notes" "text",
    "cancellation_reason" "text",
    "cancelled_by" "uuid",
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "call_started_at" timestamp with time zone,
    "call_ended_at" timestamp with time zone,
    "call_duration_minutes" integer,
    "payment_id" "text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "razorpay_order_id" character varying(255),
    "razorpay_payment_id" character varying(255),
    "clinic_id" "uuid",
    "rescheduled_from" "uuid",
    "cancellation_fee" numeric(10,2) DEFAULT 0,
    "consent_ip" "text",
    "consent_given_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    CONSTRAINT "appointments_mode_check" CHECK ((("mode")::"text" = ANY (ARRAY[('online'::character varying)::"text", ('offline'::character varying)::"text", ('in_person'::character varying)::"text"]))),
    CONSTRAINT "appointments_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('scheduled'::character varying)::"text", ('confirmed'::character varying)::"text", ('cancelled'::character varying)::"text", ('completed'::character varying)::"text", ('rescheduled'::character varying)::"text", ('in_progress'::character varying)::"text", ('pending'::character varying)::"text"])))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinics" (
    "clinic_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "uid" "uuid" NOT NULL,
    "clinic_name" character varying(255) NOT NULL,
    "registration_number" character varying(100),
    "address_line1" character varying(255),
    "address_line2" character varying(255),
    "city" character varying(100),
    "state" character varying(100),
    "country" character varying(100) DEFAULT 'India'::character varying,
    "postal_code" character varying(20),
    "phone" character varying(20),
    "email" character varying(255),
    "website" character varying(255),
    "description" "text",
    "logo_url" "text",
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "operating_hours" "jsonb",
    "specializations" "text"[],
    "social_links" "jsonb",
    "total_doctors" integer DEFAULT 0,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."clinics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" integer NOT NULL,
    "code" character varying(50) NOT NULL,
    "discount_type" character varying(20) NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."coupons_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."coupons_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."coupons_id_seq" OWNED BY "public"."coupons"."id";



CREATE TABLE IF NOT EXISTS "public"."doctor_availability" (
    "availability_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "did" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "slot_duration_minutes" integer DEFAULT 30,
    "mode" character varying(20) NOT NULL,
    "max_patients_per_slot" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doctor_availability_check" CHECK (("end_time" > "start_time")),
    CONSTRAINT "doctor_availability_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "doctor_availability_mode_check" CHECK ((("mode")::"text" = ANY (ARRAY[('online'::character varying)::"text", ('offline'::character varying)::"text", ('both'::character varying)::"text"])))
);


ALTER TABLE "public"."doctor_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doctor_patient_relationships" (
    "relationship_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "did" "uuid" NOT NULL,
    "pid" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "relationship_status" character varying(20) DEFAULT 'active'::character varying,
    "first_appointment_date" "date",
    "last_appointment_date" "date",
    "total_appointments" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doctor_patient_relationships_relationship_status_check" CHECK ((("relationship_status")::"text" = ANY (ARRAY[('active'::character varying)::"text", ('inactive'::character varying)::"text"])))
);


ALTER TABLE "public"."doctor_patient_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doctors" (
    "did" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "uid" "uuid" NOT NULL,
    "specialization" "text"[] DEFAULT ARRAY['General Medicine'::"text"] NOT NULL,
    "qualification" "text" DEFAULT 'MBBS'::"text" NOT NULL,
    "registration_number" character varying(100),
    "years_of_experience" integer DEFAULT 0,
    "consultation_fee" numeric(10,2) DEFAULT 0,
    "bio" "text",
    "clinic_name" character varying(255),
    "address_line1" character varying(255),
    "address_line2" character varying(255),
    "city" character varying(100),
    "state" character varying(100),
    "country" character varying(100) DEFAULT 'India'::character varying,
    "postal_code" character varying(20),
    "languages" "text"[],
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "treated_patient_uids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "custom_specializations" "text",
    "clinic_id" "uuid",
    "payout_method" character varying(20),
    "payout_upi_id" character varying(255),
    "bank_account_holder_name" character varying(255),
    "bank_account_number" character varying(100),
    "bank_ifsc_code" character varying(20),
    "bank_name" character varying(255),
    "bank_account_type" character varying(50),
    "bank_branch_name" character varying(255),
    "bank_details_verified" boolean DEFAULT false,
    "bank_details_added_at" timestamp with time zone,
    "payout_fee_acknowledged" boolean DEFAULT false,
    "payout_fee_acknowledged_at" timestamp with time zone,
    "is_accepting_patients" boolean DEFAULT true,
    "avg_rating" numeric(3,2),
    "total_reviews" integer DEFAULT 0,
    "total_consultations" integer DEFAULT 0,
    "profile_completion_pct" smallint DEFAULT 0,
    "date_of_birth" "date",
    "gender" character varying(20),
    "blood_group" character varying(5),
    "verification_rejected" boolean DEFAULT false,
    "verified_at" timestamp with time zone,
    "verified_by" "text",
    "verification_notes" "text",
    CONSTRAINT "doctors_bank_account_type_check" CHECK ((("bank_account_type")::"text" = ANY (ARRAY[('savings'::character varying)::"text", ('current'::character varying)::"text", ('other'::character varying)::"text"]))),
    CONSTRAINT "doctors_payout_method_check" CHECK ((("payout_method")::"text" = ANY (ARRAY[('bank'::character varying)::"text", ('upi'::character varying)::"text"])))
);


ALTER TABLE "public"."doctors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finance_transactions" (
    "transaction_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aid" "uuid",
    "pid" "uuid" NOT NULL,
    "did" "uuid",
    "transaction_type" character varying(30) NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "doctor_net_amount" numeric(10,2),
    "platform_fee_applied" numeric(10,2) DEFAULT 0,
    "payout_fee_amount" numeric(10,2) DEFAULT 0,
    "final_net_amount" numeric(10,2),
    "currency" character varying(3) DEFAULT 'INR'::character varying,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "common_payment_id" character varying(255),
    "transfer_status" character varying(30),
    "transfer_id" character varying(255),
    "transfer_error" "text",
    "razorpay_order_id" character varying(255),
    "razorpay_payment_id" character varying(255),
    "razorpay_signature" character varying(500),
    "payment_method" character varying(30),
    "razorpay_response" "jsonb",
    "description" "text",
    "initiated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "paid_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "refunded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_transfer_status" CHECK ((("transfer_status" IS NULL) OR (("transfer_status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('success'::character varying)::"text", ('failed'::character varying)::"text", ('manual_pending'::character varying)::"text", ('on_hold_linked_account'::character varying)::"text", ('on_hold'::character varying)::"text"])))),
    CONSTRAINT "finance_transactions_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('paid'::character varying)::"text", ('failed'::character varying)::"text", ('refunded'::character varying)::"text"]))),
    CONSTRAINT "finance_transactions_transaction_type_check" CHECK ((("transaction_type")::"text" = ANY (ARRAY[('consultation'::character varying)::"text", ('refund'::character varying)::"text", ('cancellation_charge'::character varying)::"text", ('doctor_payout'::character varying)::"text", ('platform_fee'::character varying)::"text"])))
);


ALTER TABLE "public"."finance_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."global_settings" (
    "key" character varying(255) NOT NULL,
    "value" character varying(255) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "description" "text"
);


ALTER TABLE "public"."global_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medication_adherence_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "adherence_id" "uuid" NOT NULL,
    "old_status" character varying(20),
    "new_status" character varying(20) NOT NULL,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "reason" "text"
);


ALTER TABLE "public"."medication_adherence_audit" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_doctor_earnings_summary" AS
 SELECT "did",
    "count"(*) AS "total_consultations",
    "count"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completed_consultations",
    "count"(
        CASE
            WHEN (("status")::"text" = 'pending'::"text") THEN 1
            ELSE NULL::integer
        END) AS "pending_consultations",
    "count"(
        CASE
            WHEN (("status")::"text" = 'failed'::"text") THEN 1
            ELSE NULL::integer
        END) AS "failed_consultations",
    (COALESCE("sum"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN "amount"
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "total_paid_amount",
    (COALESCE("sum"(
        CASE
            WHEN (("status")::"text" = 'pending'::"text") THEN "amount"
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "total_pending_amount",
    (COALESCE("sum"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN "platform_fee_applied"
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "total_platform_fees_deducted",
    (COALESCE("sum"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN COALESCE("final_net_amount", "doctor_net_amount")
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "net_earnings",
    (COALESCE("sum"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN COALESCE("payout_fee_amount", (0)::numeric)
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "total_payout_fees",
    "max"("paid_at") AS "last_consultation_date",
    "min"("created_at") AS "first_consultation_date",
    (COALESCE("avg"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN "amount"
            ELSE NULL::numeric
        END), (0)::numeric))::numeric(10,2) AS "avg_consultation_fee"
   FROM "public"."finance_transactions"
  WHERE (("transaction_type")::"text" = 'consultation'::"text")
  GROUP BY "did";


ALTER VIEW "public"."v_doctor_earnings_summary" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."mv_doctor_earnings_cache" AS
 SELECT "did",
    "total_consultations",
    "completed_consultations",
    "pending_consultations",
    "failed_consultations",
    "total_paid_amount",
    "total_pending_amount",
    "total_platform_fees_deducted",
    "net_earnings",
    "total_payout_fees",
    "last_consultation_date",
    "first_consultation_date",
    "avg_consultation_fee"
   FROM "public"."v_doctor_earnings_summary"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_doctor_earnings_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "notification_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "uid" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "type" character varying(30) DEFAULT 'general'::character varying NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "action_url" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "read_at" timestamp with time zone,
    CONSTRAINT "notifications_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['appointment'::character varying, 'prescription'::character varying, 'payment'::character varying, 'general'::character varying, 'reminder'::character varying, 'review'::character varying])::"text"[])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patients" (
    "pid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "uid" "uuid" NOT NULL,
    "date_of_birth" "date",
    "gender" character varying(20),
    "blood_group" character varying(5),
    "allergies" "text"[],
    "current_medications" "text"[],
    "chronic_conditions" "text"[],
    "address_line1" character varying(255),
    "address_line2" character varying(255),
    "city" character varying(100),
    "state" character varying(100),
    "country" character varying(100) DEFAULT 'India'::character varying,
    "postal_code" character varying(20),
    "emergency_contact_name" character varying(255),
    "emergency_contact_relationship" character varying(100),
    "emergency_contact_phone" character varying(20),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "connected_doctor_uids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "preferred_language" character varying(50) DEFAULT 'en'::character varying,
    "profile_completion_pct" smallint DEFAULT 0,
    "last_appointment_date" "date",
    "total_appointments_count" integer DEFAULT 0,
    CONSTRAINT "patients_gender_check" CHECK ((("gender")::"text" = ANY (ARRAY[('male'::character varying)::"text", ('female'::character varying)::"text", ('other'::character varying)::"text", ('prefer_not_to_say'::character varying)::"text"])))
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."receipt_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."receipt_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receipts" (
    "receipt_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "receipt_number" character varying(50) NOT NULL,
    "receipt_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "pid" "uuid" NOT NULL,
    "did" "uuid" NOT NULL,
    "patient_name" character varying(255) NOT NULL,
    "doctor_name" character varying(255) NOT NULL,
    "consultation_fee" numeric(10,2) NOT NULL,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "total_amount" numeric(10,2) NOT NULL,
    "payment_method" character varying(30),
    "razorpay_payment_id" character varying(255),
    "generated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refund_requests" (
    "refund_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aid" "uuid",
    "pid" "uuid" NOT NULL,
    "did" "uuid",
    "razorpay_payment_id" "text",
    "razorpay_refund_id" "text",
    "amount" numeric(10,2) NOT NULL,
    "refund_type" "text" DEFAULT 'full'::"text" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "text",
    "reviewer_role" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "refund_requests_refund_type_check" CHECK (("refund_type" = ANY (ARRAY['full'::"text", 'partial'::"text"]))),
    CONSTRAINT "refund_requests_reviewer_role_check" CHECK (("reviewer_role" = ANY (ARRAY['admin'::"text", 'doctor'::"text", 'system'::"text"]))),
    CONSTRAINT "refund_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'processed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."refund_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "review_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aid" "uuid" NOT NULL,
    "pid" "uuid" NOT NULL,
    "did" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "is_published" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_comment_check" CHECK ((("comment" IS NULL) OR ("length"(TRIM(BOTH FROM "comment")) <= 500))),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "uid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(20),
    "password_hash" "text",
    "role" character varying(20) NOT NULL,
    "name" character varying(255) NOT NULL,
    "profile_image_url" "text",
    "is_verified" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "last_login" timestamp with time zone,
    "auth_id" "text",
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY (ARRAY[('patient'::character varying)::"text", ('doctor'::character varying)::"text", ('admin'::character varying)::"text", ('clinic'::character varying)::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_admin_platform_summary" AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."users"
          WHERE (("users"."role")::"text" = 'patient'::"text")) AS "total_patients",
    ( SELECT "count"(*) AS "count"
           FROM "public"."users"
          WHERE (("users"."role")::"text" = 'doctor'::"text")) AS "total_doctors",
    ( SELECT "count"(*) AS "count"
           FROM "public"."clinics") AS "total_clinics",
    ( SELECT "count"(*) AS "count"
           FROM "public"."appointments") AS "total_appointments",
    ( SELECT "count"(*) AS "count"
           FROM "public"."appointments"
          WHERE (("appointments"."status")::"text" = 'scheduled'::"text")) AS "pending_appointments",
    ( SELECT "count"(*) AS "count"
           FROM "public"."prescriptions"
          WHERE ("prescriptions"."is_active" = true)) AS "active_prescriptions",
    ( SELECT COALESCE("sum"("finance_transactions"."amount"), (0)::numeric) AS "coalesce"
           FROM "public"."finance_transactions"
          WHERE (("finance_transactions"."status")::"text" = 'paid'::"text")) AS "total_revenue",
    ( SELECT COALESCE("sum"("finance_transactions"."platform_fee_applied"), (0)::numeric) AS "coalesce"
           FROM "public"."finance_transactions"
          WHERE (("finance_transactions"."status")::"text" = 'paid'::"text")) AS "total_platform_fees_collected",
    ( SELECT "count"(*) AS "count"
           FROM "public"."finance_transactions"
          WHERE (("finance_transactions"."status")::"text" = 'pending'::"text")) AS "pending_transactions";


ALTER VIEW "public"."v_admin_platform_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_clinic_doctor_revenue" AS
 SELECT "c"."clinic_id",
    "d"."did",
    "d"."uid",
    "u"."name" AS "doctor_name",
    "count"("ft"."transaction_id") AS "total_consultations",
    "count"(
        CASE
            WHEN (("ft"."status")::"text" = 'paid'::"text") THEN 1
            ELSE NULL::integer
        END) AS "paid_consultations",
    (COALESCE("sum"(
        CASE
            WHEN (("ft"."status")::"text" = 'paid'::"text") THEN "ft"."amount"
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "total_earnings",
    (COALESCE("sum"(
        CASE
            WHEN (("ft"."status")::"text" = 'paid'::"text") THEN "ft"."platform_fee_applied"
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "total_platform_fees",
    (COALESCE("sum"(
        CASE
            WHEN (("ft"."status")::"text" = 'paid'::"text") THEN COALESCE("ft"."final_net_amount", "ft"."doctor_net_amount")
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "net_earnings",
    (COALESCE("sum"(
        CASE
            WHEN (("ft"."status")::"text" = 'paid'::"text") THEN COALESCE("ft"."payout_fee_amount", (0)::numeric)
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "total_payout_fees"
   FROM ((("public"."clinics" "c"
     LEFT JOIN "public"."doctors" "d" ON (("d"."clinic_id" = "c"."clinic_id")))
     LEFT JOIN "public"."users" "u" ON (("u"."uid" = "d"."uid")))
     LEFT JOIN "public"."finance_transactions" "ft" ON ((("ft"."did" = "d"."did") AND (("ft"."transaction_type")::"text" = 'consultation'::"text"))))
  GROUP BY "c"."clinic_id", "d"."did", "d"."uid", "u"."name";


ALTER VIEW "public"."v_clinic_doctor_revenue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_daily_consultation_activity" AS
 SELECT "did",
    "date"("paid_at") AS "activity_date",
    "count"(*) AS "consultation_count",
    (COALESCE("sum"("amount"), (0)::numeric))::numeric(10,2) AS "daily_earnings",
    (COALESCE("sum"("platform_fee_applied"), (0)::numeric))::numeric(10,2) AS "daily_platform_fees",
    (COALESCE("sum"(COALESCE("final_net_amount", "doctor_net_amount")), (0)::numeric))::numeric(10,2) AS "daily_net_earnings",
    (COALESCE("sum"(COALESCE("payout_fee_amount", (0)::numeric)), (0)::numeric))::numeric(10,2) AS "daily_payout_fees",
    "count"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completed_count",
    "count"(
        CASE
            WHEN (("status")::"text" = 'pending'::"text") THEN 1
            ELSE NULL::integer
        END) AS "pending_count"
   FROM "public"."finance_transactions"
  WHERE (("transaction_type")::"text" = 'consultation'::"text")
  GROUP BY "did", ("date"("paid_at"))
  ORDER BY ("date"("paid_at")) DESC;


ALTER VIEW "public"."v_daily_consultation_activity" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_doctor_monthly_earnings" AS
 SELECT "did",
    ("date_trunc"('month'::"text", "paid_at"))::"date" AS "month_start",
    "to_char"("date_trunc"('month'::"text", "paid_at"), 'YYYY-MM'::"text") AS "month",
    "count"(*) AS "consultation_count",
    "count"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completed_count",
    "count"(
        CASE
            WHEN (("status")::"text" = 'pending'::"text") THEN 1
            ELSE NULL::integer
        END) AS "pending_count",
    "count"(
        CASE
            WHEN (("status")::"text" = 'failed'::"text") THEN 1
            ELSE NULL::integer
        END) AS "failed_count",
    COALESCE("sum"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN "amount"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_earned",
    COALESCE("sum"(
        CASE
            WHEN (("status")::"text" = 'pending'::"text") THEN "amount"
            ELSE (0)::numeric
        END), (0)::numeric) AS "pending_amount",
    COALESCE("sum"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN "platform_fee_applied"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_platform_fees",
    COALESCE("sum"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN COALESCE("final_net_amount", "doctor_net_amount")
            ELSE (0)::numeric
        END), (0)::numeric) AS "net_earned",
    COALESCE("sum"(
        CASE
            WHEN (("status")::"text" = 'paid'::"text") THEN COALESCE("payout_fee_amount", (0)::numeric)
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_payout_fees"
   FROM "public"."finance_transactions"
  WHERE (("transaction_type")::"text" = 'consultation'::"text")
  GROUP BY "did", ("date_trunc"('month'::"text", "paid_at"))
  ORDER BY (("date_trunc"('month'::"text", "paid_at"))::"date") DESC;


ALTER VIEW "public"."v_doctor_monthly_earnings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_doctor_transfer_status" AS
 SELECT "did",
    "count"(*) AS "total_transfers",
    "count"(
        CASE
            WHEN (("transfer_status")::"text" = 'success'::"text") THEN 1
            ELSE NULL::integer
        END) AS "successful_transfers",
    "count"(
        CASE
            WHEN (("transfer_status")::"text" = 'pending'::"text") THEN 1
            ELSE NULL::integer
        END) AS "pending_transfers",
    "count"(
        CASE
            WHEN (("transfer_status")::"text" = 'failed'::"text") THEN 1
            ELSE NULL::integer
        END) AS "failed_transfers",
    "count"(
        CASE
            WHEN ("transfer_status" IS NULL) THEN 1
            ELSE NULL::integer
        END) AS "no_transfer_initiated",
    (COALESCE("sum"(
        CASE
            WHEN (("transfer_status")::"text" = 'success'::"text") THEN COALESCE("final_net_amount", "doctor_net_amount")
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "transferred_amount",
    (COALESCE("sum"(
        CASE
            WHEN (("transfer_status")::"text" = 'pending'::"text") THEN COALESCE("final_net_amount", "doctor_net_amount")
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "pending_transfer_amount",
    (COALESCE("sum"(
        CASE
            WHEN (("transfer_status")::"text" = 'failed'::"text") THEN COALESCE("final_net_amount", "doctor_net_amount")
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS "failed_transfer_amount",
    "max"(
        CASE
            WHEN (("transfer_status")::"text" = 'success'::"text") THEN "paid_at"
            ELSE NULL::timestamp with time zone
        END) AS "last_successful_transfer_date"
   FROM "public"."finance_transactions"
  WHERE ((("transaction_type")::"text" = 'consultation'::"text") AND (("status")::"text" = 'paid'::"text"))
  GROUP BY "did";


ALTER VIEW "public"."v_doctor_transfer_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "schedules"."config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "retention_days" integer DEFAULT 7,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "config_retention_days_check" CHECK ((("retention_days" IS NULL) OR ("retention_days" > 0)))
);


ALTER TABLE "schedules"."config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "schedules"."job_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid",
    "executed_at" timestamp with time zone DEFAULT "now"(),
    "status_code" integer,
    "success" boolean,
    "duration_ms" bigint,
    "message" "text"
);


ALTER TABLE "schedules"."job_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "schedules"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "cron_schedule" "text" NOT NULL,
    "function_url" "text" NOT NULL,
    "http_method" "text" DEFAULT 'POST'::"text" NOT NULL,
    "encrypted_headers" "text",
    "headers" "jsonb",
    "body" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "cron_job_id" bigint,
    "last_executed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "schedules"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."advisor_findings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scan_id" "uuid" NOT NULL,
    "rule_id" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "affected_object" "text",
    "recommendation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "advisor_findings_category_check" CHECK (("category" = ANY (ARRAY['security'::"text", 'performance'::"text", 'health'::"text"]))),
    CONSTRAINT "advisor_findings_severity_check" CHECK (("severity" = ANY (ARRAY['critical'::"text", 'warning'::"text", 'info'::"text"])))
);


ALTER TABLE "system"."advisor_findings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."advisor_scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" NOT NULL,
    "scan_type" "text" DEFAULT 'manual'::"text" NOT NULL,
    "scanned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "error_message" "text",
    CONSTRAINT "advisor_scans_scan_type_check" CHECK (("scan_type" = ANY (ARRAY['manual'::"text", 'scheduled'::"text"]))),
    CONSTRAINT "advisor_scans_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "system"."advisor_scans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."advisor_suppressions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_id" "text" NOT NULL,
    "affected_object" "text",
    "scope" "text" DEFAULT 'instance'::"text" NOT NULL,
    "reason" "text" NOT NULL,
    "note" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "advisor_suppressions_reason_check" CHECK (("reason" = ANY (ARRAY['false_positive'::"text", 'accepted_risk'::"text", 'wont_fix'::"text", 'other'::"text"]))),
    CONSTRAINT "advisor_suppressions_scope_check" CHECK (("scope" = ANY (ARRAY['instance'::"text", 'rule'::"text"]))),
    CONSTRAINT "advisor_suppressions_scope_object_ck" CHECK (((("scope" = 'rule'::"text") AND ("affected_object" IS NULL)) OR (("scope" = 'instance'::"text") AND ("affected_object" IS NOT NULL))))
);


ALTER TABLE "system"."advisor_suppressions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor" "text" NOT NULL,
    "action" "text" NOT NULL,
    "module" "text" NOT NULL,
    "details" "jsonb",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "system"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."custom_migrations" (
    "version" "text" NOT NULL,
    "name" "text" NOT NULL,
    "statements" "text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "custom_migrations_version_check" CHECK (("version" ~ '^[0-9]{1,64}$'::"text"))
);


ALTER TABLE "system"."custom_migrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."database_backups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "trigger_source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "storage_key" "text",
    "size_bytes" bigint,
    "error_message" "text",
    "created_by" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "database_backups_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "database_backups_trigger_source_check" CHECK (("trigger_source" = ANY (ARRAY['manual'::"text", 'scheduled'::"text"])))
);


ALTER TABLE "system"."database_backups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."database_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "backup_enabled" boolean DEFAULT false NOT NULL,
    "backup_cron_schedule" "text" DEFAULT '0 0 * * *'::"text" NOT NULL,
    "backup_retention_days" integer DEFAULT 7,
    "backup_schedule_anchor" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "database_config_backup_retention_days_check" CHECK ((("backup_retention_days" IS NULL) OR ("backup_retention_days" > 0)))
);


ALTER TABLE "system"."database_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."deployments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" DEFAULT 'vercel'::"text" NOT NULL,
    "provider_deployment_id" "text",
    "status" "text" DEFAULT 'WAITING'::"text" NOT NULL,
    "url" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "system"."deployments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."mcp_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tool_name" character varying(255) NOT NULL,
    "success" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "system"."mcp_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "run_on" timestamp without time zone NOT NULL
);


ALTER TABLE "system"."migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "system"."migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "system"."migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "system"."migrations_id_seq" OWNED BY "system"."migrations"."id";



CREATE TABLE IF NOT EXISTS "system"."secrets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value_ciphertext" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "last_used_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_reserved" boolean DEFAULT false
);


ALTER TABLE "system"."secrets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."coupons" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."coupons_id_seq"'::"regclass");



ALTER TABLE ONLY "system"."migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"system"."migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "compute"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "compute"."services"
    ADD CONSTRAINT "services_project_id_name_key" UNIQUE ("project_id", "name");



ALTER TABLE ONLY "deployments"."runs"
    ADD CONSTRAINT "deployments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "deployments"."runs"
    ADD CONSTRAINT "deployments_provider_deployment_id_key" UNIQUE ("provider_deployment_id");



ALTER TABLE ONLY "deployments"."files"
    ADD CONSTRAINT "files_deployment_id_file_path_key" UNIQUE ("deployment_id", "file_path");



ALTER TABLE ONLY "deployments"."files"
    ADD CONSTRAINT "files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "email"."config"
    ADD CONSTRAINT "config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "email"."templates"
    ADD CONSTRAINT "email_templates_type_unique" UNIQUE ("template_type");



ALTER TABLE ONLY "email"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "functions"."definitions"
    ADD CONSTRAINT "_edge_functions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "functions"."definitions"
    ADD CONSTRAINT "_edge_functions_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "functions"."deployments"
    ADD CONSTRAINT "deployments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "memory"."memories"
    ADD CONSTRAINT "memories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."stripe_checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."customer_mappings"
    ADD CONSTRAINT "customer_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."customer_mappings"
    ADD CONSTRAINT "customer_mappings_provider_environment_provider_customer_id_key" UNIQUE ("provider", "environment", "provider_customer_id");



ALTER TABLE ONLY "payments"."customer_mappings"
    ADD CONSTRAINT "customer_mappings_provider_environment_subject_type_subject_key" UNIQUE ("provider", "environment", "subject_type", "subject_id");



ALTER TABLE ONLY "payments"."stripe_customer_portal_sessions"
    ADD CONSTRAINT "customer_portal_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."stripe_prices"
    ADD CONSTRAINT "prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."stripe_products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."provider_connections"
    ADD CONSTRAINT "provider_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."provider_connections"
    ADD CONSTRAINT "provider_connections_provider_environment_key" UNIQUE ("provider", "environment");



ALTER TABLE ONLY "payments"."razorpay_items"
    ADD CONSTRAINT "razorpay_items_environment_item_id_key" UNIQUE ("environment", "item_id");



ALTER TABLE ONLY "payments"."razorpay_items"
    ADD CONSTRAINT "razorpay_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."razorpay_orders"
    ADD CONSTRAINT "razorpay_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."razorpay_plans"
    ADD CONSTRAINT "razorpay_plans_environment_plan_id_key" UNIQUE ("environment", "plan_id");



ALTER TABLE ONLY "payments"."razorpay_plans"
    ADD CONSTRAINT "razorpay_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."razorpay_subscriptions"
    ADD CONSTRAINT "razorpay_subscriptions_environment_subscription_id_key" UNIQUE ("environment", "subscription_id");



ALTER TABLE ONLY "payments"."razorpay_subscriptions"
    ADD CONSTRAINT "razorpay_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."stripe_subscription_items"
    ADD CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."stripe_subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payments"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_storage_buckets"
    ADD CONSTRAINT "app_storage_buckets_pkey" PRIMARY KEY ("bucket_key");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("aid");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_pkey" PRIMARY KEY ("clinic_id");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_registration_number_key" UNIQUE ("registration_number");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_uid_key" UNIQUE ("uid");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctor_availability"
    ADD CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("availability_id");



ALTER TABLE ONLY "public"."doctor_patient_relationships"
    ADD CONSTRAINT "doctor_patient_relationships_did_pid_key" UNIQUE ("did", "pid");



ALTER TABLE ONLY "public"."doctor_patient_relationships"
    ADD CONSTRAINT "doctor_patient_relationships_pkey" PRIMARY KEY ("relationship_id");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_pkey" PRIMARY KEY ("did");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_registration_number_key" UNIQUE ("registration_number");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_uid_key" UNIQUE ("uid");



ALTER TABLE ONLY "public"."finance_transactions"
    ADD CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("transaction_id");



ALTER TABLE ONLY "public"."finance_transactions"
    ADD CONSTRAINT "finance_transactions_razorpay_order_id_key" UNIQUE ("razorpay_order_id");



ALTER TABLE ONLY "public"."finance_transactions"
    ADD CONSTRAINT "finance_transactions_razorpay_payment_id_key" UNIQUE ("razorpay_payment_id");



ALTER TABLE ONLY "public"."global_settings"
    ADD CONSTRAINT "global_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."medication_adherence_audit"
    ADD CONSTRAINT "medication_adherence_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medication_adherence"
    ADD CONSTRAINT "medication_adherence_pkey" PRIMARY KEY ("adherence_id");



ALTER TABLE ONLY "public"."medication_adherence"
    ADD CONSTRAINT "medication_adherence_prescription_id_medicine_name_schedule_key" UNIQUE ("prescription_id", "medicine_name", "scheduled_date", "scheduled_time");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("pid");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_uid_key" UNIQUE ("uid");



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("prescription_id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_pkey" PRIMARY KEY ("receipt_id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_receipt_number_key" UNIQUE ("receipt_number");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("refund_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("review_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_id_key" UNIQUE ("auth_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "schedules"."config"
    ADD CONSTRAINT "config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "schedules"."job_logs"
    ADD CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "schedules"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."audit_logs"
    ADD CONSTRAINT "_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."mcp_usage"
    ADD CONSTRAINT "_mcp_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."secrets"
    ADD CONSTRAINT "_secrets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."advisor_findings"
    ADD CONSTRAINT "advisor_findings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."advisor_scans"
    ADD CONSTRAINT "advisor_scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."advisor_suppressions"
    ADD CONSTRAINT "advisor_suppressions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."custom_migrations"
    ADD CONSTRAINT "custom_migrations_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "system"."database_backups"
    ADD CONSTRAINT "database_backups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."database_config"
    ADD CONSTRAINT "database_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."deployments"
    ADD CONSTRAINT "deployments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."deployments"
    ADD CONSTRAINT "deployments_provider_deployment_id_key" UNIQUE ("provider_deployment_id");



ALTER TABLE ONLY "system"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "system"."secrets"
    ADD CONSTRAINT "secrets_key_unique" UNIQUE ("key");



CREATE INDEX "idx_compute_services_project" ON "compute"."services" USING "btree" ("project_id");



CREATE INDEX "idx_compute_services_provider" ON "compute"."services" USING "btree" ("provider");



CREATE INDEX "idx_compute_services_status" ON "compute"."services" USING "btree" ("status");



CREATE INDEX "idx_deployment_files_deployment_id" ON "deployments"."files" USING "btree" ("deployment_id");



CREATE INDEX "idx_deployment_files_uploaded_at" ON "deployments"."files" USING "btree" ("deployment_id", "uploaded_at");



CREATE INDEX "idx_deployments_created_at" ON "deployments"."runs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_deployments_provider" ON "deployments"."runs" USING "btree" ("provider");



CREATE INDEX "idx_deployments_status" ON "deployments"."runs" USING "btree" ("status");



CREATE UNIQUE INDEX "email_config_singleton_idx" ON "email"."config" USING "btree" ((1));



CREATE INDEX "idx_function_deployments_created" ON "functions"."deployments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_function_deployments_status" ON "functions"."deployments" USING "btree" ("status");



CREATE INDEX "idx_memories_content_tsv" ON "memory"."memories" USING "gin" ("content_tsv");



CREATE INDEX "idx_memories_embedding_cosine" ON "memory"."memories" USING "hnsw" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "idx_memories_scope" ON "memory"."memories" USING "btree" ("scope");



CREATE INDEX "idx_payments_customers_environment_deleted" ON "payments"."customers" USING "btree" ("environment", "deleted");



CREATE INDEX "idx_payments_customers_environment_email" ON "payments"."customers" USING "btree" ("environment", "email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_payments_customers_provider" ON "payments"."customers" USING "btree" ("provider", "environment");



CREATE INDEX "idx_payments_customers_provider_created" ON "payments"."customers" USING "btree" ("provider", "environment", "provider_created_at" DESC);



CREATE UNIQUE INDEX "idx_payments_customers_provider_customer_id" ON "payments"."customers" USING "btree" ("provider", "environment", "provider_customer_id");



CREATE INDEX "idx_payments_razorpay_items_environment_active" ON "payments"."razorpay_items" USING "btree" ("environment", "active");



CREATE UNIQUE INDEX "idx_payments_razorpay_orders_environment_order" ON "payments"."razorpay_orders" USING "btree" ("environment", "order_id") WHERE ("order_id" IS NOT NULL);



CREATE INDEX "idx_payments_razorpay_orders_environment_status" ON "payments"."razorpay_orders" USING "btree" ("environment", "status");



CREATE INDEX "idx_payments_razorpay_orders_environment_subject" ON "payments"."razorpay_orders" USING "btree" ("environment", "subject_type", "subject_id") WHERE (("subject_type" IS NOT NULL) AND ("subject_id" IS NOT NULL));



CREATE INDEX "idx_payments_razorpay_orders_environment_verified_payment" ON "payments"."razorpay_orders" USING "btree" ("environment", "verified_payment_id") WHERE ("verified_payment_id" IS NOT NULL);



CREATE INDEX "idx_payments_razorpay_plans_environment_item" ON "payments"."razorpay_plans" USING "btree" ("environment", "item_id");



CREATE INDEX "idx_payments_razorpay_subscriptions_environment_authorization_p" ON "payments"."razorpay_subscriptions" USING "btree" ("environment", "authorization_payment_id") WHERE ("authorization_payment_id" IS NOT NULL);



CREATE INDEX "idx_payments_razorpay_subscriptions_environment_customer" ON "payments"."razorpay_subscriptions" USING "btree" ("environment", "customer_id") WHERE ("customer_id" IS NOT NULL);



CREATE INDEX "idx_payments_razorpay_subscriptions_environment_plan" ON "payments"."razorpay_subscriptions" USING "btree" ("environment", "plan_id");



CREATE INDEX "idx_payments_razorpay_subscriptions_environment_status" ON "payments"."razorpay_subscriptions" USING "btree" ("environment", "status");



CREATE INDEX "idx_payments_razorpay_subscriptions_environment_subject" ON "payments"."razorpay_subscriptions" USING "btree" ("environment", "subject_type", "subject_id") WHERE (("subject_type" IS NOT NULL) AND ("subject_id" IS NOT NULL));



CREATE INDEX "idx_payments_stripe_checkout_sessions_environment_customer" ON "payments"."stripe_checkout_sessions" USING "btree" ("environment", "customer_id") WHERE ("customer_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_payments_stripe_checkout_sessions_environment_idempotency" ON "payments"."stripe_checkout_sessions" USING "btree" ("environment", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE UNIQUE INDEX "idx_payments_stripe_checkout_sessions_environment_session" ON "payments"."stripe_checkout_sessions" USING "btree" ("environment", "checkout_session_id") WHERE ("checkout_session_id" IS NOT NULL);



CREATE INDEX "idx_payments_stripe_checkout_sessions_environment_status" ON "payments"."stripe_checkout_sessions" USING "btree" ("environment", "status");



CREATE INDEX "idx_payments_stripe_checkout_sessions_environment_subject" ON "payments"."stripe_checkout_sessions" USING "btree" ("environment", "subject_type", "subject_id") WHERE (("subject_type" IS NOT NULL) AND ("subject_id" IS NOT NULL));



CREATE INDEX "idx_payments_stripe_customer_portal_sessions_environment_custom" ON "payments"."stripe_customer_portal_sessions" USING "btree" ("environment", "customer_id") WHERE ("customer_id" IS NOT NULL);



CREATE INDEX "idx_payments_stripe_customer_portal_sessions_environment_status" ON "payments"."stripe_customer_portal_sessions" USING "btree" ("environment", "status");



CREATE INDEX "idx_payments_stripe_customer_portal_sessions_environment_subjec" ON "payments"."stripe_customer_portal_sessions" USING "btree" ("environment", "subject_type", "subject_id");



CREATE INDEX "idx_payments_stripe_prices_environment_lookup_key" ON "payments"."stripe_prices" USING "btree" ("environment", "lookup_key") WHERE ("lookup_key" IS NOT NULL);



CREATE UNIQUE INDEX "idx_payments_stripe_prices_environment_price" ON "payments"."stripe_prices" USING "btree" ("environment", "price_id");



CREATE INDEX "idx_payments_stripe_prices_environment_product" ON "payments"."stripe_prices" USING "btree" ("environment", "product_id");



CREATE INDEX "idx_payments_stripe_products_environment_active" ON "payments"."stripe_products" USING "btree" ("environment", "active");



CREATE INDEX "idx_payments_stripe_products_environment_default_price" ON "payments"."stripe_products" USING "btree" ("environment", "default_price_id") WHERE ("default_price_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_payments_stripe_products_environment_product" ON "payments"."stripe_products" USING "btree" ("environment", "product_id");



CREATE UNIQUE INDEX "idx_payments_stripe_subscription_items_environment_item" ON "payments"."stripe_subscription_items" USING "btree" ("environment", "subscription_item_id");



CREATE INDEX "idx_payments_stripe_subscription_items_environment_price" ON "payments"."stripe_subscription_items" USING "btree" ("environment", "price_id") WHERE ("price_id" IS NOT NULL);



CREATE INDEX "idx_payments_stripe_subscription_items_environment_subscription" ON "payments"."stripe_subscription_items" USING "btree" ("environment", "subscription_id");



CREATE INDEX "idx_payments_stripe_subscriptions_environment_customer" ON "payments"."stripe_subscriptions" USING "btree" ("environment", "customer_id");



CREATE INDEX "idx_payments_stripe_subscriptions_environment_status" ON "payments"."stripe_subscriptions" USING "btree" ("environment", "status");



CREATE INDEX "idx_payments_stripe_subscriptions_environment_subject" ON "payments"."stripe_subscriptions" USING "btree" ("environment", "subject_type", "subject_id") WHERE (("subject_type" IS NOT NULL) AND ("subject_id" IS NOT NULL));



CREATE UNIQUE INDEX "idx_payments_stripe_subscriptions_environment_subscription" ON "payments"."stripe_subscriptions" USING "btree" ("environment", "subscription_id");



CREATE INDEX "idx_payments_transactions_provider_created" ON "payments"."transactions" USING "btree" ("provider", "environment", "provider_created_at" DESC);



CREATE INDEX "idx_payments_transactions_provider_customer" ON "payments"."transactions" USING "btree" ("provider", "environment", "provider_customer_id") WHERE ("provider_customer_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_payments_transactions_provider_object" ON "payments"."transactions" USING "btree" ("provider", "environment", "provider_object_type", "provider_object_id") WHERE (("provider_object_type" IS NOT NULL) AND ("provider_object_id" IS NOT NULL));



CREATE INDEX "idx_payments_transactions_provider_status" ON "payments"."transactions" USING "btree" ("provider", "environment", "status");



CREATE INDEX "idx_payments_transactions_provider_subject" ON "payments"."transactions" USING "btree" ("provider", "environment", "subject_type", "subject_id") WHERE (("subject_type" IS NOT NULL) AND ("subject_id" IS NOT NULL));



CREATE INDEX "idx_payments_transactions_related_object_ids" ON "payments"."transactions" USING "gin" ("related_object_ids");



CREATE INDEX "idx_payments_webhook_events_environment_object" ON "payments"."webhook_events" USING "btree" ("environment", "object_type", "object_id") WHERE ("object_id" IS NOT NULL);



CREATE INDEX "idx_payments_webhook_events_environment_status" ON "payments"."webhook_events" USING "btree" ("environment", "processing_status");



CREATE UNIQUE INDEX "idx_payments_webhook_events_provider_event" ON "payments"."webhook_events" USING "btree" ("provider", "environment", "provider_event_id");



CREATE INDEX "idx_adherence_audit_adherence_id" ON "public"."medication_adherence_audit" USING "btree" ("adherence_id");



CREATE INDEX "idx_adherence_date" ON "public"."medication_adherence" USING "btree" ("scheduled_date");



CREATE INDEX "idx_adherence_pid" ON "public"."medication_adherence" USING "btree" ("pid");



CREATE INDEX "idx_adherence_pid_date_taken" ON "public"."medication_adherence" USING "btree" ("pid", "scheduled_date", "is_taken");



CREATE INDEX "idx_adherence_pid_date_time" ON "public"."medication_adherence" USING "btree" ("pid", "scheduled_date", "scheduled_time") WHERE ("is_taken" = false);



CREATE INDEX "idx_adherence_prescription" ON "public"."medication_adherence" USING "btree" ("prescription_id");



CREATE UNIQUE INDEX "idx_adherence_summary_unique" ON "public"."adherence_progress_summary" USING "btree" ("pid", "prescription_id", "did", "medicine_name");



CREATE INDEX "idx_adherence_synced" ON "public"."medication_adherence" USING "btree" ("synced");



CREATE INDEX "idx_appointments_clinic_id" ON "public"."appointments" USING "btree" ("clinic_id") WHERE ("clinic_id" IS NOT NULL);



CREATE INDEX "idx_appointments_date" ON "public"."appointments" USING "btree" ("scheduled_date");



CREATE INDEX "idx_appointments_did" ON "public"."appointments" USING "btree" ("did");



CREATE INDEX "idx_appointments_did_date_status" ON "public"."appointments" USING "btree" ("did", "scheduled_date", "status");



CREATE INDEX "idx_appointments_mode" ON "public"."appointments" USING "btree" ("mode");



CREATE INDEX "idx_appointments_payment_id" ON "public"."appointments" USING "btree" ("payment_id");



CREATE INDEX "idx_appointments_payment_status" ON "public"."appointments" USING "btree" ("payment_status");



CREATE INDEX "idx_appointments_pid" ON "public"."appointments" USING "btree" ("pid");



CREATE INDEX "idx_appointments_pid_date_status" ON "public"."appointments" USING "btree" ("pid", "scheduled_date", "status");



CREATE INDEX "idx_appointments_razorpay_order" ON "public"."appointments" USING "btree" ("razorpay_order_id") WHERE ("razorpay_order_id" IS NOT NULL);



CREATE INDEX "idx_appointments_status" ON "public"."appointments" USING "btree" ("status");



CREATE INDEX "idx_availability_active" ON "public"."doctor_availability" USING "btree" ("is_active");



CREATE INDEX "idx_availability_day" ON "public"."doctor_availability" USING "btree" ("day_of_week");



CREATE INDEX "idx_availability_did" ON "public"."doctor_availability" USING "btree" ("did");



CREATE INDEX "idx_availability_did_day_active" ON "public"."doctor_availability" USING "btree" ("did", "day_of_week", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_clinics_is_active" ON "public"."clinics" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_clinics_uid" ON "public"."clinics" USING "btree" ("uid");



CREATE INDEX "idx_coupons_active" ON "public"."coupons" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_coupons_code" ON "public"."coupons" USING "btree" ("upper"(("code")::"text"));



CREATE INDEX "idx_doctors_accepting" ON "public"."doctors" USING "btree" ("is_accepting_patients") WHERE ("is_accepting_patients" = true);



CREATE INDEX "idx_doctors_bank_details_verified" ON "public"."doctors" USING "btree" ("bank_details_verified") WHERE ("bank_details_verified" = true);



CREATE INDEX "idx_doctors_clinic_id" ON "public"."doctors" USING "btree" ("clinic_id");



CREATE INDEX "idx_doctors_custom_specializations" ON "public"."doctors" USING "gin" ("to_tsvector"('"english"'::"regconfig", "custom_specializations"));



CREATE INDEX "idx_doctors_is_verified" ON "public"."doctors" USING "btree" ("is_verified") WHERE ("is_verified" = true);



CREATE INDEX "idx_doctors_specialization" ON "public"."doctors" USING "gin" ("specialization");



CREATE INDEX "idx_doctors_treated_patients" ON "public"."doctors" USING "gin" ("treated_patient_uids");



CREATE INDEX "idx_doctors_uid" ON "public"."doctors" USING "btree" ("uid");



CREATE INDEX "idx_finance_did_created" ON "public"."finance_transactions" USING "btree" ("did", "created_at" DESC);



CREATE INDEX "idx_finance_transactions_common_payment_id" ON "public"."finance_transactions" USING "btree" ("common_payment_id") WHERE ("common_payment_id" IS NOT NULL);



CREATE INDEX "idx_finance_transactions_doctor_paid_at" ON "public"."finance_transactions" USING "btree" ("did", "paid_at", "status") WHERE (("transaction_type")::"text" = 'consultation'::"text");



CREATE INDEX "idx_finance_transactions_doctor_status" ON "public"."finance_transactions" USING "btree" ("did", "status") WHERE (("transaction_type")::"text" = 'consultation'::"text");



CREATE INDEX "idx_finance_transactions_doctor_type" ON "public"."finance_transactions" USING "btree" ("did", "transaction_type");



CREATE INDEX "idx_finance_transactions_paid_at" ON "public"."finance_transactions" USING "btree" ("paid_at") WHERE (("status")::"text" = 'paid'::"text");



CREATE INDEX "idx_finance_transactions_transfer_status" ON "public"."finance_transactions" USING "btree" ("transfer_status") WHERE ("transfer_status" IS NOT NULL);



CREATE INDEX "idx_global_settings_key" ON "public"."global_settings" USING "btree" ("key");



CREATE UNIQUE INDEX "idx_mv_doctor_earnings_cache_did" ON "public"."mv_doctor_earnings_cache" USING "btree" ("did");



CREATE INDEX "idx_notifications_created" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_uid" ON "public"."notifications" USING "btree" ("uid");



CREATE INDEX "idx_notifications_uid_unread" ON "public"."notifications" USING "btree" ("uid", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_patients_connected_doctors" ON "public"."patients" USING "gin" ("connected_doctor_uids");



CREATE INDEX "idx_patients_uid" ON "public"."patients" USING "btree" ("uid");



CREATE INDEX "idx_prescriptions_active" ON "public"."prescriptions" USING "btree" ("is_active");



CREATE INDEX "idx_prescriptions_aid" ON "public"."prescriptions" USING "btree" ("aid");



CREATE INDEX "idx_prescriptions_did" ON "public"."prescriptions" USING "btree" ("did");



CREATE INDEX "idx_prescriptions_pid" ON "public"."prescriptions" USING "btree" ("pid");



CREATE INDEX "idx_prescriptions_pid_active" ON "public"."prescriptions" USING "btree" ("pid", "is_active");



CREATE INDEX "idx_prescriptions_sent" ON "public"."prescriptions" USING "btree" ("sent_to_patient", "sent_at");



CREATE INDEX "idx_refund_aid" ON "public"."refund_requests" USING "btree" ("aid");



CREATE INDEX "idx_refund_did" ON "public"."refund_requests" USING "btree" ("did");



CREATE INDEX "idx_refund_patient" ON "public"."refund_requests" USING "btree" ("pid");



CREATE INDEX "idx_refund_status" ON "public"."refund_requests" USING "btree" ("status");



CREATE INDEX "idx_relationships_did" ON "public"."doctor_patient_relationships" USING "btree" ("did");



CREATE INDEX "idx_relationships_pid" ON "public"."doctor_patient_relationships" USING "btree" ("pid");



CREATE INDEX "idx_relationships_status" ON "public"."doctor_patient_relationships" USING "btree" ("relationship_status");



CREATE INDEX "idx_transactions_aid" ON "public"."finance_transactions" USING "btree" ("aid");



CREATE INDEX "idx_transactions_common_payment_id" ON "public"."finance_transactions" USING "btree" ("common_payment_id");



CREATE INDEX "idx_transactions_did_type_status" ON "public"."finance_transactions" USING "btree" ("did", "transaction_type", "status");



CREATE INDEX "idx_transactions_pid" ON "public"."finance_transactions" USING "btree" ("pid");



CREATE INDEX "idx_transactions_razorpay_order" ON "public"."finance_transactions" USING "btree" ("razorpay_order_id");



CREATE INDEX "idx_transactions_razorpay_payment" ON "public"."finance_transactions" USING "btree" ("razorpay_payment_id");



CREATE INDEX "idx_transactions_status" ON "public"."finance_transactions" USING "btree" ("status");



CREATE INDEX "idx_users_auth_id" ON "public"."users" USING "btree" ("auth_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_phone" ON "public"."users" USING "btree" ("phone");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE UNIQUE INDEX "reviews_aid_unique" ON "public"."reviews" USING "btree" ("aid");



CREATE INDEX "reviews_did_created" ON "public"."reviews" USING "btree" ("did", "created_at" DESC);



CREATE INDEX "reviews_pid_created" ON "public"."reviews" USING "btree" ("pid", "created_at" DESC);



CREATE INDEX "idx_job_logs_executed_at" ON "schedules"."job_logs" USING "btree" ("executed_at" DESC);



CREATE INDEX "idx_job_logs_job_id" ON "schedules"."job_logs" USING "btree" ("job_id");



CREATE INDEX "idx_jobs_cron_job_id" ON "schedules"."jobs" USING "btree" ("cron_job_id");



CREATE INDEX "idx_jobs_is_active" ON "schedules"."jobs" USING "btree" ("is_active");



CREATE UNIQUE INDEX "idx_schedules_config_singleton" ON "schedules"."config" USING "btree" ((1));



CREATE INDEX "idx_advisor_findings_scan_id" ON "system"."advisor_findings" USING "btree" ("scan_id");



CREATE INDEX "idx_advisor_scans_scanned_at" ON "system"."advisor_scans" USING "btree" ("scanned_at" DESC);



CREATE INDEX "idx_advisor_scans_status" ON "system"."advisor_scans" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_advisor_suppressions_fingerprint" ON "system"."advisor_suppressions" USING "btree" ("rule_id", COALESCE("affected_object", ''::"text"));



CREATE INDEX "idx_audit_logs_actor" ON "system"."audit_logs" USING "btree" ("actor");



CREATE INDEX "idx_audit_logs_created_at" ON "system"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_module" ON "system"."audit_logs" USING "btree" ("module");



CREATE UNIQUE INDEX "idx_database_backups_name" ON "system"."database_backups" USING "btree" ("name") WHERE ("name" IS NOT NULL);



CREATE INDEX "idx_database_backups_status" ON "system"."database_backups" USING "btree" ("status");



CREATE INDEX "idx_database_backups_trigger_source_created_at" ON "system"."database_backups" USING "btree" ("trigger_source", "created_at" DESC);



CREATE UNIQUE INDEX "idx_database_config_singleton" ON "system"."database_config" USING "btree" ((1));



CREATE INDEX "idx_deployments_created_at" ON "system"."deployments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_deployments_provider" ON "system"."deployments" USING "btree" ("provider");



CREATE INDEX "idx_deployments_status" ON "system"."deployments" USING "btree" ("status");



CREATE INDEX "idx_mcp_usage_created_at" ON "system"."mcp_usage" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_secrets_name" ON "system"."secrets" USING "btree" ("key");



CREATE OR REPLACE TRIGGER "update_compute_services_updated_at" BEFORE UPDATE ON "compute"."services" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_files_updated_at" BEFORE UPDATE ON "deployments"."files" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_runs_updated_at" BEFORE UPDATE ON "deployments"."runs" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_definitions_updated_at" BEFORE UPDATE ON "functions"."definitions" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_memories_updated_at" BEFORE UPDATE ON "memory"."memories" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_customer_mappings_updated_at" BEFORE UPDATE ON "payments"."customer_mappings" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_customers_updated_at" BEFORE UPDATE ON "payments"."customers" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_provider_connections_updated_at" BEFORE UPDATE ON "payments"."provider_connections" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_razorpay_items_updated_at" BEFORE UPDATE ON "payments"."razorpay_items" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_razorpay_orders_updated_at" BEFORE UPDATE ON "payments"."razorpay_orders" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_razorpay_plans_updated_at" BEFORE UPDATE ON "payments"."razorpay_plans" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_razorpay_subscriptions_updated_at" BEFORE UPDATE ON "payments"."razorpay_subscriptions" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_stripe_checkout_sessions_updated_at" BEFORE UPDATE ON "payments"."stripe_checkout_sessions" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_stripe_customer_portal_sessions_updated_at" BEFORE UPDATE ON "payments"."stripe_customer_portal_sessions" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_stripe_prices_updated_at" BEFORE UPDATE ON "payments"."stripe_prices" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_stripe_products_updated_at" BEFORE UPDATE ON "payments"."stripe_products" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_stripe_subscription_items_updated_at" BEFORE UPDATE ON "payments"."stripe_subscription_items" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_stripe_subscriptions_updated_at" BEFORE UPDATE ON "payments"."stripe_subscriptions" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_transactions_updated_at" BEFORE UPDATE ON "payments"."transactions" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_webhook_events_updated_at" BEFORE UPDATE ON "payments"."webhook_events" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "generate_receipt_number_trigger" BEFORE INSERT ON "public"."receipts" FOR EACH ROW EXECUTE FUNCTION "public"."generate_receipt_number"();



CREATE OR REPLACE TRIGGER "generate_token_number_trigger" BEFORE INSERT ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."generate_token_number"();



CREATE OR REPLACE TRIGGER "trg_audit_adherence_status" AFTER UPDATE OF "status" ON "public"."medication_adherence" FOR EACH ROW EXECUTE FUNCTION "public"."audit_adherence_status_change"();



CREATE OR REPLACE TRIGGER "trg_auto_generate_receipt" AFTER INSERT OR UPDATE OF "status" ON "public"."finance_transactions" FOR EACH ROW WHEN (((("new"."status")::"text" = 'paid'::"text") AND (("new"."transaction_type")::"text" = 'consultation'::"text"))) EXECUTE FUNCTION "public"."auto_generate_receipt"();



CREATE OR REPLACE TRIGGER "trg_refresh_doctor_rating" AFTER INSERT OR DELETE OR UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_doctor_rating"();



CREATE OR REPLACE TRIGGER "trg_set_completed_at" BEFORE UPDATE OF "status" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."set_appointment_completed_at"();



CREATE OR REPLACE TRIGGER "trg_sync_appointment_payment" AFTER INSERT OR UPDATE OF "status" ON "public"."finance_transactions" FOR EACH ROW WHEN (((("new"."status")::"text" = 'paid'::"text") AND ("new"."aid" IS NOT NULL))) EXECUTE FUNCTION "public"."sync_appointment_payment_status"();



CREATE OR REPLACE TRIGGER "trg_sync_clinic_doctor_count" AFTER INSERT OR DELETE OR UPDATE OF "clinic_id" ON "public"."doctors" FOR EACH ROW EXECUTE FUNCTION "public"."sync_clinic_doctor_count"();



CREATE OR REPLACE TRIGGER "trg_sync_doctor_verified" AFTER UPDATE OF "is_verified" ON "public"."doctors" FOR EACH ROW EXECUTE FUNCTION "public"."sync_doctor_verification_to_user"();



CREATE OR REPLACE TRIGGER "trg_sync_treated_patients" AFTER INSERT OR UPDATE OF "status" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_treated_patients"();



CREATE OR REPLACE TRIGGER "trg_update_appointment_aggregates" AFTER INSERT OR UPDATE OF "status" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_appointment_aggregates"();



CREATE OR REPLACE TRIGGER "trigger_auto_create_adherence" AFTER UPDATE OF "sent_to_patient" ON "public"."prescriptions" FOR EACH ROW WHEN ((("old"."sent_to_patient" IS DISTINCT FROM "new"."sent_to_patient") AND ("new"."sent_to_patient" = true))) EXECUTE FUNCTION "public"."auto_create_adherence_records"();



CREATE OR REPLACE TRIGGER "trigger_auto_manage_user_roles" AFTER INSERT OR UPDATE OF "role" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."auto_manage_user_roles"();



CREATE OR REPLACE TRIGGER "trigger_enforce_doctor_role" BEFORE INSERT OR UPDATE ON "public"."doctors" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_doctor_role"();



CREATE OR REPLACE TRIGGER "trigger_enforce_patient_role" BEFORE INSERT OR UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_patient_role"();



CREATE OR REPLACE TRIGGER "trigger_refresh_adherence_summary" AFTER INSERT OR DELETE OR UPDATE ON "public"."medication_adherence" FOR EACH STATEMENT EXECUTE FUNCTION "public"."refresh_adherence_summary"();



CREATE OR REPLACE TRIGGER "trigger_sync_clinic_details" AFTER UPDATE OF "clinic_name" ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."sync_clinic_name_to_doctors"();



CREATE OR REPLACE TRIGGER "trigger_update_relationship" AFTER INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_doctor_patient_relationship"();



CREATE OR REPLACE TRIGGER "trigger_validate_user_role_change" BEFORE UPDATE OF "role" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."validate_user_role_change"();



CREATE OR REPLACE TRIGGER "update_app_storage_buckets_updated_at" BEFORE UPDATE ON "public"."app_storage_buckets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_availability_updated_at" BEFORE UPDATE ON "public"."doctor_availability" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clinics_updated_at" BEFORE UPDATE ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_coupons_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_doctors_updated_at" BEFORE UPDATE ON "public"."doctors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_global_settings_updated_at" BEFORE UPDATE ON "public"."global_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_patients_updated_at" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_prescriptions_updated_at" BEFORE UPDATE ON "public"."prescriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_refund_requests_updated_at" BEFORE UPDATE ON "public"."refund_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_relationships_updated_at" BEFORE UPDATE ON "public"."doctor_patient_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reviews_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_jobs_updated_at" BEFORE UPDATE ON "schedules"."jobs" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_schedules_config_updated_at" BEFORE UPDATE ON "schedules"."config" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_audit_logs_updated_at" BEFORE UPDATE ON "system"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_database_backups_updated_at" BEFORE UPDATE ON "system"."database_backups" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_database_config_updated_at" BEFORE UPDATE ON "system"."database_config" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_secrets_updated_at" BEFORE UPDATE ON "system"."secrets" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_system_deployments_updated_at" BEFORE UPDATE ON "system"."deployments" FOR EACH ROW EXECUTE FUNCTION "system"."update_updated_at"();



ALTER TABLE ONLY "deployments"."files"
    ADD CONSTRAINT "files_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"."runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("clinic_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_rescheduled_from_fkey" FOREIGN KEY ("rescheduled_from") REFERENCES "public"."appointments"("aid") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctor_availability"
    ADD CONSTRAINT "doctor_availability_did_fkey" FOREIGN KEY ("did") REFERENCES "public"."doctors"("did") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctor_patient_relationships"
    ADD CONSTRAINT "doctor_patient_relationships_did_fkey" FOREIGN KEY ("did") REFERENCES "public"."doctors"("did") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctor_patient_relationships"
    ADD CONSTRAINT "doctor_patient_relationships_pid_fkey" FOREIGN KEY ("pid") REFERENCES "public"."patients"("pid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("clinic_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "fk_patients_user" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."medication_adherence_audit"
    ADD CONSTRAINT "medication_adherence_audit_adherence_id_fkey" FOREIGN KEY ("adherence_id") REFERENCES "public"."medication_adherence"("adherence_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medication_adherence"
    ADD CONSTRAINT "medication_adherence_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("prescription_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_aid_fkey" FOREIGN KEY ("aid") REFERENCES "public"."appointments"("aid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_pid_fkey" FOREIGN KEY ("pid") REFERENCES "public"."patients"("pid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."finance_transactions"("transaction_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_aid_fkey" FOREIGN KEY ("aid") REFERENCES "public"."appointments"("aid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_aid_fkey" FOREIGN KEY ("aid") REFERENCES "public"."appointments"("aid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_did_fkey" FOREIGN KEY ("did") REFERENCES "public"."doctors"("did") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pid_fkey" FOREIGN KEY ("pid") REFERENCES "public"."patients"("pid") ON DELETE CASCADE;



ALTER TABLE ONLY "schedules"."job_logs"
    ADD CONSTRAINT "job_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "schedules"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "system"."advisor_findings"
    ADD CONSTRAINT "advisor_findings_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "system"."advisor_scans"("id") ON DELETE CASCADE;



CREATE POLICY "public_users_insert_own" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("uid" = "auth"."uid"()));



CREATE POLICY "public_users_read" ON "public"."users" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "public_users_update_own" ON "public"."users" FOR UPDATE TO "authenticated" USING (("uid" = "auth"."uid"())) WITH CHECK (("uid" = "auth"."uid"()));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "compute" TO "project_admin";






GRANT USAGE ON SCHEMA "deployments" TO "project_admin";



GRANT USAGE ON SCHEMA "email" TO "project_admin";



GRANT USAGE ON SCHEMA "functions" TO "project_admin";



GRANT USAGE ON SCHEMA "memory" TO "project_admin";






GRANT USAGE ON SCHEMA "payments" TO "anon";
GRANT USAGE ON SCHEMA "payments" TO "authenticated";
GRANT USAGE ON SCHEMA "payments" TO "project_admin";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT ALL ON SCHEMA "public" TO "project_admin";



GRANT USAGE ON SCHEMA "schedules" TO "project_admin";



GRANT USAGE ON SCHEMA "system" TO "project_admin";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."audit_adherence_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_adherence_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_adherence_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_create_adherence_records"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_adherence_records"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_adherence_records"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_generate_receipt"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_receipt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_receipt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_insert_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_insert_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_insert_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_manage_user_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_manage_user_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_manage_user_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_skip_pending_medications"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_skip_pending_medications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_skip_pending_medications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_doctor_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_doctor_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_doctor_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_patient_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_patient_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_patient_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_receipt_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_receipt_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_receipt_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_token_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_token_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_token_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "postgres";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "anon";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_adherence_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_adherence_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_adherence_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_doctor_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_doctor_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_doctor_rating"() TO "service_role";
GRANT ALL ON FUNCTION "public"."refresh_doctor_rating"() TO "project_admin";



GRANT ALL ON FUNCTION "public"."set_appointment_completed_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_appointment_completed_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_appointment_completed_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_appointment_completed_at"() TO "project_admin";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_appointment_payment_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_appointment_payment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_appointment_payment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_clinic_doctor_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_clinic_doctor_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_clinic_doctor_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_clinic_name_to_doctors"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_clinic_name_to_doctors"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_clinic_name_to_doctors"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_doctor_verification_to_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_doctor_verification_to_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_doctor_verification_to_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_treated_patients"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_treated_patients"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_treated_patients"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_role_tables"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_role_tables"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_role_tables"() TO "service_role";



GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_appointment_aggregates"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_appointment_aggregates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_appointment_aggregates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_doctor_patient_relationship"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_doctor_patient_relationship"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_doctor_patient_relationship"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_user_role_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_user_role_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_user_role_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



REVOKE ALL ON FUNCTION "schedules"."cleanup_job_logs"("p_batch_size" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "schedules"."decrypt_headers"("p_encrypted_headers" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "schedules"."encrypt_headers"("p_headers" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "system"."reassign_public_objects_to_project_admin"() FROM PUBLIC;



GRANT ALL ON FUNCTION "system"."reload_postgrest_schema"() TO "project_admin";



GRANT ALL ON FUNCTION "system"."sync_postgrest_exposed_schemas"() TO "project_admin";



GRANT ALL ON FUNCTION "system"."update_updated_at"() TO "project_admin";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";



GRANT SELECT ON TABLE "compute"."services" TO "project_admin";









GRANT SELECT ON TABLE "deployments"."files" TO "project_admin";



GRANT SELECT ON TABLE "deployments"."runs" TO "project_admin";



GRANT SELECT ON TABLE "email"."config" TO "project_admin";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "email"."templates" TO "project_admin";









GRANT SELECT ON TABLE "functions"."definitions" TO "project_admin";



GRANT SELECT ON TABLE "functions"."deployments" TO "project_admin";



GRANT SELECT ON TABLE "memory"."memories" TO "project_admin";



GRANT SELECT ON TABLE "payments"."customer_mappings" TO "project_admin";



GRANT SELECT,TRIGGER ON TABLE "payments"."customers" TO "project_admin";



GRANT SELECT ON TABLE "payments"."provider_connections" TO "project_admin";



GRANT SELECT ON TABLE "payments"."razorpay_items" TO "project_admin";



GRANT SELECT,INSERT ON TABLE "payments"."razorpay_orders" TO "anon";
GRANT SELECT,INSERT ON TABLE "payments"."razorpay_orders" TO "authenticated";
GRANT SELECT,INSERT,UPDATE ON TABLE "payments"."razorpay_orders" TO "project_admin";



GRANT SELECT ON TABLE "payments"."razorpay_plans" TO "project_admin";



GRANT SELECT,INSERT ON TABLE "payments"."razorpay_subscriptions" TO "authenticated";
GRANT SELECT,INSERT,UPDATE ON TABLE "payments"."razorpay_subscriptions" TO "project_admin";



GRANT UPDATE("updated_at") ON TABLE "payments"."razorpay_subscriptions" TO "authenticated";



GRANT SELECT,INSERT ON TABLE "payments"."stripe_checkout_sessions" TO "anon";
GRANT SELECT,INSERT ON TABLE "payments"."stripe_checkout_sessions" TO "authenticated";
GRANT SELECT,INSERT,TRIGGER ON TABLE "payments"."stripe_checkout_sessions" TO "project_admin";



GRANT SELECT,INSERT ON TABLE "payments"."stripe_customer_portal_sessions" TO "anon";
GRANT SELECT,INSERT ON TABLE "payments"."stripe_customer_portal_sessions" TO "authenticated";
GRANT SELECT,INSERT,TRIGGER ON TABLE "payments"."stripe_customer_portal_sessions" TO "project_admin";



GRANT SELECT ON TABLE "payments"."stripe_prices" TO "project_admin";



GRANT SELECT ON TABLE "payments"."stripe_products" TO "project_admin";



GRANT SELECT ON TABLE "payments"."stripe_subscription_items" TO "project_admin";



GRANT SELECT ON TABLE "payments"."stripe_subscriptions" TO "project_admin";



GRANT SELECT ON TABLE "payments"."transactions" TO "project_admin";



GRANT SELECT,TRIGGER ON TABLE "payments"."webhook_events" TO "project_admin";



GRANT ALL ON TABLE "public"."medication_adherence" TO "anon";
GRANT ALL ON TABLE "public"."medication_adherence" TO "authenticated";
GRANT ALL ON TABLE "public"."medication_adherence" TO "service_role";



GRANT ALL ON TABLE "public"."adherence_progress" TO "anon";
GRANT ALL ON TABLE "public"."adherence_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."adherence_progress" TO "service_role";



GRANT ALL ON TABLE "public"."prescriptions" TO "anon";
GRANT ALL ON TABLE "public"."prescriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."prescriptions" TO "service_role";



GRANT ALL ON TABLE "public"."adherence_progress_summary" TO "anon";
GRANT ALL ON TABLE "public"."adherence_progress_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."adherence_progress_summary" TO "service_role";



GRANT ALL ON TABLE "public"."app_storage_buckets" TO "anon";
GRANT ALL ON TABLE "public"."app_storage_buckets" TO "authenticated";
GRANT ALL ON TABLE "public"."app_storage_buckets" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."clinics" TO "anon";
GRANT ALL ON TABLE "public"."clinics" TO "authenticated";
GRANT ALL ON TABLE "public"."clinics" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON SEQUENCE "public"."coupons_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."coupons_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."coupons_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."doctor_availability" TO "anon";
GRANT ALL ON TABLE "public"."doctor_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_availability" TO "service_role";



GRANT ALL ON TABLE "public"."doctor_patient_relationships" TO "anon";
GRANT ALL ON TABLE "public"."doctor_patient_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_patient_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."doctors" TO "anon";
GRANT ALL ON TABLE "public"."doctors" TO "authenticated";
GRANT ALL ON TABLE "public"."doctors" TO "service_role";



GRANT ALL ON TABLE "public"."finance_transactions" TO "anon";
GRANT ALL ON TABLE "public"."finance_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."global_settings" TO "anon";
GRANT ALL ON TABLE "public"."global_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."global_settings" TO "service_role";



GRANT ALL ON TABLE "public"."medication_adherence_audit" TO "anon";
GRANT ALL ON TABLE "public"."medication_adherence_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."medication_adherence_audit" TO "service_role";



GRANT ALL ON TABLE "public"."v_doctor_earnings_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_doctor_earnings_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_doctor_earnings_summary" TO "service_role";



GRANT ALL ON TABLE "public"."mv_doctor_earnings_cache" TO "anon";
GRANT ALL ON TABLE "public"."mv_doctor_earnings_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_doctor_earnings_cache" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."patients" TO "anon";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";



GRANT ALL ON SEQUENCE "public"."receipt_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."receipt_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."receipt_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."receipts" TO "anon";
GRANT ALL ON TABLE "public"."receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."receipts" TO "service_role";



GRANT ALL ON TABLE "public"."refund_requests" TO "anon";
GRANT ALL ON TABLE "public"."refund_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."refund_requests" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reviews" TO "project_admin";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."v_admin_platform_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_admin_platform_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_admin_platform_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_clinic_doctor_revenue" TO "anon";
GRANT ALL ON TABLE "public"."v_clinic_doctor_revenue" TO "authenticated";
GRANT ALL ON TABLE "public"."v_clinic_doctor_revenue" TO "service_role";



GRANT ALL ON TABLE "public"."v_daily_consultation_activity" TO "anon";
GRANT ALL ON TABLE "public"."v_daily_consultation_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."v_daily_consultation_activity" TO "service_role";



GRANT ALL ON TABLE "public"."v_doctor_monthly_earnings" TO "anon";
GRANT ALL ON TABLE "public"."v_doctor_monthly_earnings" TO "authenticated";
GRANT ALL ON TABLE "public"."v_doctor_monthly_earnings" TO "service_role";



GRANT ALL ON TABLE "public"."v_doctor_transfer_status" TO "anon";
GRANT ALL ON TABLE "public"."v_doctor_transfer_status" TO "authenticated";
GRANT ALL ON TABLE "public"."v_doctor_transfer_status" TO "service_role";



GRANT SELECT ON TABLE "schedules"."config" TO "project_admin";



GRANT SELECT ON TABLE "schedules"."job_logs" TO "project_admin";



GRANT SELECT ON TABLE "schedules"."jobs" TO "project_admin";



GRANT SELECT ON TABLE "system"."advisor_findings" TO "project_admin";



GRANT SELECT ON TABLE "system"."advisor_scans" TO "project_admin";



GRANT SELECT ON TABLE "system"."advisor_suppressions" TO "project_admin";



GRANT SELECT ON TABLE "system"."audit_logs" TO "project_admin";



GRANT SELECT ON TABLE "system"."custom_migrations" TO "project_admin";



GRANT SELECT ON TABLE "system"."database_backups" TO "project_admin";



GRANT SELECT ON TABLE "system"."database_config" TO "project_admin";



GRANT SELECT ON TABLE "system"."deployments" TO "project_admin";



GRANT SELECT ON TABLE "system"."mcp_usage" TO "project_admin";



GRANT SELECT ON TABLE "system"."migrations" TO "project_admin";



GRANT SELECT ON TABLE "system"."secrets" TO "project_admin";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "compute" GRANT SELECT ON TABLES TO "project_admin";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "deployments" GRANT SELECT ON TABLES TO "project_admin";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "email" GRANT SELECT ON TABLES TO "project_admin";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "functions" GRANT SELECT ON TABLES TO "project_admin";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "memory" GRANT SELECT ON TABLES TO "project_admin";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "payments" GRANT SELECT ON TABLES TO "project_admin";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "project_admin";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "project_admin";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "project_admin";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "schedules" GRANT SELECT ON TABLES TO "project_admin";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "system" GRANT SELECT ON TABLES TO "project_admin";
































