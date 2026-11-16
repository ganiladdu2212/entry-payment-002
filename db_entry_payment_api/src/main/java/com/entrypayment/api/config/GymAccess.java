package com.entrypayment.api.config;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class GymAccess {
  private GymAccess() {}
  public static void require(Long managementId) {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof ApiSessions.Principal p))
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in again.");
    if (managementId == null || !managementId.equals(p.managementId()))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this gym.");
  }
}
