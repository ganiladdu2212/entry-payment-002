package com.entrypayment.api.management;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MobileLoginRequest(
    @NotBlank @Pattern(regexp = "\\d{10}", message = "Mobile number must have 10 digits")
        String mobileNumber) {}
