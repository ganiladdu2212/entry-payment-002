package com.entrypayment.api.payment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PaymentResponse(
    Long id,
    Long memberId,
    Long memberSelectedPlanId,
    String membershipPlanName,
    String personalTrainingPlanName,
    BigDecimal amount,
    String paymentMode,
    String utr,
    boolean screenshotAttached,
    String screenshotData,
    boolean receiptSent,
    String capturedBy,
    LocalDate validTill,
    LocalDate personalTrainingValidTill,
    LocalDateTime createdDate) {}
