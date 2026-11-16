package com.entrypayment.api.trainer;

import com.entrypayment.api.common.IstAuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "trainers")
public class Trainer extends IstAuditedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "management_id", nullable = false)
  private Long managementId;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(name = "mobile_number", length = 15)
  private String mobileNumber;

  @Column(name = "otp", length = 6)
  private String otp;

  protected Trainer() {}

  public Trainer(Long managementId, String name, String mobileNumber) {
    this.managementId = managementId;
    this.name = name.trim();
    this.mobileNumber = mobileNumber == null || mobileNumber.isBlank() ? null : mobileNumber.trim();
  }

  public Long getId() { return id; }
  public Long getManagementId() { return managementId; }
  public String getName() { return name; }
  public String getMobileNumber() { return mobileNumber; }
  public String getOtp() { return otp; }
}
