CREATE DATABASE IF NOT EXISTS entry_payment
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE entry_payment;

CREATE TABLE IF NOT EXISTS management (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  mobile_number VARCHAR(15) NOT NULL,
  pwd VARCHAR(255) NULL,
  otp VARCHAR(6) NULL,
  created_date DATETIME(6) NOT NULL,
  fcm_id VARCHAR(512) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_management_mobile_number (mobile_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS membership_plans (
  id BIGINT NOT NULL AUTO_INCREMENT,
  management_id BIGINT NOT NULL,
  name VARCHAR(60) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  duration_months INT NOT NULL,
  created_date DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_membership_plans_management_id (management_id),
  CONSTRAINT fk_membership_plans_management
    FOREIGN KEY (management_id) REFERENCES management(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_trainings (
  id BIGINT NOT NULL AUTO_INCREMENT,
  management_id BIGINT NOT NULL,
  name VARCHAR(60) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  duration_months INT NOT NULL,
  created_date DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_personal_trainings_management_id (management_id),
  CONSTRAINT fk_personal_trainings_management
    FOREIGN KEY (management_id) REFERENCES management(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS members (
  id BIGINT NOT NULL AUTO_INCREMENT,
  management_id BIGINT NOT NULL,
  onboarded_by VARCHAR(100) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  whatsapp_number VARCHAR(15) NOT NULL,
  email VARCHAR(150) NULL,
  flat_house_number VARCHAR(100) NULL,
  apartment_building VARCHAR(150) NULL,
  street_area VARCHAR(150) NULL,
  city VARCHAR(100) NULL,
  pin_code VARCHAR(12) NULL,
  emergency_contact_name VARCHAR(100) NULL,
  emergency_contact_mobile VARCHAR(15) NULL,
  send_whatsapp_welcome BOOLEAN NOT NULL,
  photo_data LONGTEXT NULL,
  created_date DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_members_management_id (management_id),
  CONSTRAINT fk_members_management
    FOREIGN KEY (management_id) REFERENCES management(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trainers (
  id BIGINT NOT NULL AUTO_INCREMENT,
  management_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  mobile_number VARCHAR(15) NULL,
  created_date DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_trainers_management_id (management_id),
  CONSTRAINT fk_trainers_management
    FOREIGN KEY (management_id) REFERENCES management(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS member_selected_plans (
  id BIGINT NOT NULL AUTO_INCREMENT,
  member_id BIGINT NOT NULL,
  membership_plan_id BIGINT NOT NULL,
  membership_plan_name VARCHAR(60) NOT NULL,
  membership_plan_amount DECIMAL(12,2) NOT NULL,
  membership_plan_duration_months INT NOT NULL,
  personal_training_plan_id BIGINT NULL,
  personal_training_plan_name VARCHAR(60) NULL,
  personal_training_plan_amount DECIMAL(12,2) NULL,
  personal_training_plan_duration_months INT NULL,
  start_date DATE NOT NULL,
  expires_on DATE NOT NULL,
  trainer VARCHAR(100) NOT NULL,
  status VARCHAR(12) NOT NULL,
  created_date DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_member_selected_plans_member_id (member_id),
  KEY idx_member_selected_plans_status_expiry (status, expires_on),
  CONSTRAINT fk_member_selected_plans_member
    FOREIGN KEY (member_id) REFERENCES members(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  management_id BIGINT NOT NULL,
  member_id BIGINT NOT NULL,
  member_selected_plan_id BIGINT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_mode VARCHAR(10) NOT NULL,
  utr VARCHAR(20) NULL,
  screenshot_attached BOOLEAN NOT NULL,
  screenshot_data LONGTEXT NULL,
  receipt_sent BOOLEAN NOT NULL,
  captured_by VARCHAR(100) NOT NULL,
  created_date DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_payments_management_member (management_id, member_id),
  CONSTRAINT fk_payments_management FOREIGN KEY (management_id) REFERENCES management(id),
  CONSTRAINT fk_payments_member FOREIGN KEY (member_id) REFERENCES members(id),
  CONSTRAINT fk_payments_selected_plan FOREIGN KEY (member_selected_plan_id) REFERENCES member_selected_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id BIGINT NOT NULL AUTO_INCREMENT,
  management_id BIGINT NOT NULL,
  member_id BIGINT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  recipient_phone VARCHAR(15) NOT NULL,
  message_type VARCHAR(20) NOT NULL,
  message_text TEXT NOT NULL,
  initiated_by VARCHAR(100) NOT NULL,
  automatic BOOLEAN NOT NULL,
  handoff_status VARCHAR(20) NOT NULL,
  created_date DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_whatsapp_messages_management_member (management_id, member_id, created_date),
  CONSTRAINT fk_whatsapp_messages_management FOREIGN KEY (management_id) REFERENCES management(id),
  CONSTRAINT fk_whatsapp_messages_member FOREIGN KEY (member_id) REFERENCES members(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminder_settings (
  id BIGINT NOT NULL AUTO_INCREMENT,
  management_id BIGINT NOT NULL,
  before_due BOOLEAN NOT NULL,
  on_due BOOLEAN NOT NULL,
  after_due BOOLEAN NOT NULL,
  send_at VARCHAR(12) NOT NULL,
  created_date DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reminder_settings_management_id (management_id),
  CONSTRAINT fk_reminder_settings_management FOREIGN KEY (management_id) REFERENCES management(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A blank password enables OTP login. Created dates manually entered in this database use IST.
INSERT INTO management (name, mobile_number, pwd, otp, created_date, fcm_id)
VALUES ('Mahesh', '9876501003', NULL, '4271', DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 330 MINUTE), NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name);
