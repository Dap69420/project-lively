$json = Get-Content vercel.json | ConvertFrom-Json
$adminRoute = @{
    'source' = '/admin'
    'destination' = '/admin.html'
}
$json.rewrites += $adminRoute
$json | ConvertTo-Json -Depth 10 | Set-Content vercel.json
Write-Host "✅ vercel.json updated with admin route"
Get-Content vercel.json
