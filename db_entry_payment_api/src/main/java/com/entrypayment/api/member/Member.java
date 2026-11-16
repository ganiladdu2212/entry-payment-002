package com.entrypayment.api.member;

import com.entrypayment.api.common.IstAuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "members")
public class Member extends IstAuditedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "management_id", nullable = false)
  private Long managementId;

  @Column(name = "onboarded_by", nullable = false, length = 100)
  private String onboardedBy;

  @Column(name = "full_name", nullable = false, length = 100)
  private String fullName;

  @Column(name = "whatsapp_number", nullable = false, length = 15)
  private String whatsappNumber;

  @Column(length = 150)
  private String email;

  @Column(name = "flat_house_number", length = 100)
  private String flatHouseNumber;

  @Column(name = "apartment_building", length = 150)
  private String apartmentBuilding;

  @Column(name = "street_area", length = 150)
  private String streetArea;

  @Column(length = 100)
  private String city;

  @Column(name = "pin_code", length = 12)
  private String pinCode;

  @Column(name = "emergency_contact_name", length = 100)
  private String emergencyContactName;

  @Column(name = "emergency_contact_mobile", length = 15)
  private String emergencyContactMobile;

  @Column(name = "send_whatsapp_welcome", nullable = false)
  private boolean sendWhatsappWelcome;

  @Lob
  @Column(name = "photo_data", columnDefinition = "LONGTEXT")
  private String photoData;

  protected Member() {}

  public Member(
      Long managementId,
      String onboardedBy,
      String fullName,
      String whatsappNumber,
      String email,
      String flatHouseNumber,
      String apartmentBuilding,
      String streetArea,
      String city,
      String pinCode,
      String emergencyContactName,
      String emergencyContactMobile,
      boolean sendWhatsappWelcome,
      String photoData) {
    this.managementId = managementId;
    this.onboardedBy = onboardedBy;
    this.fullName = fullName;
    this.whatsappNumber = whatsappNumber;
    this.email = emptyToNull(email);
    this.flatHouseNumber = emptyToNull(flatHouseNumber);
    this.apartmentBuilding = emptyToNull(apartmentBuilding);
    this.streetArea = emptyToNull(streetArea);
    this.city = emptyToNull(city);
    this.pinCode = emptyToNull(pinCode);
    this.emergencyContactName = emptyToNull(emergencyContactName);
    this.emergencyContactMobile = emptyToNull(emergencyContactMobile);
    this.sendWhatsappWelcome = sendWhatsappWelcome;
    this.photoData = emptyToNull(photoData);
  }

  private static String emptyToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  public Long getId() { return id; }
  public Long getManagementId() { return managementId; }
  public String getOnboardedBy() { return onboardedBy; }
  public String getFullName() { return fullName; }
  public String getWhatsappNumber() { return whatsappNumber; }
  public String getEmail() { return email; }
  public String getFlatHouseNumber() { return flatHouseNumber; }
  public String getApartmentBuilding() { return apartmentBuilding; }
  public String getStreetArea() { return streetArea; }
  public String getCity() { return city; }
  public String getPinCode() { return pinCode; }
  public String getEmergencyContactName() { return emergencyContactName; }
  public String getEmergencyContactMobile() { return emergencyContactMobile; }
  public boolean isSendWhatsappWelcome() { return sendWhatsappWelcome; }
  public void setSendWhatsappWelcome(boolean sendWhatsappWelcome) { this.sendWhatsappWelcome = sendWhatsappWelcome; }
  public String getPhotoData() { return photoData; }
}
