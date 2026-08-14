Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\lenovo\.gemini\antigravity-ide\brain\553ac780-c421-43ee-b4ed-37095ec68c47\tm_app_logo_1786691969078.png"
$targetPng = "d:\techmartWSApp\RetailPOSERP\build\icon.png"
$targetIco = "d:\techmartWSApp\RetailPOSERP\build\icon.ico"
$electronPng = "d:\techmartWSApp\RetailPOSERP\electron\icon.png"
$electronIco = "d:\techmartWSApp\RetailPOSERP\electron\icon.ico"
$frontendFavicon = "d:\techmartWSApp\RetailPOSERP\frontend\public\favicon.ico"
$frontendLogo = "d:\techmartWSApp\RetailPOSERP\frontend\public\logo.png"
$frontendAssetLogo = "d:\techmartWSApp\RetailPOSERP\frontend\src\assets\tm_logo.png"

$img = [System.Drawing.Image]::FromFile($srcPath)
$bmp = New-Object System.Drawing.Bitmap($img, 256, 256)

# Save standard PNG files
$bmp.Save($targetPng, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($electronPng, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($frontendLogo, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($frontendAssetLogo, [System.Drawing.Imaging.ImageFormat]::Png)

# Save native Windows ICO files
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$streamTarget = New-Object System.IO.FileStream($targetIco, [System.IO.FileMode]::Create)
$icon.Save($streamTarget)
$streamTarget.Close()

$streamElectron = New-Object System.IO.FileStream($electronIco, [System.IO.FileMode]::Create)
$icon.Save($streamElectron)
$streamElectron.Close()

$streamFavicon = New-Object System.IO.FileStream($frontendFavicon, [System.IO.FileMode]::Create)
$icon.Save($streamFavicon)
$streamFavicon.Close()

$icon.Dispose()
$bmp.Dispose()
$img.Dispose()

Write-Host "Successfully generated native Windows DIB ICO icons and clean PNGs across all target directories!"
