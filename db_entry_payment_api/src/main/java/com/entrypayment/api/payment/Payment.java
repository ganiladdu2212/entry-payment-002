package com.entrypayment.api.payment;

import com.entrypayment.api.common.IstAuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "payments")
public class Payment extends IstAuditedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "management_id", nullable = false)
  private Long managementId;

  @Column(name = "member_id", nullable = false)
  private Long memberId;

  @Column(name = "member_selected_plan_id", nullable = false)
  private Long memberSelectedPlanId;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal amount;

  @Column(name = "payment_mode", nullable = false, length = 10)
  private String paymentMode;

  @Column(length = 20)
  private String utr;

  @Column(name = "screenshot_attached", nullable = false)
  private boolean screenshotAttached;

  @Lob
  @Column(name = "screenshot_data", columnDefinition = "LONGTEXT")
  private String screenshotData;

  @Column(name = "receipt_sent", nullable = false)
  private boolean receiptSent;

  @Column(name = "captured_by", nullable = false, length = 100)
  private String capturedBy;

  protected Payment() {}

  public Payment(
      Long managementId, Long memberId, Long memberSelectedPlanId, BigDecimal amount,
      String paymentMode, String utr, boolean screenshotAttached, boolean receiptSent,
      String screenshotData, String capturedBy) {
    this.managementId = managementId;
    this.memberId = memberId;
    this.memberSelectedPlanId = memberSelectedPlanId;
    this.amount = amount;
    this.paymentMode = paymentMode;
    this.utr = utr == null || utr.isBlank() ? null : utr.trim();
    this.screenshotAttached = screenshotAttached;
    this.screenshotData = screenshotData;
    this.receiptSent = receiptSent;
    this.capturedBy = capturedBy;
  }

  public Long getId() { return id; }
  public Long getManagementId() { return managementId; }
  public Long getMemberId() { return memberId; }
  public Long getMemberSelectedPlanId() { return memberSelectedPlanId; }
  public BigDecimal getAmount() { return amount; }
  public String getPaymentMode() { return paymentMode; }
  public String getUtr() { return utr; }
  public boolean isScreenshotAttached() { return screenshotAttached; }
  public String getScreenshotData() { return screenshotData; }
  public boolean isReceiptSent() { return receiptSent; }
  public String getCapturedBy() { return capturedBy; }
}
