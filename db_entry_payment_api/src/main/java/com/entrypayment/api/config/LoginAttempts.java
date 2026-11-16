package com.entrypayment.api.config;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Bounds credential guessing per account, including unknown accounts. */
@Service
public class LoginAttempts {
  private record Window(int count, long until) {}
  private final Map<String, Window> attempts = new HashMap<>();
  public synchronized void check(String key) {
    long now = System.currentTimeMillis();
    attempts.values().removeIf(w -> w.until() <= now);
    Window w = attempts.getOrDefault(key, new Window(0, now + 900_000));
    if (w.count() >= 10 || attempts.size() >= 10000)
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts. Try again in 15 minutes.");
    attempts.put(key, new Window(w.count() + 1, w.until()));
  }
}
