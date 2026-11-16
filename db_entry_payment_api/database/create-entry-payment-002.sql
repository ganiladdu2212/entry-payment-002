-- Create the dedicated schema without modifying any other database.
-- On first startup with the mysql profile, Hibernate creates the tables
-- from the current entity definitions, including personal_training_expires_on.
CREATE DATABASE IF NOT EXISTS entry_payment_002
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
