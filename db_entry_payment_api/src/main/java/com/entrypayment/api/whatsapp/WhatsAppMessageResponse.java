package com.entrypayment.api.whatsapp;

import java.time.LocalDateTime;

public record WhatsAppMessageResponse(
    Long id, Long memberId, String recipientName, String recipientPhone, String messageType,
    String messageText, String initiatedBy, boolean automatic, String handoffStatus,
    LocalDateTime createdDate) {}
