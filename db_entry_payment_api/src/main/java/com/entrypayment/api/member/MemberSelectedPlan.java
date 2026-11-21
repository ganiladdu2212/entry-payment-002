package com.entrypayment.api.member;

import com.entrypayment.api.common.IstAuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "member_selected_plans")
public class MemberSelectedPlan extends IstAuditedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "member_id", nullable = false)
  private Long memberId;

  @Column(name = "membership_plan_id", nullable = false)
  private Long membershipPlanId;

  @Column(name = "membership_plan_name", nullable = false, length = 60)
  private String membershipPlanName;

  @Column(name = "membership_plan_amount", nullable = false, precision = 12, scale = 2)
  private BigDecimal membershipPlanAmount;

  @Column(name = "membership_plan_duration_months", nullable = false)
  private Integer membershipPlanDurationMonths;

  @Column(name = "personal_training_plan_id")
  private Long personalTrainingPlanId;

  @Column(name = "personal_training_plan_name", length = 60)
  private String personalTrainingPlanName;

  @Column(name = "personal_training_plan_amount", precision = 12, scale = 2)
  private BigDecimal personalTrainingPlanAmount;

  @Column(name = "personal_training_plan_duration_months")
  private Integer personalTrainingPlanDurationMonths;

  @Column(name = "membership_session_count")
  private Integer membershipSessionCount;

  @Column(name = "personal_training_session_count")
  private Integer personalTrainingSessionCount;

  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @Column(name = "expires_on", nullable = false)
  private LocalDate expiresOn;

  @Column(name = "custom_end_date")
  private LocalDate customEndDate;

  @Column(name = "membership_price_override", precision = 12, scale = 2)
  private BigDecimal membershipPriceOverride;

  @Column(name = "personal_training_price_override", precision = 12, scale = 2)
  private BigDecimal personalTrainingPriceOverride;

  @Column(name = "personal_training_expires_on")
  private LocalDate personalTrainingExpiresOn;

  @Column(nullable = false, length = 100)
  private String trainer;

  @Column(nullable = false, length = 12)
  private String status;

  protected MemberSelectedPlan() {}

  public MemberSelectedPlan(
      Long memberId,
      Long membershipPlanId,
      String membershipPlanName,
      BigDecimal membershipPlanAmount,
      Integer membershipPlanDurationMonths,
      Long personalTrainingPlanId,
      String personalTrainingPlanName,
      BigDecimal personalTrainingPlanAmount,
      Integer personalTrainingPlanDurationMonths,
      LocalDate startDate,
      LocalDate expiresOn,
      LocalDate personalTrainingExpiresOn,
      String trainer) {
    this.memberId = memberId;
    this.membershipPlanId = membershipPlanId;
    this.membershipPlanName = membershipPlanName;
    this.membershipPlanAmount = membershipPlanAmount;
    this.membershipPlanDurationMonths = membershipPlanDurationMonths;
    this.personalTrainingPlanId = personalTrainingPlanId;
    this.personalTrainingPlanName = personalTrainingPlanName;
    this.personalTrainingPlanAmount = personalTrainingPlanAmount;
    this.personalTrainingPlanDurationMonths = personalTrainingPlanDurationMonths;
    this.startDate = startDate;
    this.expiresOn = expiresOn;
    this.personalTrainingExpiresOn = personalTrainingExpiresOn;
    this.trainer = trainer;
    this.status = "PENDING";
  }

  public void markInactive() { this.status = "INACTIVE"; }
  public void markActive() { this.status = "ACTIVE"; }
  public void setOnboardingOverrides(LocalDate endDate, BigDecimal price, BigDecimal trainingPrice) {
    this.customEndDate = endDate;
    this.membershipPriceOverride = price;
    this.personalTrainingPriceOverride = trainingPrice;
  }
  public void setSessionCounts(Integer membershipSessions, Integer personalTrainingSessions) {
    this.membershipSessionCount = membershipSessions;
    this.personalTrainingSessionCount = personalTrainingSessions;
  }
  public Integer getMembershipSessionCount() { return membershipSessionCount; }
  public Integer getPersonalTrainingSessionCount() { return personalTrainingSessionCount; }

  public Long getId() { return id; }
  public Long getMemberId() { return memberId; }
  public Long getMembershipPlanId() { return membershipPlanId; }
  public String getMembershipPlanName() { return membershipPlanName; }
  public BigDecimal getMembershipPlanAmount() { return membershipPlanAmount; }
  public Integer getMembershipPlanDurationMonths() { return membershipPlanDurationMonths; }
  public Long getPersonalTrainingPlanId() { return personalTrainingPlanId; }
  public String getPersonalTrainingPlanName() { return personalTrainingPlanName; }
  public BigDecimal getPersonalTrainingPlanAmount() { return personalTrainingPlanAmount; }
  public Integer getPersonalTrainingPlanDurationMonths() { return personalTrainingPlanDurationMonths; }
  public LocalDate getStartDate() { return startDate; }
  public LocalDate getExpiresOn() { return expiresOn; }
  public LocalDate getCustomEndDate() { return customEndDate; }
  public BigDecimal getMembershipPriceOverride() { return membershipPriceOverride; }
  public BigDecimal getPersonalTrainingPriceOverride() { return personalTrainingPriceOverride; }
  public LocalDate getPersonalTrainingExpiresOn() { return personalTrainingExpiresOn; }
  public String getTrainer() { return trainer; }
  public String getStatus() { return status; }
}
