package com.entrypayment.api.catalog;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PlanResponse(
    Long id,
    Long managementId,
    String name,
    BigDecimal amount,
    Integer durationMonths,
    Integer sessionCount,
    LocalDateTime createdDate) {}
