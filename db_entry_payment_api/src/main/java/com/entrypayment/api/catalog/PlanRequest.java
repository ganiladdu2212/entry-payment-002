package com.entrypayment.api.catalog;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record PlanRequest(
    @NotNull @Positive Long managementId,
    @NotBlank @Size(max = 60) String name,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    @NotNull @Positive Integer durationMonths,
    @Positive Integer sessionCount) {}
