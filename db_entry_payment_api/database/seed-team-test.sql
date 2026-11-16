-- Synthetic team-test accounts, matching the original local demo.
-- Run only against the dedicated entry_payment_002 test schema.
USE entry_payment_002;
INSERT INTO management (name, mobile_number, pwd, otp, created_date, fcm_id)
SELECT 'Mahesh', '9876501003', NULL, '4271', DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 330 MINUTE), NULL
WHERE NOT EXISTS (SELECT 1 FROM management WHERE mobile_number = '9876501003');
INSERT INTO management (name, mobile_number, pwd, otp, created_date, fcm_id)
SELECT 'Bala', '9876501004', NULL, '4271', DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 330 MINUTE), NULL
WHERE NOT EXISTS (SELECT 1 FROM management WHERE mobile_number = '9876501004');
