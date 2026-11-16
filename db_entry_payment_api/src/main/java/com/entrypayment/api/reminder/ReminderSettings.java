package com.entrypayment.api.reminder;

import com.entrypayment.api.common.IstAuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "reminder_settings")
public class ReminderSettings extends IstAuditedEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "management_id", nullable = false, unique = true)
  private Long managementId;

  @Column(name = "before_due", nullable = false)
  private boolean beforeDue;

  @Column(name = "on_due", nullable = false)
  private boolean onDue;

  @Column(name = "after_due", nullable = false)
  private boolean afterDue;

  @Column(name = "send_at", nullable = false, length = 12)
  private String sendAt;

  protected ReminderSettings() {}

  public ReminderSettings(Long managementId, boolean beforeDue, boolean onDue, boolean afterDue, String sendAt) {
    this.managementId = managementId;
    update(beforeDue, onDue, afterDue, sendAt);
  }

  public void update(boolean beforeDue, boolean onDue, boolean afterDue, String sendAt) {
    this.beforeDue = beforeDue;
    this.onDue = onDue;
    this.afterDue = afterDue;
    this.sendAt = sendAt.trim();
  }

  public Long getManagementId() { return managementId; }
  public boolean isBeforeDue() { return beforeDue; }
  public boolean isOnDue() { return onDue; }
  public boolean isAfterDue() { return afterDue; }
  public String getSendAt() { return sendAt; }
}
