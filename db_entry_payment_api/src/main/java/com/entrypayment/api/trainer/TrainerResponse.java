package com.entrypayment.api.trainer;

import java.time.LocalDateTime;

public record TrainerResponse(
    Long id,
    Long managementId,
    String name,
    String mobileNumber,
    LocalDateTime createdDate) {}
