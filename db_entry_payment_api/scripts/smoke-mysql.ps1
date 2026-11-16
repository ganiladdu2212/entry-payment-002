param([string]$BaseUrl = 'http://localhost:8091/api/v1', [switch]$VerifyOnly)
$ErrorActionPreference = 'Stop'
function Assert-Check($Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
    Write-Output "PASS: $Message"
}
function Send-Json([string]$Path, $Body, [string]$Method = 'Post') {
    Invoke-RestMethod "$BaseUrl$Path" -Method $Method -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 8) -TimeoutSec 30
}
function Expect-Status([string]$Path, $Body, [int]$Expected) {
    $result = Invoke-WebRequest "$BaseUrl$Path" -Method Post -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 8) -SkipHttpErrorCheck -TimeoutSec 30
    Assert-Check ($result.StatusCode -eq $Expected) "$Path returns $Expected"
}
$login = Send-Json '/management/auth/verify-otp' @{ mobileNumber='9876501003'; otp='4271' }
$managementId = $login.id
Assert-Check ($managementId -gt 0) 'Management login'
$plans = Invoke-RestMethod "$BaseUrl/membership-plans?managementId=$managementId"
$ptPlans = Invoke-RestMethod "$BaseUrl/personal-trainings?managementId=$managementId"
$trainers = Invoke-RestMethod "$BaseUrl/trainers?managementId=$managementId"
$plan = $plans | Where-Object name -eq 'Monthly' | Select-Object -First 1
$pt = $ptPlans | Where-Object name -eq 'Quarterly' | Select-Object -First 1
$trainer = $trainers | Where-Object mobileNumber -eq '9876501001' | Select-Object -First 1
Assert-Check ($null -ne $plan -and $null -ne $pt -and $null -ne $trainer) 'Catalog and trainer persistence'
$photoPath = Join-Path $PSScriptRoot '..\..\db_entry_payment_ui\assets\images\people-fitness-hero.jpg'
$photo = 'data:image/jpeg;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($photoPath))
$list = Invoke-RestMethod "$BaseUrl/members?managementId=$managementId"
$member = $list.members | Where-Object whatsappNumber -eq '9000000001' | Select-Object -First 1
if (-not $VerifyOnly) {
    $today = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow, 'India Standard Time').ToString('yyyy-MM-dd')
    $body = @{ managementId=$managementId; fullName='QA MySQL Member'; whatsappNumber='9000000001'; membershipPlanId=$plan.id; personalTrainingPlanId=$pt.id; startDate=$today; trainer=$trainer.name; sendWhatsappWelcome=$false; photoData=$photo }
    if (-not $member) {
        $created = Send-Json '/members' $body
        Assert-Check ($created.status -eq 'PENDING') 'New onboarding remains pending before payment'
        $member = @{ id=$created.memberId }
    }
    Expect-Status '/members' $body 409
    Expect-Status '/management/auth/verify-otp' @{ mobileNumber='9876501003'; otp='0000' } 401
    $payments = Invoke-RestMethod "$BaseUrl/payments?managementId=$managementId&memberId=$($member.id)"
    $paymentBody = @{ managementId=$managementId; memberId=$member.id; membershipPlanId=$plan.id; personalTrainingPlanId=$pt.id; amount=9500; paymentMode='CASH'; utr='123456789012'; screenshotAttached=$true; screenshotData=$photo; sendReceipt=$true; capturedBy='QA MySQL Test' }
    if (-not ($payments | Where-Object paymentMode -eq 'CASH')) {
        $cash = Send-Json '/payments' $paymentBody
        Assert-Check ($null -eq $cash.utr -and $null -eq $cash.screenshotData -and -not $cash.receiptSent) 'Cash clears UPI fields and honors receipt opt-out'
    }
    $paymentBody.paymentMode='UPI'
    $paymentBody.screenshotAttached=$false
    $paymentBody.screenshotData=$null
    Expect-Status '/payments' $paymentBody 400
    $paymentBody.screenshotAttached=$true
    $paymentBody.screenshotData=$photo
    if (-not ($payments | Where-Object paymentMode -eq 'UPI')) {
        $upi = Send-Json '/payments' $paymentBody
        Assert-Check ($upi.screenshotData -ceq $photo) 'UPI screenshot round trip above 64KB'
        Assert-Check ([datetime]$upi.personalTrainingValidTill -gt [datetime]$upi.validTill) 'Separate membership and PT expiry'
    }
    $null = Send-Json "/members/$($member.id)/whatsapp-updates?managementId=$managementId" @{enabled=$true} 'Patch'
    $message = Send-Json '/whatsapp/messages' @{managementId=$managementId;memberId=$member.id;messageType='UPDATE';messageText='QA storage check only. No WhatsApp message sent.';initiatedBy='QA MySQL Test';automatic=$false}
    Assert-Check ($message.id -gt 0) 'WhatsApp handoff audit stored without sending a message'
    $null = Send-Json "/members/$($member.id)/whatsapp-updates?managementId=$managementId" @{enabled=$false} 'Patch'
    $null = Send-Json '/reminder-settings' @{managementId=$managementId;beforeDue=$false;onDue=$false;afterDue=$false;sendAt='09:00'} 'Put'
}
Assert-Check ($member.id -gt 0) 'QA member exists'
$detail = Invoke-RestMethod "$BaseUrl/members/$($member.id)?managementId=$managementId"
Assert-Check ($detail.photoData -ceq $photo) 'Member photo persistence above 64KB'
Assert-Check ($detail.status -eq 'ACTIVE') 'Paid membership is active'
$payments = Invoke-RestMethod "$BaseUrl/payments?managementId=$managementId&memberId=$($member.id)"
Assert-Check ($payments.Count -eq 2) 'Both test payments persist'
$storedUpi = $payments | Where-Object paymentMode -eq 'UPI'
Assert-Check ($storedUpi.screenshotData -ceq $photo) 'Payment screenshot persistence'
$trainerLogin = Send-Json '/app-auth/trainers/verify-otp' @{mobileNumber='9876501001';otp='4271'}
Assert-Check ($trainerLogin.role -eq 'TRAINER') 'Trainer login'
$memberLogin = Send-Json '/app-auth/members/verify-otp' @{mobileNumber='9000000001';otp='4271'}
Assert-Check ($memberLogin.role -eq 'MEMBER') 'Member login'
$reminders = Invoke-RestMethod "$BaseUrl/reminder-settings?managementId=$managementId"
Assert-Check ($reminders.sendAt -eq '09:00' -and -not $reminders.beforeDue) 'Reminder settings persistence'
Write-Output "Verified schema test data: managementId=$managementId memberId=$($member.id) payments=$($payments.Count)"
