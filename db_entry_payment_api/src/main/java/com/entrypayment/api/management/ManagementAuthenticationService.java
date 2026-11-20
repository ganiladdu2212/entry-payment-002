package com.entrypayment.api.management;

import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ManagementAuthenticationService {

  private final ManagementRepository managementRepository;
  private final PasswordEncoder passwordEncoder;
  private final com.entrypayment.api.config.ApiSessions sessions;
  private final com.entrypayment.api.config.LoginAttempts attempts;

  public ManagementAuthenticationService(
      ManagementRepository managementRepository, PasswordEncoder passwordEncoder, com.entrypayment.api.config.ApiSessions sessions, com.entrypayment.api.config.LoginAttempts attempts) {
    this.managementRepository = managementRepository;
    this.passwordEncoder = passwordEncoder;
    this.sessions = sessions;
    this.attempts = attempts;
  }

  @Transactional(readOnly = true)
  public LoginMethodResponse loginMethod(MobileLoginRequest request) {
    Management management = findManagement(request.mobileNumber());
    LoginMethod loginMethod = hasPassword(management) ? LoginMethod.PASSWORD : LoginMethod.OTP;
    return new LoginMethodResponse(management.getName(), management.getMobileNumber(), loginMethod);
  }

  @Transactional(readOnly = true)
  public ManagementLoginResponse verifyOtp(OtpLoginRequest request) {
    attempts.check("management:" + request.mobileNumber());
    Management management = findManagement(request.mobileNumber());
    if (hasPassword(management)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Password login has been enabled for this account.");
    }
    if (management.getOtp() == null || !Objects.equals(management.getOtp(), request.otp())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect OTP.");
    }
    return loginResponse(management);
  }

  @Transactional(readOnly = true)
  public ManagementLoginResponse verifyPassword(PasswordLoginRequest request) {
    attempts.check("management:" + request.mobileNumber());
    Management management = findManagement(request.mobileNumber());
    if (!hasPassword(management)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "OTP login is required for this account.");
    }
    if (!passwordEncoder.matches(request.password(), management.getPwd())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect password.");
    }
    return loginResponse(management);
  }

  private Management findManagement(String mobileNumber) {
    return managementRepository
        .findByMobileNumber(mobileNumber)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Management account not found."));
  }

  private boolean hasPassword(Management management) {
    return management.getPwd() != null && !management.getPwd().isBlank();
  }

  private ManagementLoginResponse loginResponse(Management management) {
    Long gymId = management.getGymManagementId() == null ? management.getId() : management.getGymManagementId();
    Management gymOwner = managementRepository.findById(gymId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Gym account is not configured."));
    if (gymOwner.getGymManagementId() != null && !gymOwner.getGymManagementId().equals(gymId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Gym account is not configured.");
    }
    return new ManagementLoginResponse(management.getId(), gymId, management.getName(), management.getMobileNumber(), sessions.issue(management.getId(), gymId, "MANAGEMENT"));
  }
}
