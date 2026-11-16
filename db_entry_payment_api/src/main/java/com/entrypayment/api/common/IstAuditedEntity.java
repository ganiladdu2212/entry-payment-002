package com.entrypayment.api.common;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import java.time.LocalDateTime;
import java.time.ZoneId;

/** Base for database records that must retain their creation time in IST. */
@MappedSuperclass
public abstract class IstAuditedEntity {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

  @Column(name = "created_date", nullable = false, updatable = false, columnDefinition = "DATETIME(6)")
  private LocalDateTime createdDate;

  @PrePersist
  protected void assignCreatedDate() {
    if (createdDate == null) {
      createdDate = LocalDateTime.now(IST);
    }
  }

  public LocalDateTime getCreatedDate() {
    return createdDate;
  }
}
