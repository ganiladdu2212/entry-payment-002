package com.entrypayment.api.member;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/members")
@Tag(name = "Members", description = "Member onboarding and subscription selection")
public class MemberController {

  private final MemberService memberService;

  public MemberController(MemberService memberService) {
    this.memberService = memberService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Onboard a member and save a snapshot of selected plans")
  public MemberCreatedResponse createMember(@Valid @RequestBody CreateMemberRequest request) {
    com.entrypayment.api.config.GymAccess.require(request.managementId());
    return memberService.createMember(request);
  }

  @GetMapping
  @Operation(summary = "Get members and membership-status counts for one management account")
  public MemberListResponse getMembers(@RequestParam @Positive Long managementId) {
    com.entrypayment.api.config.GymAccess.require(managementId);
    return memberService.getMembers(managementId);
  }

  @GetMapping("/{memberId}")
  @Operation(summary = "Get one member and their latest selected subscription")
  public MemberDetailResponse getMemberDetail(
      @RequestParam @Positive Long managementId,
      @PathVariable @Positive Long memberId) {
    com.entrypayment.api.config.GymAccess.require(managementId);
    return memberService.getMemberDetail(managementId, memberId);
  }

  @PatchMapping("/{memberId}/whatsapp-updates")
  @Operation(summary = "Enable or disable member WhatsApp updates")
  public MemberDetailResponse updateWhatsappUpdates(
      @RequestParam @Positive Long managementId,
      @PathVariable @Positive Long memberId,
      @Valid @RequestBody WhatsappUpdatesRequest request) {
    com.entrypayment.api.config.GymAccess.require(managementId);
    return memberService.updateWhatsappUpdates(managementId, memberId, request.enabled());
  }
}
