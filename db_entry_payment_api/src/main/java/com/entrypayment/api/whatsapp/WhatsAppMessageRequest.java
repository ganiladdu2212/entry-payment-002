package com.entrypayment.api.whatsapp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record WhatsAppMessageRequest(
    @NotNull @Positive Long managementId,
    @NotNull @Positive Long memberId,
    @NotBlank @Size(max = 20) String messageType,
    @NotBlank @Size(max = 4000) String messageText,
    @NotBlank @Size(max = 100) String initiatedBy,
    boolean automatic) {}
