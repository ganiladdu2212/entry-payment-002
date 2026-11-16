package com.entrypayment.api.member;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Full member data displayed after selecting a member from the Members list. */
public record MemberDetailResponse(
    Long id,
    String fullName,
    String whatsappNumber,
    String photoData,
    String email,
    String flatHouseNumber,
    String apartmentBuilding,
    String streetArea,
    String city,
    String pinCode,
    String emergencyContactName,
    String emergencyContactMobile,
    boolean sendWhatsappWelcome,
    LocalDateTime memberSince,
    String onboardedBy,
    Long membershipPlanId,
    String membershipPlanName,
    BigDecimal membershipPlanAmount,
    Integer membershipPlanDurationMonths,
    Long personalTrainingPlanId,
    String personalTrainingPlanName,
    BigDecimal personalTrainingPlanAmount,
    Integer personalTrainingPlanDurationMonths,
    LocalDate startDate,
    LocalDate expiresOn,
    LocalDate personalTrainingExpiresOn,
    String trainer,
    String status,
    Integer membershipSessionCount,
    Integer personalTrainingSessionCount) {}
