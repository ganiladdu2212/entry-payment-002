package com.entrypayment.api.whatsapp;

import com.entrypayment.api.common.IstAuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

/** A locally auditable WhatsApp handoff. Delivery itself remains controlled by WhatsApp. */
@Entity
@Table(name = "whatsapp_messages")
public class WhatsAppMessage extends IstAuditedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "management_id", nullable = false)
  private Long managementId;

  @Column(name = "member_id")
  private Long memberId;

  @Column(name = "recipient_name", nullable = false, length = 100)
  private String recipientName;

  @Column(name = "recipient_phone", nullable = false, length = 15)
  private String recipientPhone;

  @Column(name = "message_type", nullable = false, length = 20)
  private String messageType;

  @Lob
  @Column(name = "message_text", nullable = false, columnDefinition = "TEXT")
  private String messageText;

  @Column(name = "initiated_by", nullable = false, length = 100)
  private String initiatedBy;

  @Column(name = "automatic", nullable = false)
  private boolean automatic;

  @Column(name = "handoff_status", nullable = false, length = 20)
  private String handoffStatus;

  protected WhatsAppMessage() {}

  public WhatsAppMessage(Long managementId, Long memberId, String recipientName, String recipientPhone,
      String messageType, String messageText, String initiatedBy, boolean automatic) {
    this.managementId = managementId;
    this.memberId = memberId;
    this.recipientName = recipientName;
    this.recipientPhone = recipientPhone;
    this.messageType = messageType;
    this.messageText = messageText;
    this.initiatedBy = initiatedBy;
    this.automatic = automatic;
    this.handoffStatus = "PREPARED";
  }

  public Long getId() { return id; }
  public Long getManagementId() { return managementId; }
  public Long getMemberId() { return memberId; }
  public String getRecipientName() { return recipientName; }
  public String getRecipientPhone() { return recipientPhone; }
  public String getMessageType() { return messageType; }
  public String getMessageText() { return messageText; }
  public String getInitiatedBy() { return initiatedBy; }
  public boolean isAutomatic() { return automatic; }
  public String getHandoffStatus() { return handoffStatus; }
}
