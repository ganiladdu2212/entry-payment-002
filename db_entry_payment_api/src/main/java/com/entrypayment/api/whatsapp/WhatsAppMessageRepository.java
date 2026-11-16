package com.entrypayment.api.whatsapp;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WhatsAppMessageRepository extends JpaRepository<WhatsAppMessage, Long> {
  List<WhatsAppMessage> findAllByManagementIdOrderByCreatedDateDescIdDesc(Long managementId);
  List<WhatsAppMessage> findAllByManagementIdAndMemberIdOrderByCreatedDateDescIdDesc(Long managementId, Long memberId);
}
