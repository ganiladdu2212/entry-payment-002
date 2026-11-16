package com.entrypayment.api.access;

import com.entrypayment.api.trainer.Trainer;
import com.entrypayment.api.trainer.TrainerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Trainer login against the configured database credential. Member login is disabled. */
@Service
public class AppAuthenticationService {
  private final TrainerRepository trainerRepository;
  private final com.entrypayment.api.config.ApiSessions sessions;
  private final com.entrypayment.api.config.LoginAttempts attempts;

  public AppAuthenticationService(TrainerRepository trainerRepository,
      com.entrypayment.api.config.ApiSessions sessions, com.entrypayment.api.config.LoginAttempts attempts) {
    this.trainerRepository = trainerRepository;
    this.sessions = sessions;
    this.attempts = attempts;
  }

  public AppLoginMethodResponse trainerLoginMethod(AppMobileRequest request) {
    Trainer trainer = trainerRepository.findByMobileNumber(request.mobileNumber())
        .orElseThrow(() -> notFound("Trainer"));
    return new AppLoginMethodResponse(trainer.getName(), trainer.getMobileNumber(), "TRAINER");
  }

  public AppLoginResponse verifyTrainer(AppOtpRequest request) {
    attempts.check("trainer:" + request.mobileNumber());
    Trainer trainer = trainerRepository.findByMobileNumber(request.mobileNumber())
        .orElseThrow(() -> notFound("Trainer"));
    if (trainer.getOtp() == null || !java.util.Objects.equals(trainer.getOtp(), request.otp())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "That OTP is incorrect.");
    }
    return new AppLoginResponse(trainer.getId(), trainer.getManagementId(), trainer.getName(), trainer.getMobileNumber(), "TRAINER", sessions.issue(trainer.getId(), trainer.getManagementId(), "TRAINER"));
  }

  public AppLoginMethodResponse memberLoginMethod(AppMobileRequest request) {
    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Member login is not enabled.");
  }
  public AppLoginResponse verifyMember(AppOtpRequest request) {
    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Member login is not enabled.");
  }

  private ResponseStatusException notFound(String role) {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, role + " account not found for this mobile number.");
  }
}
