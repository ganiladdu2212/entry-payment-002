package com.entrypayment.api.catalog;

import com.entrypayment.api.common.IstAuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "membership_plans")
public class MembershipPlan extends IstAuditedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "management_id", nullable = false)
  private Long managementId;

  @Column(nullable = false, length = 60)
  private String name;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal amount;

  @Column(name = "duration_months", nullable = false)
  private Integer durationMonths;

  @Column(name = "session_count")
  private Integer sessionCount;

  protected MembershipPlan() {}

  public MembershipPlan(Long managementId, String name, BigDecimal amount, Integer durationMonths) {
    this(managementId, name, amount, durationMonths, null);
  }

  public MembershipPlan(Long managementId, String name, BigDecimal amount, Integer durationMonths, Integer sessionCount) {
    this.managementId = managementId;
    this.name = name;
    this.amount = amount;
    this.durationMonths = durationMonths;
    this.sessionCount = sessionCount;
  }

  public Long getId() { return id; }
  public Long getManagementId() { return managementId; }
  public String getName() { return name; }
  public BigDecimal getAmount() { return amount; }
  public Integer getDurationMonths() { return durationMonths; }
  public Integer getSessionCount() { return sessionCount; }
}
