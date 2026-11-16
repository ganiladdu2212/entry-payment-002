package com.entrypayment.api.payment;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payments", description = "Membership payment collection and payment history")
public class PaymentController {

  private final PaymentService paymentService;

  public PaymentController(PaymentService paymentService) {
    this.paymentService = paymentService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Save a UPI or cash membership payment")
  public PaymentResponse createPayment(@Valid @RequestBody CreatePaymentRequest request) {
    com.entrypayment.api.config.GymAccess.require(request.managementId());
    return paymentService.createPayment(request);
  }

  @GetMapping
  @Operation(summary = "Get payment history for one member")
  public List<PaymentResponse> getPayments(
      @RequestParam @Positive Long managementId,
      @RequestParam(required = false) @Positive Long memberId) {
    com.entrypayment.api.config.GymAccess.require(managementId);
    return paymentService.getPayments(managementId, memberId);
  }
}
