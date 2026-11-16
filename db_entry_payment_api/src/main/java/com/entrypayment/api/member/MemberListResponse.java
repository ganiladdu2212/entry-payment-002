package com.entrypayment.api.member;

import java.util.List;

public record MemberListResponse(
    int totalCount,
    int dueSoonCount,
    int overdueCount,
    int activeCount,
    List<MemberListItemResponse> members) {}
