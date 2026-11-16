package com.entrypayment.api.reminder;

import java.time.LocalDateTime;

public record ReminderSettingsResponse(Long managementId, boolean beforeDue, boolean onDue,
    boolean afterDue, String sendAt, LocalDateTime createdDate) {}
