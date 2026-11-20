package com.entrypayment.api.management;

import com.entrypayment.api.common.IstAuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "management",
    uniqueConstraints = @UniqueConstraint(name = "uk_management_mobile_number", columnNames = "mobile_number"))
public class Management extends IstAuditedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(name = "mobile_number", nullable = false, length = 15)
  private String mobileNumber;

  // Null means this account is the gym's primary management account.
  @Column(name = "gym_management_id")
  private Long gymManagementId;

  /** BCrypt hash once a management user configures a password; never store a plain password. */
  @Column(name = "pwd", length = 255)
  private String pwd;

  /** Directly configured OTP for accounts that have no password yet. */
  @Column(name = "otp", length = 6)
  private String otp;

  @Column(name = "fcm_id", length = 512)
  private String fcmId;

  protected Management() {}

  public Management(String name, String mobileNumber, String pwd, String otp, String fcmId) {
    this.name = name;
    this.mobileNumber = mobileNumber;
    this.pwd = pwd;
    this.otp = otp;
    this.fcmId = fcmId;
  }

  public Long getId() { return id; }
  public String getName() { return name; }
  public String getMobileNumber() { return mobileNumber; }
  public Long getGymManagementId() { return gymManagementId; }
  public String getPwd() { return pwd; }
  public String getOtp() { return otp; }
  public String getFcmId() { return fcmId; }
}
