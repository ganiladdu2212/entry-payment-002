package com.entrypayment.api.member;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record MemberCreatedResponse(
    Long memberId,
    Long selectedPlanId,
    String status,
    LocalDate expiresOn,
    LocalDateTime createdDate) {}
