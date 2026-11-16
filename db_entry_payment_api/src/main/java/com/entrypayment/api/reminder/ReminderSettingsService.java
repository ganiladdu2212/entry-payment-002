package com.entrypayment.api.reminder;

import com.entrypayment.api.management.ManagementRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReminderSettingsService {
  private final ManagementRepository managementRepository;
  private final ReminderSettingsRepository settingsRepository;

  public ReminderSettingsService(ManagementRepository managementRepository, ReminderSettingsRepository settingsRepository) {
    this.managementRepository = managementRepository;
    this.settingsRepository = settingsRepository;
  }

  @Transactional(readOnly = true)
  public ReminderSettingsResponse get(Long managementId) {
    requireManagement(managementId);
    return settingsRepository.findByManagementId(managementId).map(this::toResponse)
        .orElse(new ReminderSettingsResponse(managementId, true, true, false, "09:00", null));
  }

  @Transactional
  public ReminderSettingsResponse save(ReminderSettingsRequest request) {
    requireManagement(request.managementId());
    ReminderSettings settings = settingsRepository.findByManagementId(request.managementId())
        .orElseGet(() -> new ReminderSettings(request.managementId(), request.beforeDue(), request.onDue(), request.afterDue(), request.sendAt()));
    settings.update(request.beforeDue(), request.onDue(), request.afterDue(), request.sendAt());
    return toResponse(settingsRepository.save(settings));
  }

  private void requireManagement(Long managementId) {
    if (!managementRepository.existsById(managementId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Management account not found.");
    }
  }

  private ReminderSettingsResponse toResponse(ReminderSettings settings) {
    return new ReminderSettingsResponse(settings.getManagementId(), settings.isBeforeDue(), settings.isOnDue(),
        settings.isAfterDue(), settings.getSendAt(), settings.getCreatedDate());
  }
}
