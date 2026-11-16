package com.entrypayment.api.access;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/app-auth")
public class AppAuthenticationController {
  private final AppAuthenticationService authenticationService;

  public AppAuthenticationController(AppAuthenticationService authenticationService) {
    this.authenticationService = authenticationService;
  }

  @PostMapping("/trainers/login-method")
  public AppLoginMethodResponse trainerLoginMethod(@Valid @RequestBody AppMobileRequest request) {
    return authenticationService.trainerLoginMethod(request);
  }

  @PostMapping("/trainers/verify-otp")
  public AppLoginResponse verifyTrainer(@Valid @RequestBody AppOtpRequest request) {
    return authenticationService.verifyTrainer(request);
  }

  @PostMapping("/members/login-method")
  public AppLoginMethodResponse memberLoginMethod(@Valid @RequestBody AppMobileRequest request) {
    return authenticationService.memberLoginMethod(request);
  }

  @PostMapping("/members/verify-otp")
  public AppLoginResponse verifyMember(@Valid @RequestBody AppOtpRequest request) {
    return authenticationService.verifyMember(request);
  }
}
