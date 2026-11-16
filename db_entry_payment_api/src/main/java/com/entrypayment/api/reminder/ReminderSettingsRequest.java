package com.entrypayment.api.reminder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ReminderSettingsRequest(
    @NotNull @Positive Long managementId,
    boolean beforeDue,
    boolean onDue,
    boolean afterDue,
    @NotBlank @Size(max = 12) String sendAt) {}
