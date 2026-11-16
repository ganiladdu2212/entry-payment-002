package com.entrypayment.api.whatsapp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record WhatsAppBroadcastRequest(
    @NotNull @Positive Long managementId,
    @NotBlank @Size(max = 20) String messageType,
    @NotBlank @Size(max = 4000) String messageText,
    @NotBlank @Size(max = 100) String initiatedBy,
    @Size(max = 30) String audience) {}
