package com.entrypayment.api.access;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AppMobileRequest(@NotBlank @Pattern(regexp = "^[6-9][0-9]{9}$") String mobileNumber) {}
