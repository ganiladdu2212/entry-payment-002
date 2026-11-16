package com.entrypayment.api.access;
public record AppLoginResponse(Long id, Long managementId, String name, String mobileNumber, String role, String accessToken) {}
