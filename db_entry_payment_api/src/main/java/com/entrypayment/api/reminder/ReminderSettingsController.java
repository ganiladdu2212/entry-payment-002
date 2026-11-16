package com.entrypayment.api.reminder;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reminder-settings")
@Tag(name = "Reminder settings", description = "Management-owned WhatsApp reminder schedules")
public class ReminderSettingsController {
  private final ReminderSettingsService settingsService;

  public ReminderSettingsController(ReminderSettingsService settingsService) {
    this.settingsService = settingsService;
  }

  @GetMapping
  @Operation(summary = "Get WhatsApp reminder settings")
  public ReminderSettingsResponse get(@RequestParam @Positive Long managementId) {
    com.entrypayment.api.config.GymAccess.require(managementId);
    return settingsService.get(managementId);
  }

  @PutMapping
  @Operation(summary = "Save WhatsApp reminder settings")
  public ReminderSettingsResponse save(@Valid @RequestBody ReminderSettingsRequest request) {
    com.entrypayment.api.config.GymAccess.require(request.managementId());
    return settingsService.save(request);
  }
}
