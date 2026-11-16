package com.entrypayment.api.whatsapp;

import com.entrypayment.api.management.ManagementRepository;
import com.entrypayment.api.member.Member;
import com.entrypayment.api.member.MemberRepository;
import com.entrypayment.api.member.MemberSelectedPlan;
import com.entrypayment.api.member.MemberSelectedPlanRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WhatsAppMessageService {
  private final ManagementRepository managementRepository;
  private final MemberRepository memberRepository;
  private final MemberSelectedPlanRepository selectedPlanRepository;
  private final WhatsAppMessageRepository messageRepository;

  public WhatsAppMessageService(ManagementRepository managementRepository, MemberRepository memberRepository,
      MemberSelectedPlanRepository selectedPlanRepository, WhatsAppMessageRepository messageRepository) {
    this.managementRepository = managementRepository;
    this.memberRepository = memberRepository;
    this.selectedPlanRepository = selectedPlanRepository;
    this.messageRepository = messageRepository;
  }

  @Transactional
  public WhatsAppMessageResponse prepareMessage(WhatsAppMessageRequest request) {
    requireManagement(request.managementId());
    Member member = requireMember(request.managementId(), request.memberId());
    return toResponse(messageRepository.save(new WhatsAppMessage(request.managementId(), member.getId(),
        member.getFullName(), member.getWhatsappNumber(), type(request.messageType()), request.messageText().trim(),
        request.initiatedBy().trim(), request.automatic())));
  }

  @Transactional
  public List<WhatsAppMessageResponse> prepareBroadcast(WhatsAppBroadcastRequest request) {
    requireManagement(request.managementId());
    String text = request.messageText().trim();
    List<Member> candidates = memberRepository.findAllByManagementIdOrderByCreatedDateDescIdDesc(request.managementId());
    Map<Long, MemberSelectedPlan> latestPlans = selectedPlanRepository.findAllByMemberIdIn(candidates.stream().map(Member::getId).toList())
        .stream().collect(java.util.stream.Collectors.toMap(MemberSelectedPlan::getMemberId, plan -> plan,
            (left, right) -> left.getCreatedDate().isAfter(right.getCreatedDate()) ? left : right));
    boolean dueAudience = "DUE_OR_OVERDUE".equalsIgnoreCase(request.audience());
    LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
    return candidates.stream()
        .filter(Member::isSendWhatsappWelcome)
        .filter(member -> !dueAudience || needsReminder(latestPlans.get(member.getId()), today))
        .map(member -> messageRepository.save(new WhatsAppMessage(request.managementId(), member.getId(),
            member.getFullName(), member.getWhatsappNumber(), type(request.messageType()), text, request.initiatedBy().trim(), false)))
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<WhatsAppMessageResponse> getMessages(Long managementId, Long memberId) {
    requireManagement(managementId);
    if (memberId != null) requireMember(managementId, memberId);
    List<WhatsAppMessage> messages = memberId == null
        ? messageRepository.findAllByManagementIdOrderByCreatedDateDescIdDesc(managementId)
        : messageRepository.findAllByManagementIdAndMemberIdOrderByCreatedDateDescIdDesc(managementId, memberId);
    return messages.stream().map(this::toResponse).toList();
  }

  private void requireManagement(Long managementId) {
    if (!managementRepository.existsById(managementId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Management account not found.");
    }
  }

  private Member requireMember(Long managementId, Long memberId) {
    Member member = memberRepository.findById(memberId)
        .filter(found -> found.getManagementId().equals(managementId))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found."));
    if (!member.isSendWhatsappWelcome()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This member has turned WhatsApp updates off.");
    }
    return member;
  }

  private boolean needsReminder(MemberSelectedPlan plan, LocalDate today) {
    if (plan == null || !"ACTIVE".equals(plan.getStatus())) return true;
    return !plan.getExpiresOn().isAfter(today.plusDays(7));
  }

  private String type(String value) {
    String normalized = value.trim().toUpperCase();
    if (!List.of("WELCOME", "RECEIPT", "REMINDER", "UPDATE").contains(normalized)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported WhatsApp message type.");
    }
    return normalized;
  }

  private WhatsAppMessageResponse toResponse(WhatsAppMessage message) {
    return new WhatsAppMessageResponse(message.getId(), message.getMemberId(), message.getRecipientName(),
        message.getRecipientPhone(), message.getMessageType(), message.getMessageText(), message.getInitiatedBy(),
        message.isAutomatic(), message.getHandoffStatus(), message.getCreatedDate());
  }
}
