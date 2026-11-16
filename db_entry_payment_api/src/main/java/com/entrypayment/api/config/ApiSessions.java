package com.entrypayment.api.config;

import java.security.SecureRandom;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

/** Opaque, server-side sessions. Restarting the API revokes all sessions. */
@Service
public class ApiSessions {
  public record Principal(Long accountId, Long managementId, String role, Instant expiresAt) {}
  private final Map<String, Principal> sessions = new HashMap<>();
  private final SecureRandom random = new SecureRandom();
  private final long ttl;
  public ApiSessions(@Value("${app.session.ttl-seconds:28800}") long ttl) {
    if (ttl < 1) throw new IllegalArgumentException("Session TTL must be positive");
    this.ttl = ttl;
  }
  private String hash(String token) {
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
    catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
  }
  public synchronized String issue(Long accountId, Long managementId, String role) {
    sessions.values().removeIf(p -> !p.expiresAt().isAfter(Instant.now()));
    byte[] bytes = new byte[32]; random.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    sessions.put(hash(token), new Principal(accountId, managementId, role, Instant.now().plusSeconds(ttl)));
    return token;
  }
  public synchronized Principal resolve(String token) {
    if (token == null || token.length() != 43) return null;
    Principal p = sessions.get(hash(token));
    if (p != null && !p.expiresAt().isAfter(Instant.now())) { sessions.remove(hash(token)); return null; }
    return p;
  }
  public synchronized void revoke(String token) { if (token != null) sessions.remove(hash(token)); }
}
