package com.entrypayment.api.payment;

import com.entrypayment.api.catalog.MembershipPlan;
import com.entrypayment.api.catalog.MembershipPlanRepository;
import com.entrypayment.api.catalog.PersonalTraining;
import com.entrypayment.api.catalog.PersonalTrainingRepository;
import com.entrypayment.api.management.Management;
import com.entrypayment.api.management.ManagementRepository;
import com.entrypayment.api.member.Member;
import com.entrypayment.api.member.MemberRepository;
import com.entrypayment.api.member.MemberSelectedPlan;
import com.entrypayment.api.member.MemberSelectedPlanRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PaymentService {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private final ManagementRepository managementRepository;
  private final MemberRepository memberRepository;
  private final MemberSelectedPlanRepository selectedPlanRepository;
  private final MembershipPlanRepository membershipPlanRepository;
  private final PersonalTrainingRepository personalTrainingRepository;
  private final PaymentRepository paymentRepository;

  public PaymentService(
      ManagementRepository managementRepository,
      MemberRepository memberRepository,
      MemberSelectedPlanRepository selectedPlanRepository,
      MembershipPlanRepository membershipPlanRepository,
      PersonalTrainingRepository personalTrainingRepository,
      PaymentRepository paymentRepository) {
    this.managementRepository = managementRepository;
    this.memberRepository = memberRepository;
    this.selectedPlanRepository = selectedPlanRepository;
    this.membershipPlanRepository = membershipPlanRepository;
    this.personalTrainingRepository = personalTrainingRepository;
    this.paymentRepository = paymentRepository;
  }

  @Transactional
  public PaymentResponse createPayment(CreatePaymentRequest request) {
    Management management = requireManagement(request.managementId());
    Member member = memberRepository.findById(request.memberId())
        .filter(found -> found.getManagementId().equals(request.managementId()))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found."));
    MembershipPlan membership = membershipPlanRepository.findById(request.membershipPlanId())
        .filter(plan -> plan.getManagementId().equals(request.managementId()))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membership plan not found."));

    PersonalTraining personalTraining = null;
    if (request.personalTrainingPlanId() != null) {
      personalTraining = personalTrainingRepository.findById(request.personalTrainingPlanId())
          .filter(plan -> plan.getManagementId().equals(request.managementId()))
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Personal-training plan not found."));
    }
    String mode = request.paymentMode().trim().toUpperCase();
    if (!mode.equals("UPI") && !mode.equals("CASH")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment mode must be UPI or CASH.");
    }
    String utr = request.utr() == null ? "" : request.utr().replaceAll("\\s", "");
    if (mode.equals("UPI") && (!request.screenshotAttached() || request.screenshotData() == null || request.screenshotData().isBlank())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attach the UPI payment screenshot before saving.");
    }
    if (!utr.isBlank() && !utr.matches("\\d{12}")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The UTR should be exactly 12 digits.");
    }

    MemberSelectedPlan latestPlan = latestPlanFor(member.getId());
    LocalDate today = LocalDate.now(IST);
    LocalDate startDate = paymentRepository.existsByMemberSelectedPlanId(latestPlan.getId())
        && latestPlan.getExpiresOn().isAfter(today)
        ? latestPlan.getExpiresOn()
        : latestPlan.getStartDate().isAfter(today) ? latestPlan.getStartDate() : today;
    LocalDate expiresOn = startDate.plusMonths(membership.getDurationMonths());
    LocalDate personalTrainingExpiresOn = personalTraining == null ? null : startDate.plusMonths(personalTraining.getDurationMonths());
    latestPlan.markInactive();
    selectedPlanRepository.save(latestPlan);
    MemberSelectedPlan paidPlan = new MemberSelectedPlan(
        member.getId(), membership.getId(), membership.getName(), membership.getAmount(),
        membership.getDurationMonths(), personalTraining == null ? null : personalTraining.getId(),
        personalTraining == null ? null : personalTraining.getName(),
        personalTraining == null ? null : personalTraining.getAmount(),
        personalTraining == null ? null : personalTraining.getDurationMonths(),
        startDate, expiresOn, personalTrainingExpiresOn, latestPlan.getTrainer());
    paidPlan.markActive();
    paidPlan.setSessionCounts(membership.getSessionCount(), personalTraining == null ? null : personalTraining.getSessionCount());
    selectedPlanRepository.save(paidPlan);

    String capturedBy = request.capturedBy() == null || request.capturedBy().isBlank()
        ? management.getName() : request.capturedBy().trim();
    Payment payment = paymentRepository.save(new Payment(
        request.managementId(), member.getId(), paidPlan.getId(), request.amount(), mode,
        mode.equals("UPI") ? utr : null, mode.equals("UPI") && request.screenshotAttached(),
        request.sendReceipt() && member.isSendWhatsappWelcome(), mode.equals("UPI") ? request.screenshotData() : null,
        capturedBy));
    return toResponse(payment, paidPlan);
  }

  @Transactional(readOnly = true)
  public List<PaymentResponse> getPayments(Long managementId, Long memberId) {
    requireManagement(managementId);
    if (memberId != null) {
      memberRepository.findById(memberId)
          .filter(member -> member.getManagementId().equals(managementId))
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found."));
    }
    List<Payment> payments = memberId == null
        ? paymentRepository.findAllByManagementIdOrderByCreatedDateDescIdDesc(managementId)
        : paymentRepository.findAllByManagementIdAndMemberIdOrderByCreatedDateDescIdDesc(managementId, memberId);
    return payments
        .stream().map(payment -> toResponse(payment, selectedPlanRepository.findById(payment.getMemberSelectedPlanId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment plan not found."))))
        .toList();
  }

  private PaymentResponse toResponse(Payment payment, MemberSelectedPlan plan) {
    return new PaymentResponse(payment.getId(), payment.getMemberId(), payment.getMemberSelectedPlanId(),
        plan.getMembershipPlanName(), plan.getPersonalTrainingPlanName(), payment.getAmount(),
        payment.getPaymentMode(), payment.getUtr(), payment.isScreenshotAttached(), payment.getScreenshotData(), payment.isReceiptSent(),
        payment.getCapturedBy(), plan.getExpiresOn(), plan.getPersonalTrainingExpiresOn(), payment.getCreatedDate());
  }

  private MemberSelectedPlan latestPlanFor(Long memberId) {
    return selectedPlanRepository.findAllByMemberIdIn(List.of(memberId)).stream()
        .max(Comparator.comparing(MemberSelectedPlan::getCreatedDate))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member subscription not found."));
  }

  private Management requireManagement(Long managementId) {
    return managementRepository.findById(managementId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Management account not found."));
  }
}
