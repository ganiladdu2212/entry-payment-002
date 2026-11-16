package com.entrypayment.api.whatsapp;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/whatsapp")
@Tag(name = "WhatsApp", description = "Records message handoffs before opening WhatsApp on the device")
public class WhatsAppMessageController {
  private final WhatsAppMessageService messageService;

  public WhatsAppMessageController(WhatsAppMessageService messageService) {
    this.messageService = messageService;
  }

  @PostMapping("/messages")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Prepare a member WhatsApp message and retain an IST audit record")
  public WhatsAppMessageResponse prepareMessage(@Valid @RequestBody WhatsAppMessageRequest request) {
    com.entrypayment.api.config.GymAccess.require(request.managementId());
    return messageService.prepareMessage(request);
  }

  @PostMapping("/broadcasts")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Prepare one update for every member who has WhatsApp updates enabled")
  public List<WhatsAppMessageResponse> prepareBroadcast(@Valid @RequestBody WhatsAppBroadcastRequest request) {
    com.entrypayment.api.config.GymAccess.require(request.managementId());
    return messageService.prepareBroadcast(request);
  }

  @GetMapping("/messages")
  @Operation(summary = "Get prepared WhatsApp messages")
  public List<WhatsAppMessageResponse> getMessages(@RequestParam @Positive Long managementId,
      @RequestParam(required = false) @Positive Long memberId) {
    com.entrypayment.api.config.GymAccess.require(managementId);
    return messageService.getMessages(managementId, memberId);
  }
}
