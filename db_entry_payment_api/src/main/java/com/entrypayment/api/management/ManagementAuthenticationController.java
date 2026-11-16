package com.entrypayment.api.management;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/management/auth")
public class ManagementAuthenticationController {

  private final ManagementAuthenticationService authenticationService;

  public ManagementAuthenticationController(ManagementAuthenticationService authenticationService) {
    this.authenticationService = authenticationService;
  }

  @PostMapping("/login-method")
  public LoginMethodResponse loginMethod(@Valid @RequestBody MobileLoginRequest request) {
    return authenticationService.loginMethod(request);
  }

  @PostMapping("/verify-otp")
  public ManagementLoginResponse verifyOtp(@Valid @RequestBody OtpLoginRequest request) {
    return authenticationService.verifyOtp(request);
  }

  @PostMapping("/verify-password")
  public ManagementLoginResponse verifyPassword(@Valid @RequestBody PasswordLoginRequest request) {
    return authenticationService.verifyPassword(request);
  }
}
