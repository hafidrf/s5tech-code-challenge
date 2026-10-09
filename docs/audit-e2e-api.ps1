$ErrorActionPreference = 'Stop'
$base = 'http://localhost:4000'
$results = @()

function Check($id, $cond, $actual) {
  $script:results += [pscustomobject]@{ Id = $id; Result = $(if ($cond) { 'PASS' } else { 'FAIL' }); Actual = $actual }
}

function J($method, $path, $body) {
  try {
    $p = @{ Method = $method; Uri = "$base$path"; UseBasicParsing = $true }
    if ($null -ne $body) { $p.Body = $body; $p.ContentType = 'application/json' }
    $r = Invoke-WebRequest @p
    return @{ Status = $r.StatusCode; Body = ($r.Content | ConvertFrom-Json) }
  } catch {
    $resp = $_.Exception.Response
    $status = [int]$resp.StatusCode
    $text = $_.ErrorDetails.Message
    if (-not $text) {
      try {
        $stream = $resp.GetResponseStream()
        $stream.Position = 0
        $reader = New-Object IO.StreamReader($stream)
        $text = $reader.ReadToEnd()
      } catch { $text = '' }
    }
    return @{ Status = $status; Body = ($text | ConvertFrom-Json) }
  }
}

# T1 health
$r = J GET '/health'; Check 'T1-health' ($r.Status -eq 200 -and $r.Body.status -eq 'ok') "status=$($r.Status)"

# T2 create valid
$r = J POST '/api/swaps' '{"from_token":"eth","to_token":"btc","amount_from":1.5,"amount_to":0.05,"rate":0.033}'
$id1 = $r.Body.id
Check 'T2-create' ($r.Status -eq 201 -and $r.Body.from_token -eq 'ETH' -and $r.Body.id -ge 1) "status=$($r.Status) id=$id1 from=$($r.Body.from_token)"

# T3 get by id
$r = J GET "/api/swaps/$id1"; Check 'T3-get' ($r.Status -eq 200 -and $r.Body.id -eq $id1) "status=$($r.Status)"

# T4 list filter matching
$r = J GET '/api/swaps?from=ETH&to=BTC'
Check 'T4-filter-match' ($r.Status -eq 200 -and $r.Body.meta.total -ge 1 -and $r.Body.data[0].from_token -eq 'ETH') "status=$($r.Status) total=$($r.Body.meta.total)"

# T5 list filter non-matching (empty result set)
$r = J GET '/api/swaps?from=NOPE&to=NOPE'
Check 'T5-filter-empty' ($r.Status -eq 200 -and $r.Body.meta.total -eq 0 -and $r.Body.data.Count -eq 0) "status=$($r.Status) total=$($r.Body.meta.total)"

# T6 second record + pagination semantics
$null = J POST '/api/swaps' '{"from_token":"OSMO","to_token":"ETH","amount_from":10}'
$r = J GET '/api/swaps?limit=1&offset=0'
$firstId = $r.Body.data[0].id
$r2 = J GET '/api/swaps?limit=1&offset=1'
Check 'T6-pagination' ($r.Body.data.Count -eq 1 -and $r2.Body.data[0].id -ne $firstId -and $r.Body.meta.total -eq $r2.Body.meta.total) "page1=$firstId page2=$($r2.Body.data[0].id) total=$($r.Body.meta.total)"

# T7 update (PATCH)
$r = J PATCH "/api/swaps/$id1" '{"amount_from":2.5,"rate":0.04}'
Check 'T7-patch' ($r.Status -eq 200 -and $r.Body.amount_from -eq 2.5 -and $r.Body.rate -eq 0.04 -and $r.Body.to_token -eq 'BTC') "status=$($r.Status) amount_from=$($r.Body.amount_from) to=$($r.Body.to_token)"

# T8 stored value after update (fresh GET)
$r = J GET "/api/swaps/$id1"; Check 'T8-patch-persisted' ($r.Body.amount_from -eq 2.5) "amount_from=$($r.Body.amount_from)"

# T9 delete
$r = J DELETE "/api/swaps/$id1"; Check 'T9-delete' ($r.Status -eq 204) "status=$($r.Status)"

# T10 gone after delete
$r = J GET "/api/swaps/$id1"; Check 'T10-get-after-delete' ($r.Status -eq 404) "status=$($r.Status)"

# T11 delete again -> 404
$r = J DELETE "/api/swaps/$id1"; Check 'T11-delete-again' ($r.Status -eq 404) "status=$($r.Status)"

# T12 missing required fields
$r = J POST '/api/swaps' '{}'
Check 'T12-missing-fields' ($r.Status -eq 400 -and $r.Body.error.code -eq 'VALIDATION_ERROR' -and $r.Body.error.details.Count -gt 0) "status=$($r.Status) code=$($r.Body.error.code)"

# T13 malformed JSON
$r = J POST '/api/swaps' '{not json'
Check 'T13-bad-json' ($r.Status -eq 400 -and $r.Body.error.code -eq 'BAD_JSON') "status=$($r.Status) code=$($r.Body.error.code)"

# T14 invalid id
$r = J GET '/api/swaps/abc'; Check 'T14-invalid-id' ($r.Status -eq 400) "status=$($r.Status)"
$r = J GET '/api/swaps/0'; Check 'T14b-zero-id' ($r.Status -eq 400) "status=$($r.Status)"

# T15 nonexistent resource patch/delete
$r = J PATCH '/api/swaps/999999' '{"amount_from":1}'; Check 'T15-patch-404' ($r.Status -eq 404) "status=$($r.Status)"
$r = J DELETE '/api/swaps/999999'; Check 'T15b-delete-404' ($r.Status -eq 404) "status=$($r.Status)"

# T16 invalid filter values
$r = J GET '/api/swaps?limit=1000'; Check 'T16-limit-400' ($r.Status -eq 400) "status=$($r.Status)"
$r = J GET '/api/swaps?created_after=nope'; Check 'T16b-date-400' ($r.Status -eq 400) "status=$($r.Status)"

# T17 same-token swap rejected
$r = J POST '/api/swaps' '{"from_token":"ETH","to_token":"ETH","amount_from":1}'
Check 'T17-same-token' ($r.Status -eq 400) "status=$($r.Status)"

# T18 negative amount rejected
$r = J POST '/api/swaps' '{"from_token":"ETH","to_token":"BTC","amount_from":-5}'
Check 'T18-negative' ($r.Status -eq 400) "status=$($r.Status)"

# T19 unknown API route
$r = J GET '/api/nope'; Check 'T19-unknown-route' ($r.Status -eq 404 -and $r.Body.error.code -eq 'NOT_FOUND') "status=$($r.Status)"

# T20 keep a row for restart persistence check
$r = J POST '/api/swaps' '{"from_token":"KEEP","to_token":"ALIVE","amount_from":7}'
$keepId = $r.Body.id
"KEEP_ID=$keepId"

$results | Format-Table -AutoSize | Out-String -Width 120
$fails = @($results | Where-Object { $_.Result -eq 'FAIL' })
"SUMMARY: $($results.Count - $fails.Count)/$($results.Count) passed, $($fails.Count) failed"
if ($fails.Count -gt 0) { exit 1 }
