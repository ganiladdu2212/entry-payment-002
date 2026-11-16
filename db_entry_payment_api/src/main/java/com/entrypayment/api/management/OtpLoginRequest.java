package com.entrypayment.api.management;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record OtpLoginRequest(
    @NotBlank @Pattern(regexp = "\\d{10}", message = "Mobile number must have 10 digits")
        String mobileNumber,
    @NotBlank @Pattern(regexp = "\\d{4,6}", message = "OTP must have 4 to 6 digits") String otp) {}
