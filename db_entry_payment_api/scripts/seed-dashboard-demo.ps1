param([string]$BaseUrl = 'http://localhost:8090/api/v1', [datetime]$ReferenceDate = [datetime]'2026-11-05')
$ErrorActionPreference = 'Stop'
function Send-Json([string]$Path, $Body) {
    Invoke-RestMethod "$BaseUrl$Path" -Method Post -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 8)
}
$login = Send-Json '/management/auth/verify-otp' @{mobileNumber='9876501003';otp='4271'}
$managementId = [long]$login.id
$membership = @(
    @{name='Monthly';amount=1500;durationMonths=1},
    @{name='Quarterly';amount=4000;durationMonths=3},
    @{name='Half-yearly';amount=7500;durationMonths=6},
    @{name='Annual';amount=13000;durationMonths=12}
)
$personalTraining = @(
    @{name='Monthly';amount=3000;durationMonths=1},
    @{name='Quarterly';amount=8000;durationMonths=3},
    @{name='Half-yearly';amount=15000;durationMonths=6},
    @{name='Annual';amount=28000;durationMonths=12}
)
foreach ($catalog in @(@{path='/membership-plans';items=$membership},@{path='/personal-trainings';items=$personalTraining})) {
    $existing = Invoke-RestMethod "$BaseUrl$($catalog.path)?managementId=$managementId"
    foreach ($item in $catalog.items) {
        if (-not ($existing | Where-Object name -eq $item.name)) {
            $item.managementId=$managementId
            $null = Send-Json $catalog.path $item
            Write-Output "Added $($item.name)"
        }
    }
}
$plans = Invoke-RestMethod "$BaseUrl/membership-plans?managementId=$managementId"
$monthly = $plans | Where-Object name -eq 'Monthly' | Select-Object -First 1
$ptPlans = Invoke-RestMethod "$BaseUrl/personal-trainings?managementId=$managementId"
$sessionPack = $ptPlans | Where-Object name -eq 'Monthly' | Select-Object -First 1
$photo = 'data:image/jpeg;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot '..\..\db_entry_payment_ui\assets\images\people-fitness-hero.jpg')))
$fixtures = @(
    @{name='QA Overdue One';phone='9000000011';days=-2;mode='CASH';pt=$false},
    @{name='QA Overdue Two';phone='9000000012';days=-4;mode='UPI';pt=$false},
    @{name='QA Due Soon One';phone='9000000013';days=3;mode='CASH';pt=$true},
    @{name='QA Due Soon Two';phone='9000000014';days=3;mode='UPI';pt=$false}
)
$dbSettings = ConvertFrom-StringData (Get-Content (Join-Path $PSScriptRoot '..\.env') -Raw)
$env:MYSQL_PWD = $dbSettings.DB_PASSWORD
try {
    foreach ($fixture in $fixtures) {
        $list = Invoke-RestMethod "$BaseUrl/members?managementId=$managementId"
        $member = $list.members | Where-Object whatsappNumber -eq $fixture.phone | Select-Object -First 1
        if ($member -and $member.fullName -ne $fixture.name) { throw "Phone collision for $($fixture.name); existing record preserved." }
        if (-not $member) {
            $body = @{managementId=$managementId;fullName=$fixture.name;whatsappNumber=$fixture.phone;membershipPlanId=$monthly.id;startDate=$ReferenceDate.ToString('yyyy-MM-dd');trainer='Ahmed';sendWhatsappWelcome=$false;photoData=$photo;onboardedBy='QA Dashboard Demo'}
            if ($fixture.pt) { $body.personalTrainingPlanId=$sessionPack.id }
            $created = Send-Json '/members' $body
            $member = @{id=$created.memberId}
        }
        $memberId = [long]$member.id
        $history = Invoke-RestMethod "$BaseUrl/payments?managementId=$managementId&memberId=$memberId"
        $payment = $history | Where-Object capturedBy -eq 'QA Dashboard Demo' | Select-Object -First 1
        if (-not $payment) {
            $body = @{managementId=$managementId;memberId=$memberId;membershipPlanId=$monthly.id;amount=$monthly.amount;paymentMode=$fixture.mode;sendReceipt=$false;capturedBy='QA Dashboard Demo';screenshotAttached=$false}
            if ($fixture.pt) { $body.personalTrainingPlanId=$sessionPack.id; $body.amount += $sessionPack.amount }
            if ($fixture.mode -eq 'UPI') { $body.screenshotAttached=$true; $body.screenshotData=$photo; $body.utr='123456789012' }
            $payment = Send-Json '/payments' $body
        }
        $paymentId = [long]$payment.id
        $selectedPlanId = [long]$payment.memberSelectedPlanId
        $expires = $ReferenceDate.AddDays($fixture.days).ToString('yyyy-MM-dd')
        $starts = $ReferenceDate.AddDays($fixture.days).AddMonths(-1).ToString('yyyy-MM-dd')
        # Backdate only these explicitly named synthetic fixtures, never unrelated data.
        $sql = "UPDATE member_selected_plans s JOIN members m ON m.id=s.member_id SET s.start_date='$starts',s.expires_on='$expires',s.personal_training_expires_on=IF(s.personal_training_plan_id IS NULL,NULL,'$expires'),s.status='ACTIVE' WHERE s.id=$selectedPlanId AND m.id=$memberId AND m.full_name='$($fixture.name)' AND m.whatsapp_number='$($fixture.phone)'; UPDATE payments SET created_date='$starts 09:00:00' WHERE id=$paymentId AND member_id=$memberId AND captured_by='QA Dashboard Demo';"
        & 'C:\Program Files\MySQL\MySQL Server 26.7\bin\mysql.exe' --host=$($dbSettings.DB_HOST) --user=$($dbSettings.DB_USERNAME) --database=entry_payment_002 --execute=$sql
        if ($LASTEXITCODE -ne 0) { throw 'Failed to set synthetic fixture dates.' }
        Write-Output "$($fixture.name): expires $expires, $($fixture.mode), memberId=$memberId"
    }
} finally { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
$result = Invoke-RestMethod "$BaseUrl/members?managementId=$managementId"
$result | Select-Object totalCount,activeCount,dueSoonCount,overdueCount | Format-Table
$result.members | Select-Object fullName,status,expiresOn | Format-Table
if (($result.members | Where-Object {$_.fullName -like 'QA Overdue *' -and $_.status -eq 'OVERDUE'}).Count -ne 2) { throw 'Expected two overdue demo members.' }
if (($result.members | Where-Object {$_.fullName -like 'QA Due Soon *' -and $_.status -eq 'DUE_SOON'}).Count -ne 2) { throw 'Expected two due-soon demo members.' }
