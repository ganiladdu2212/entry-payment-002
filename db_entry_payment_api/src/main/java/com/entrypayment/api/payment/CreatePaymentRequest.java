package com.entrypayment.api.payment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreatePaymentRequest(
    @NotNull @Positive Long managementId,
    @NotNull @Positive Long memberId,
    @NotNull @Positive Long membershipPlanId,
    @Positive Long personalTrainingPlanId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    @NotBlank @Size(max = 10) String paymentMode,
    @Size(max = 20) String utr,
    boolean screenshotAttached,
    @Size(max = 5000000) String screenshotData,
    boolean sendReceipt,
    @Size(max = 100) String capturedBy,
    @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal membershipPriceOverride,
    @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal personalTrainingPriceOverride,
    LocalDate startDate,
    LocalDate endDate) {}
