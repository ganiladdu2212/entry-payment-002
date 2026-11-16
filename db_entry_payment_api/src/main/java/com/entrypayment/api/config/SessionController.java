package com.entrypayment.api.config;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/v1/session")
public class SessionController {
  private final ApiSessions sessions;
  public SessionController(ApiSessions sessions) { this.sessions = sessions; }
  @GetMapping public ApiSessions.Principal current(@AuthenticationPrincipal ApiSessions.Principal principal) { return principal; }
  @PostMapping("/logout") public void logout(@RequestHeader("Authorization") String authorization) {
    sessions.revoke(authorization.substring(7));
  }
}
