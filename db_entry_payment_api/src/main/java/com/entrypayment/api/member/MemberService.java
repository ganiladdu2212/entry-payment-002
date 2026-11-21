package com.entrypayment.api.member;

import com.entrypayment.api.catalog.MembershipPlan;
import com.entrypayment.api.catalog.MembershipPlanRepository;
import com.entrypayment.api.catalog.PersonalTraining;
import com.entrypayment.api.catalog.PersonalTrainingRepository;
import com.entrypayment.api.management.ManagementRepository;
import java.time.ZoneId;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MemberService {

  private final ManagementRepository managementRepository;
  private final MembershipPlanRepository membershipPlanRepository;
  private final PersonalTrainingRepository personalTrainingRepository;
  private final MemberRepository memberRepository;
  private final MemberSelectedPlanRepository memberSelectedPlanRepository;

  public MemberService(
      ManagementRepository managementRepository,
      MembershipPlanRepository membershipPlanRepository,
      PersonalTrainingRepository personalTrainingRepository,
      MemberRepository memberRepository,
      MemberSelectedPlanRepository memberSelectedPlanRepository) {
    this.managementRepository = managementRepository;
    this.membershipPlanRepository = membershipPlanRepository;
    this.personalTrainingRepository = personalTrainingRepository;
    this.memberRepository = memberRepository;
    this.memberSelectedPlanRepository = memberSelectedPlanRepository;
  }

  @Transactional
  public MemberCreatedResponse createMember(CreateMemberRequest request) {
    if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date cannot be before the start date.");
    }
    if (request.personalTrainingPriceOverride() != null && request.personalTrainingPlanId() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a personal-training plan before editing its price.");
    }
    if (memberRepository.findByWhatsappNumber(request.whatsappNumber()).isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "A member already uses this WhatsApp number.");
    }
    String managementName = managementRepository.findById(request.managementId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Management account not found."))
        .getName();
    String onboardedBy = request.onboardedBy() == null || request.onboardedBy().isBlank()
        ? managementName : request.onboardedBy().trim();
    MembershipPlan membershipPlan = membershipPlanRepository.findById(request.membershipPlanId())
        .filter(plan -> plan.getManagementId().equals(request.managementId()))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membership plan not found."));

    PersonalTraining personalTraining = null;
    if (request.personalTrainingPlanId() != null) {
      personalTraining = personalTrainingRepository.findById(request.personalTrainingPlanId())
          .filter(plan -> plan.getManagementId().equals(request.managementId()))
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Personal-training plan not found."));
    }

    Member member = memberRepository.save(new Member(
        request.managementId(), onboardedBy, request.fullName(), request.whatsappNumber(), request.email(),
        request.flatHouseNumber(), request.apartmentBuilding(), request.streetArea(), request.city(),
        request.pinCode(), request.emergencyContactName(), request.emergencyContactMobile(),
        request.sendWhatsappWelcome(), request.photoData()));

    // A member is pending until their first payment. The start date is shown while pending;
    // paid validity is calculated when payment is collected.
    LocalDate expiresOn = request.endDate() == null ? request.startDate() : request.endDate();
    LocalDate personalTrainingExpiresOn = personalTraining == null ? null : request.startDate();
    MemberSelectedPlan selectedPlan = memberSelectedPlanRepository.save(new MemberSelectedPlan(
        member.getId(), membershipPlan.getId(), membershipPlan.getName(), request.membershipPriceOverride() == null ? membershipPlan.getAmount() : request.membershipPriceOverride(),
        membershipPlan.getDurationMonths(),
        personalTraining == null ? null : personalTraining.getId(),
        personalTraining == null ? null : personalTraining.getName(),
        personalTraining == null ? null : request.personalTrainingPriceOverride() == null ? personalTraining.getAmount() : request.personalTrainingPriceOverride(),
        personalTraining == null ? null : personalTraining.getDurationMonths(),
        request.startDate(), expiresOn, personalTrainingExpiresOn, request.trainer()));
    selectedPlan.setSessionCounts(membershipPlan.getSessionCount(), personalTraining == null ? null : personalTraining.getSessionCount());
    selectedPlan.setOnboardingOverrides(request.endDate(), request.membershipPriceOverride(), request.personalTrainingPriceOverride());

    return new MemberCreatedResponse(
        member.getId(), selectedPlan.getId(), selectedPlan.getStatus(), expiresOn, member.getCreatedDate());
  }

  @Transactional
  public MemberListResponse getMembers(Long managementId) {
    requireManagement(managementId);
    deactivateExpiredPlans();

    List<Member> members = memberRepository.findAllByManagementIdOrderByCreatedDateDescIdDesc(managementId);
    Map<Long, MemberSelectedPlan> latestPlanByMemberId = memberSelectedPlanRepository
        .findAllByMemberIdIn(members.stream().map(Member::getId).toList())
        .stream()
        .collect(java.util.stream.Collectors.toMap(
            MemberSelectedPlan::getMemberId,
            selectedPlan -> selectedPlan,
            (existing, candidate) -> existing.getCreatedDate().isAfter(candidate.getCreatedDate())
                ? existing : candidate));

    LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
    List<MemberListItemResponse> list = members.stream()
        .filter(member -> latestPlanByMemberId.containsKey(member.getId()))
        .map(member -> memberListItem(member, latestPlanByMemberId.get(member.getId()), today))
        .toList();

    int overdue = (int) list.stream().filter(item -> item.status().equals("OVERDUE")).count();
    int dueSoon = (int) list.stream().filter(item -> item.status().equals("DUE_SOON") || item.status().equals("PENDING")).count();
    int active = (int) list.stream().filter(item -> item.status().equals("ACTIVE")).count();
    return new MemberListResponse(list.size(), dueSoon, overdue, active, list);
  }

  @Transactional
  public MemberDetailResponse getMemberDetail(Long managementId, Long memberId) {
    requireManagement(managementId);
    deactivateExpiredPlans();
    Member member = memberRepository.findById(memberId)
        .filter(foundMember -> foundMember.getManagementId().equals(managementId))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found."));
    MemberSelectedPlan selectedPlan = latestPlanFor(memberId);
    LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));

    return new MemberDetailResponse(
        member.getId(), member.getFullName(), member.getWhatsappNumber(), member.getPhotoData(), member.getEmail(),
        member.getFlatHouseNumber(), member.getApartmentBuilding(), member.getStreetArea(),
        member.getCity(), member.getPinCode(), member.getEmergencyContactName(),
        member.getEmergencyContactMobile(), member.isSendWhatsappWelcome(), member.getCreatedDate(), member.getOnboardedBy(),
        selectedPlan.getMembershipPlanId(), selectedPlan.getMembershipPlanName(), selectedPlan.getMembershipPlanAmount(),
        selectedPlan.getMembershipPlanDurationMonths(), selectedPlan.getPersonalTrainingPlanId(), selectedPlan.getPersonalTrainingPlanName(),
        selectedPlan.getPersonalTrainingPlanAmount(), selectedPlan.getPersonalTrainingPlanDurationMonths(),
        selectedPlan.getStartDate(), selectedPlan.getExpiresOn(), selectedPlan.getPersonalTrainingExpiresOn(), selectedPlan.getTrainer(),
        statusFor(selectedPlan, today), selectedPlan.getMembershipSessionCount(), selectedPlan.getPersonalTrainingSessionCount(),
        selectedPlan.getCustomEndDate(), selectedPlan.getMembershipPriceOverride(), selectedPlan.getPersonalTrainingPriceOverride());
  }

  @Transactional
  public MemberDetailResponse updateWhatsappUpdates(Long managementId, Long memberId, boolean enabled) {
    requireManagement(managementId);
    Member member = memberRepository.findById(memberId)
        .filter(foundMember -> foundMember.getManagementId().equals(managementId))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found."));
    member.setSendWhatsappWelcome(enabled);
    memberRepository.save(member);
    return getMemberDetail(managementId, memberId);
  }

  @Scheduled(cron = "0 0 * * * *", zone = "Asia/Kolkata")
  @Transactional
  public void deactivateExpiredPlans() {
    memberSelectedPlanRepository
        .findAllByStatusAndExpiresOnBefore("ACTIVE", LocalDate.now(ZoneId.of("Asia/Kolkata")))
        .forEach(MemberSelectedPlan::markInactive);
  }

  private MemberListItemResponse memberListItem(
      Member member, MemberSelectedPlan selectedPlan, LocalDate today) {
    String status = statusFor(selectedPlan, today);
    return new MemberListItemResponse(
        member.getId(), member.getFullName(), member.getWhatsappNumber(), member.getPhotoData(),
        selectedPlan.getMembershipPlanName(), selectedPlan.getPersonalTrainingPlanId() != null,
        selectedPlan.getExpiresOn(), status);
  }

  private MemberSelectedPlan latestPlanFor(Long memberId) {
    return memberSelectedPlanRepository.findAllByMemberIdIn(List.of(memberId)).stream()
        .max(java.util.Comparator.comparing(MemberSelectedPlan::getCreatedDate))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member subscription not found."));
  }

  private String statusFor(MemberSelectedPlan selectedPlan, LocalDate today) {
    if (selectedPlan.getStatus().equals("PENDING")) {
      return "PENDING";
    }
    LocalDate expiresOn = selectedPlan.getExpiresOn();
    if (expiresOn.isBefore(today)) {
      return "OVERDUE";
    }
    // The expiry day is still active; only the next 1-7 days are due soon.
    if (expiresOn.isAfter(today) && !expiresOn.isAfter(today.plusDays(7))) {
      return "DUE_SOON";
    }
    return "ACTIVE";
  }

  private void requireManagement(Long managementId) {
    if (!managementRepository.existsById(managementId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Management account not found.");
    }
  }
}
