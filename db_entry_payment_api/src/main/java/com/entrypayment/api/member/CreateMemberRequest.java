package com.entrypayment.api.member;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateMemberRequest(
    @NotNull @Positive Long managementId,
    @Size(max = 100) String onboardedBy,
    @NotBlank @Size(max = 100) String fullName,
    @NotBlank @Pattern(regexp = "^[6-9]\\d{9}$", message = "WhatsApp number must be a valid 10-digit Indian mobile number.") String whatsappNumber,
    @NotNull @Positive Long membershipPlanId,
    @Positive Long personalTrainingPlanId,
    @NotNull @FutureOrPresent LocalDate startDate,
    @NotBlank @Size(max = 100) String trainer,
    @Email @Size(max = 150) String email,
    @Size(max = 100) String flatHouseNumber,
    @Size(max = 150) String apartmentBuilding,
    @Size(max = 150) String streetArea,
    @Size(max = 100) String city,
    @Pattern(regexp = "^$|^\\d{6}$", message = "PIN code must contain 6 digits.") String pinCode,
    @Size(max = 100) String emergencyContactName,
    @Pattern(regexp = "^$|^[6-9]\\d{9}$", message = "Emergency mobile must be a valid 10-digit Indian mobile number.") String emergencyContactMobile,
    @NotNull Boolean sendWhatsappWelcome,
    @NotBlank @Size(max = 2000000) String photoData,
    LocalDate endDate,
    @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal membershipPriceOverride,
    @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal personalTrainingPriceOverride) {}
