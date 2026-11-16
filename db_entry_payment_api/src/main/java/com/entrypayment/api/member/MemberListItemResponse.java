package com.entrypayment.api.member;

import java.time.LocalDate;

public record MemberListItemResponse(
    Long id,
    String fullName,
    String whatsappNumber,
    String photoData,
    String membershipPlanName,
    boolean hasPersonalTraining,
    LocalDate expiresOn,
    String status) {}
