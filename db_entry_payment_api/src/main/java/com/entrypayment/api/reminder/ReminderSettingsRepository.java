package com.entrypayment.api.reminder;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReminderSettingsRepository extends JpaRepository<ReminderSettings, Long> {
  Optional<ReminderSettings> findByManagementId(Long managementId);
}
